import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import statusHandler from "./api/dual/status.js";
import currentHandler from "./api/claims/current.js";
import evaluateHandler from "./api/claims/evaluate.js";
import syncHandler from "./api/claims/sync.js";
import mintHandler from "./api/claims/mint.js";
import mcpHandler from "./api/mcp.js";
import publicProofHandler from "./api/proof/public.js";
import { readCurrentObject, readiness } from "./api/_dual.js";

const root = fileURLToPath(new URL(".", import.meta.url));
await loadDotEnv();

const port = Number(process.env.PORT || 4177);
const host = process.env.HOST || "127.0.0.1";

const apiRoutes = new Map([
  ["/api/dual/status", statusHandler],
  ["/api/claims/current", currentHandler],
  ["/api/claims/evaluate", evaluateHandler],
  ["/api/claims/sync", syncHandler],
  ["/api/claims/mint", mintHandler],
  ["/api/proof/public", publicProofHandler],
  ["/api/mcp", mcpHandler],
  ["/mcp", mcpHandler]
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);
    const route = apiRoutes.get(url.pathname);
    if (route) {
      req.query = Object.fromEntries(url.searchParams.entries());
      req.body = await parseBody(req);
      await route(req, res);
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: error.message }, null, 2));
  }
});

server.listen(port, host, () => {
  console.log(`AutoChain Claim Desk running at http://${host}:${port}`);
});

async function parseBody(req) {
  if (!["POST", "PUT", "PATCH"].includes(req.method || "")) return {};
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);
  if (!filePath.startsWith(root)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }
  try {
    const file = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader("content-type", mimeTypes[extname(filePath)] || "application/octet-stream");
    res.setHeader("cache-control", "no-store");
    res.end(requested === "/index.html" ? await injectBootPayload(file.toString("utf8")) : file);
  } catch {
    const fallback = await readFile(join(root, "index.html"));
    res.statusCode = 200;
    res.setHeader("content-type", mimeTypes[".html"]);
    res.setHeader("cache-control", "no-store");
    res.end(await injectBootPayload(fallback.toString("utf8")));
  }
}

async function injectBootPayload(html) {
  const payload = await buildBootPayload();
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const boot = `<script id="autochain-boot" type="application/json">${json}</script>`;
  return html.replace("<script type=\"module\"", `${boot}\n    <script type=\"module"`);
}

async function buildBootPayload() {
  const status = readiness();
  if (!status.readbackReady) return { dualStatus: status };
  try {
    const current = await readCurrentObject();
    return {
      dualStatus: current.status || status,
      claim: current.properties || null
    };
  } catch (error) {
    return {
      dualStatus: {
        ...status,
        ok: false,
        readbackReady: false,
        writable: false,
        detail: error.message
      }
    };
  }
}

async function loadDotEnv() {
  try {
    const text = await readFile(join(root, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Local .env is optional.
  }
}
