import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const autochainMcpUrl = process.env.AUTOCHAIN_MCP_URL || "https://autochain-eight.vercel.app/mcp";
const outputDir = process.env.PROOF_OUTPUT_DIR || "outputs";
const expectedState = process.env.AUTOCHAIN_EXPECTED_STATE || "Approved";
const expectedNextGate = process.env.AUTOCHAIN_EXPECTED_NEXT_GATE || "paid";
const generatedAt = new Date().toISOString();
const assertions = [];

const initialized = await mcp("initialize", {});
assertEqual("AutoChain MCP initializes", initialized.serverInfo?.name, "dual-autochain-claim-desk");
assertFalse("AutoChain MCP public writes are disabled", initialized.safety?.publicWrites);
assertEqual("AutoChain MCP write tools are operator-gated", initialized.safety?.writeTools, "operator_gated");
assertFalse("AutoChain MCP anonymous writes are disabled", initialized.safety?.anonymousWrites);

const listedTools = await mcp("tools/list", {});
const toolsByName = new Map((listedTools.tools || []).map((tool) => [tool.name, tool]));

for (const toolName of [
  "autochain_dual_get_status",
  "autochain_dual_get_claim",
  "autochain_dual_evaluate_gate",
  "autochain_dual_prepare_sync_payload",
  "autochain_dual_prepare_mint_payload"
]) {
  assertTruthy(`${toolName} read/preview tool is available`, toolsByName.get(toolName));
  assertEqual(`${toolName} exposes no public write`, toolsByName.get(toolName)?.["x-dual"]?.publicWrites, false);
}

for (const toolName of [
  "autochain_dual_sync_claim",
  "autochain_dual_advance_gate",
  "autochain_dual_mint_claim"
]) {
  const tool = toolsByName.get(toolName);
  assertTruthy(`${toolName} write tool is available`, tool);
  assertEqual(`${toolName} requires operator authentication`, tool?.["x-dual"]?.requiresAuthentication, true);
  assertEqual(`${toolName} uses operator token authentication`, tool?.["x-dual"]?.authentication, "operator_token");
  assertEqual(`${toolName} keeps public writes disabled`, tool?.["x-dual"]?.publicWrites, false);
}

const status = await autochainTool("autochain_dual_get_status");
assertTruthy("AutoChain DUAL readback is configured", status.status?.readbackReady);
assertFalse("AutoChain status reports public writes disabled", status.safety?.publicWrites);
assertFalse("AutoChain status reports anonymous writes disabled", status.safety?.anonymousWrites);

const current = await autochainTool("autochain_dual_get_claim");
const claim = current.current?.properties || {};
const nextGate = current.current?.nextGate || null;

assertEqual("AutoChain claim state matches standalone demo target", claim.state, expectedState);
assertEqual("AutoChain next gate matches standalone demo target", nextGate?.id || null, expectedNextGate);

const evaluation = await autochainTool("autochain_dual_evaluate_gate", {
  claim,
  gate: nextGate || undefined
});
const evaluatedClaim = evaluation.claim || claim;
const decisionHash = evaluation.evaluation?.proof?.decision_hash || null;
assertTruthy("AutoChain gate evaluation returns a decision hash", decisionHash);
assertFalse("AutoChain gate evaluation remains read-only", evaluation.publicWrites);
assertFalse("AutoChain gate evaluation reports no public writes", evaluation.evaluation?.publicWrites);

const syncPreview = await autochainTool("autochain_dual_prepare_sync_payload", {
  claim: evaluatedClaim,
  audit: { source: "autochain_standalone_proof" }
});
assertEqual("AutoChain sync preview does not execute", syncPreview.execute, false);
assertEqual("AutoChain sync preview action is update", syncPreview.action, "update");
assertFalse("AutoChain sync preview has no public writes", syncPreview.publicWrites);
assertTruthy("AutoChain sync preview includes payload attempts", syncPreview.payloadAttempts?.length);

const mintPreview = await autochainTool("autochain_dual_prepare_mint_payload", {
  claim: evaluatedClaim,
  audit: { source: "autochain_standalone_proof" }
});
assertEqual("AutoChain mint preview does not execute", mintPreview.execute, false);
assertEqual("AutoChain mint preview action is mint", mintPreview.action, "mint");
assertFalse("AutoChain mint preview has no public writes", mintPreview.publicWrites);
assertTruthy("AutoChain mint preview includes payload attempts", mintPreview.payloadAttempts?.length);

const summary = {
  ok: assertions.every((item) => item.ok),
  mode: "autochain_standalone",
  generated_at: generatedAt,
  urls: {
    autochain_app: "https://autochain-eight.vercel.app",
    autochain_mcp: autochainMcpUrl
  },
  autochain: {
    object_id: current.current?.object?.id || status.status?.objectId || null,
    template_id: status.status?.templateId || null,
    org_id: status.status?.orgId || null,
    claim_id: claim.claim_id || null,
    state: claim.state || null,
    next_gate: nextGate?.id || null,
    last_gate_id: claim.last_gate_id || null,
    decision_hash: claim.decision_hash || null,
    evaluation_decision_hash: decisionHash,
    state_hash: claim.state_hash || null,
    integrity_hash: claim.integrity_hash || null,
    readback_ready: status.status?.readbackReady === true,
    writable_operator_gated: status.status?.writable === true,
    operator_gate_configured: status.safety?.operatorGateConfigured === true,
    public_writes: false,
    anonymous_writes: false
  },
  mcp: {
    read_tools: [
      "autochain_dual_get_status",
      "autochain_dual_get_claim",
      "autochain_dual_evaluate_gate",
      "autochain_dual_prepare_sync_payload",
      "autochain_dual_prepare_mint_payload"
    ],
    write_tools: [
      "autochain_dual_sync_claim",
      "autochain_dual_advance_gate",
      "autochain_dual_mint_claim"
    ],
    write_boundary: "operator_gated",
    public_writes: false
  },
  previews: {
    sync: {
      action: syncPreview.action,
      execute: syncPreview.execute === true,
      object_id: syncPreview.objectId || null,
      payload_styles: (syncPreview.payloadAttempts || []).map((attempt) => attempt.style),
      public_writes: syncPreview.publicWrites === true
    },
    mint: {
      action: mintPreview.action,
      execute: mintPreview.execute === true,
      template_id: mintPreview.templateId || null,
      payload_styles: (mintPreview.payloadAttempts || []).map((attempt) => attempt.style),
      public_writes: mintPreview.publicWrites === true
    }
  },
  assertions
};

if (!summary.ok) {
  throw new Error("AutoChain standalone proof assertions failed.");
}

await mkdir(outputDir, { recursive: true });
const slug = generatedAt.replace(/[:.]/g, "-");
const jsonPath = join(outputDir, `autochain-standalone-proof-${slug}.json`);
const mdPath = join(outputDir, `autochain-standalone-proof-${slug}.md`);
await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(mdPath, markdownSummary(summary));

console.log(JSON.stringify({
  ok: true,
  mode: summary.mode,
  json: jsonPath,
  markdown: mdPath,
  autochain_state: summary.autochain.state,
  autochain_next_gate: summary.autochain.next_gate,
  autochain_decision_hash: summary.autochain.evaluation_decision_hash,
  readback_ready: summary.autochain.readback_ready,
  write_boundary: summary.mcp.write_boundary,
  publicWrites: false
}, null, 2));

async function autochainTool(name, args = {}) {
  return structured(await mcp("tools/call", { name, arguments: args }));
}

async function mcp(method, params = {}) {
  const response = await fetch(autochainMcpUrl, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${Date.now()}-${method}`,
      method,
      params
    })
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `${method} failed with HTTP ${response.status}`);
  }
  return payload.result;
}

function structured(toolResult) {
  if (toolResult?.structuredContent) return toolResult.structuredContent;
  const text = toolResult?.content?.find((item) => item.type === "text")?.text;
  return text ? JSON.parse(text) : toolResult;
}

function assertEqual(label, actual, expected) {
  const ok = actual === expected;
  assertions.push({ ok, label, expected, actual });
  if (!ok) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

function assertTruthy(label, value) {
  const ok = Boolean(value);
  assertions.push({ ok, label, actual: value || null });
  if (!ok) throw new Error(`${label}: missing value`);
}

function assertFalse(label, value) {
  const ok = value === false;
  assertions.push({ ok, label, expected: false, actual: value });
  if (!ok) throw new Error(`${label}: expected false, got ${value}`);
}

function markdownSummary(summary) {
  return `# AutoChain Standalone Proof

Generated: ${summary.generated_at}

## Result

- Status: ${summary.ok ? "passed" : "failed"}
- Mode: ${summary.mode}
- AutoChain state: ${summary.autochain.state}
- AutoChain next gate: ${summary.autochain.next_gate}
- Write boundary: ${summary.mcp.write_boundary}
- Public writes: ${summary.mcp.public_writes}

## AutoChain

- App: ${summary.urls.autochain_app}
- MCP: ${summary.urls.autochain_mcp}
- Object: ${summary.autochain.object_id}
- Template: ${summary.autochain.template_id}
- Organization: ${summary.autochain.org_id}
- Claim: ${summary.autochain.claim_id}
- Decision hash: ${summary.autochain.evaluation_decision_hash}
- State hash: ${summary.autochain.state_hash}
- Integrity hash: ${summary.autochain.integrity_hash}
- Readback ready: ${summary.autochain.readback_ready}
- Operator gate configured: ${summary.autochain.operator_gate_configured}

## MCP Boundary

- Read tools: ${summary.mcp.read_tools.join(", ")}
- Write tools: ${summary.mcp.write_tools.join(", ")}
- Write execution: ${summary.mcp.write_boundary}
- Anonymous writes: ${summary.autochain.anonymous_writes}

## Previewed Payloads

- Sync action: ${summary.previews.sync.action}
- Sync executed: ${summary.previews.sync.execute}
- Sync payload styles: ${summary.previews.sync.payload_styles.join(", ")}
- Mint action: ${summary.previews.mint.action}
- Mint executed: ${summary.previews.mint.execute}
- Mint payload styles: ${summary.previews.mint.payload_styles.join(", ")}

## Assertions

${summary.assertions.map((item) => `- ${item.ok ? "PASS" : "FAIL"}: ${item.label}`).join("\n")}
`;
}
