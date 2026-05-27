import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  claimTemplateProperties,
  defaultOrgId,
  mintPayloadAttempts,
  normalizeClaimProperties,
  seedClaimProperties,
  semanticMetadata,
  templateName
} from "../api/_dual.js";

const envPath = process.env.DUAL_ENV_FILE || "/Users/ibuswell/Documents/DualVault/sandbox/ager-dual-pilot/.env";
const outputPath = process.env.DUAL_SETUP_OUTPUT || "/private/tmp/autochain-live-setup.json";
const env = { ...parseEnvFile(envPath), ...process.env };
const apiUrl = (env.DUAL_API_URL || "https://api-testnet.dual.network").replace(/\/+$/, "");
const orgId = env.DUAL_ORG_ID || defaultOrgId;
const apiKey = env.DUAL_API_KEY || "";

if (!apiKey) {
  throw new Error(`DUAL_API_KEY was not found in ${resolve(envPath)} or process env.`);
}

const template = await ensureTemplate();
const templateId = extractId(template);
if (!templateId) throw new Error("Template setup succeeded but no template id was returned.");

const balanceStatus = await getBalanceStatus();
if (!balanceStatus.ready) {
  throw new Error(balanceStatus.detail);
}
console.log(`DUAL org balance confirmed positive: ${balanceStatus.value}`);

const object = await ensureSeedObject(templateId);
const objectId = extractId(object);
if (!objectId) throw new Error("Mint action succeeded but no object id was returned.");

const readback = await request("GET", `/objects/${encodeURIComponent(objectId)}`);
const custom = readback?.custom || readback?.properties || readback?.data?.custom || readback?.state?.custom || {};
if (custom.claim_id !== "AC-OEM-2026-0007") {
  throw new Error("AutoChain object readback did not contain the expected claim id.");
}

writeFileSync(outputPath, `${JSON.stringify({
  created_at: new Date().toISOString(),
  api_url: apiUrl,
  org_id: orgId,
  template_name: templateName,
  template_id: templateId,
  object_id: objectId,
  balance: balanceStatus.value,
  readback_verified: true
}, null, 2)}\n`, { mode: 0o600 });

console.log(`DUAL template ready: ${templateId}`);
console.log(`DUAL object ready: ${objectId}`);
console.log(`Setup metadata written: ${outputPath}`);

async function ensureTemplate() {
  const existing = await findTemplate();
  if (existing) {
    console.log(`Found existing DUAL template: ${extractId(existing)}`);
    return existing;
  }

  const payload = templatePayload();
  try {
    const created = await request("POST", "/templates", payload);
    console.log(`Created DUAL template: ${extractId(created)}`);
    return created;
  } catch (error) {
    if (error.status !== 400) throw error;
    const { organization_id: _organizationId, ...withoutOrg } = payload;
    const created = await request("POST", "/templates", withoutOrg);
    console.log(`Created DUAL template: ${extractId(created)}`);
    return created;
  }
}

async function findTemplate() {
  const body = await request("GET", `/templates?org_id=${encodeURIComponent(orgId)}&limit=10`);
  const items = asArray(body);
  return items.find((item) => item?.name === templateName) || null;
}

async function ensureSeedObject(templateId) {
  const existing = await findSeedObject(templateId);
  if (existing) {
    console.log(`Found existing DUAL object: ${extractId(existing)}`);
    return existing;
  }

  const minted = await mintSeedObject(templateId);
  const objectId = extractId(minted);
  if (objectId) return minted;

  const readback = await findSeedObject(templateId);
  if (readback) return readback;
  return minted;
}

async function findSeedObject(templateId) {
  const body = await request("GET", `/objects?template_id=${encodeURIComponent(templateId)}&org_id=${encodeURIComponent(orgId)}&limit=10`);
  const items = asArray(body);
  return items.find((item) => {
    const custom = item?.custom || item?.properties || item?.data?.custom || item?.state?.custom || {};
    return custom.claim_id === "AC-OEM-2026-0007";
  }) || null;
}

async function mintSeedObject(templateId) {
  const properties = normalizeClaimProperties(seedClaimProperties());
  const metadata = semanticMetadata("autochain_claim_minted", properties, {
    source: "setup-live-dual",
    reason: "canonical AutoChain claim object"
  });
  const attempts = mintPayloadAttempts(templateId, properties, metadata);
  const errors = [];
  for (const attempt of attempts) {
    try {
      const result = await request("POST", "/ebus/execute", attempt.payload);
      const id = extractId(result);
      if (id) return { id, result };
      return result;
    } catch (error) {
      errors.push({ style: attempt.style, status: error.status, message: error.message });
    }
  }
  const error = new Error(`DUAL mint failed: ${errors.map((item) => `${item.style} ${item.status || ""} ${item.message}`).join(" | ")}`);
  error.attempts = errors;
  throw error;
}

async function getBalanceStatus() {
  try {
    const balance = await request("GET", `/organizations/${encodeURIComponent(orgId)}/balance`);
    const numericBalance = extractBalance(balance);
    return {
      ready: Number.isFinite(numericBalance) && numericBalance > 0,
      value: numericBalance,
      detail:
        Number.isFinite(numericBalance) && numericBalance > 0
          ? "positive org balance confirmed"
          : `DUAL org balance must be positive before AutoChain mint/update actions. Current balance: ${numericBalance}`
    };
  } catch (error) {
    return {
      ready: false,
      value: null,
      detail: `balance read failed: ${error.message}`
    };
  }
}

function templatePayload() {
  const properties = normalizeClaimProperties(seedClaimProperties());
  return {
    organization_id: orgId,
    name: templateName,
    description: "OEM warranty claim validation object for the AutoChain Claim Desk demo.",
    metadata: {
      source: "autochain-claim-desk-demo",
      schema_version: "autochain.claim.v1",
      proof_scope: "warranty_claim",
      public_writes: false
    },
    object: {
      metadata: {
        name: "AutoChain Claim Demo",
        description: "OEM warranty claim for a signed Bosch 48V inverter module.",
        category: "autochain-warranty-claim"
      },
      custom: claimTemplateProperties(properties)
    },
    actions: [
      { name: "mint", alias: "open_autochain_claim" },
      { name: "update", alias: "record_autochain_claim_gate" }
    ],
    public_access: {
      custom: Object.keys(claimTemplateProperties(properties))
    }
  };
}

async function request(method, path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `DUAL request failed with HTTP ${response.status}`);
    error.status = response.status;
    error.body = payload;
    throw error;
  }
  return payload;
}

function parseEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split(/\n/)
        .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
        .filter(Boolean)
        .map((match) => [match[1], unquote(match[2].trim())])
    );
  } catch {
    return {};
  }
}

function unquote(value) {
  if (value.startsWith("\"") && value.endsWith("\"")) return value.slice(1, -1).replace(/\\"/g, "\"");
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value?.items || value?.templates || value?.objects || value?.results || value?.data?.items || value?.data?.templates || value?.data?.objects || [];
}

function extractId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return extractId(value[0]);
  return value.id
    || value.object_id
    || value.objectId
    || value.template_id
    || value.templateId
    || value.data?.id
    || value.data?.object_id
    || value.data?.objectId
    || value.data?.objects?.[0]
    || value.objects?.[0]
    || value.result?.id
    || value.result?.object_id
    || value.result?.objectId
    || value.result?.objects?.[0]
    || "";
}

function extractBalance(value) {
  const candidates = [
    value?.balance?.amount,
    value?.balance?.value,
    value?.balance,
    value?.available?.amount,
    value?.available?.value,
    value?.available,
    value?.amount,
    value?.value,
    value?.data?.balance?.amount,
    value?.data?.balance?.value,
    value?.data?.balance,
    value?.data?.available?.amount,
    value?.data?.available?.value,
    value?.data?.available,
    value?.organization?.balance
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) return numeric;
  }
  return Number.NaN;
}
