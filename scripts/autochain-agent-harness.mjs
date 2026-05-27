const mcpUrl = process.env.MCP_URL
  || (process.env.DEMO_BASE_URL ? `${process.env.DEMO_BASE_URL.replace(/\/+$/, "")}/mcp` : "https://autochain-eight.vercel.app/mcp");
const writeAction = String(process.env.AUTOCHAIN_WRITE_ACTION || "none").toLowerCase();
const operatorToken = process.env.AUTOCHAIN_OPERATOR_TOKEN || process.env.DEMO_OPERATOR_TOKEN || "";

const initialized = await mcp("initialize", {});
if (initialized.serverInfo?.name !== "dual-autochain-claim-desk") {
  throw new Error(`Unexpected MCP server: ${initialized.serverInfo?.name || "unknown"}`);
}

const tools = await mcp("tools/list", {});
const toolNames = new Set((tools.tools || []).map((tool) => tool.name));
for (const requiredTool of [
  "autochain_dual_get_status",
  "autochain_dual_get_claim",
  "autochain_dual_evaluate_gate",
  "autochain_dual_prepare_sync_payload",
  "autochain_dual_sync_claim",
  "autochain_dual_advance_gate"
]) {
  if (!toolNames.has(requiredTool)) throw new Error(`${requiredTool} tool is not available.`);
}

const status = structured(await callTool("autochain_dual_get_status"));
const current = structured(await callTool("autochain_dual_get_claim"));
const claim = current.current?.properties || current.current?.claim || {};
const nextGate = current.current?.nextGate || null;
const evaluation = structured(await callTool("autochain_dual_evaluate_gate", {
  claim,
  gate: nextGate || undefined
}));
const preview = structured(await callTool("autochain_dual_prepare_sync_payload", {
  claim: evaluation.claim || claim,
  audit: { source: "autochain_agent_harness", mode: writeAction }
}));

let write = null;
if (writeAction !== "none") {
  if (!operatorToken) throw new Error("AUTOCHAIN_OPERATOR_TOKEN or DEMO_OPERATOR_TOKEN is required for write actions.");
  if (writeAction === "sync") {
    write = structured(await callTool("autochain_dual_sync_claim", {
      operator_token: operatorToken,
      claim: {
        ...(evaluation.claim || claim),
        last_decision_reason: "MCP agent harness sync verified; claim state unchanged.",
        updated_at: new Date().toISOString()
      },
      audit: { source: "autochain_agent_harness", action: "sync" }
    }));
  } else if (writeAction === "advance") {
    write = structured(await callTool("autochain_dual_advance_gate", {
      operator_token: operatorToken,
      gate: nextGate || undefined,
      audit: { source: "autochain_agent_harness", action: "advance_gate" }
    }));
  } else {
    throw new Error(`Unsupported AUTOCHAIN_WRITE_ACTION: ${writeAction}`);
  }
}

const after = structured(await callTool("autochain_dual_get_claim"));
const afterClaim = after.current?.properties || {};

console.log(JSON.stringify({
  ok: true,
  mcp_url: mcpUrl,
  server: initialized.serverInfo,
  mode: writeAction === "none" ? "read_only" : `operator_${writeAction}`,
  safety: status.safety,
  object_id: after.current?.object?.id || status.status?.objectId || null,
  template_id: status.status?.templateId || null,
  before: summarizeClaim(claim, current.current?.nextGate),
  evaluation: {
    result: evaluation.evaluation?.result || null,
    allowed: evaluation.evaluation?.allowed === true,
    reason: evaluation.evaluation?.reason || null,
    gate_id: evaluation.evaluation?.gate?.id || null,
    next_state: evaluation.evaluation?.next_state || null,
    decision_hash: evaluation.evaluation?.proof?.decision_hash || null,
    public_writes: evaluation.evaluation?.publicWrites === true
  },
  preview: {
    execute: preview.execute === true,
    action: preview.action,
    payload_styles: (preview.payloadAttempts || []).map((attempt) => attempt.style),
    public_writes: preview.publicWrites === true
  },
  write: write ? {
    ok: write.ok === true,
    action: write.action,
    payload_style: write.payloadStyle || null,
    balance_ready: write.balance?.ready === true,
    object_id: write.object?.id || null,
    public_writes: write.publicWrites === true,
    error: write.error || null
  } : null,
  after: summarizeClaim(afterClaim, after.current?.nextGate)
}, null, 2));

async function callTool(name, args = {}) {
  return mcp("tools/call", { name, arguments: args });
}

async function mcp(method, params = {}) {
  const response = await fetch(mcpUrl, {
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
    throw new Error(payload.error?.message || `MCP ${method} failed with HTTP ${response.status}`);
  }
  return payload.result;
}

function structured(toolResult) {
  if (toolResult?.structuredContent) return toolResult.structuredContent;
  const text = toolResult?.content?.find((item) => item.type === "text")?.text;
  return text ? JSON.parse(text) : toolResult;
}

function summarizeClaim(claim = {}, nextGate = null) {
  return {
    claim_id: claim.claim_id || null,
    state: claim.state || null,
    next_gate: nextGate?.id || null,
    last_gate_id: claim.last_gate_id || null,
    decision_result: claim.last_decision_result || null,
    decision_reason: claim.last_decision_reason || null,
    decision_hash: claim.decision_hash || null,
    state_hash: claim.state_hash || null,
    updated_at: claim.updated_at || null,
    public_writes: false
  };
}
