import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const autochainMcpUrl = process.env.AUTOCHAIN_MCP_URL || "https://autochain-eight.vercel.app/mcp";
const krakenMcpUrl = process.env.KRAKEN_MCP_URL || "https://kraken-dual-agent-demo.vercel.app/mcp";
const outputDir = process.env.PROOF_OUTPUT_DIR || "outputs";
const trade = {
  pair: String(process.env.FULL_CHAIN_PAIR || "DUALUSD").toUpperCase(),
  side: String(process.env.FULL_CHAIN_SIDE || "buy").toLowerCase(),
  notional_usd: Number(process.env.FULL_CHAIN_NOTIONAL_USD || 10)
};

const generatedAt = new Date().toISOString();
const assertions = [];

await assertMcpServer(autochainMcpUrl, "dual-autochain-claim-desk");
await assertMcpServer(krakenMcpUrl, "kraken-dual-agent-demo");

const autochainStatus = await autochainTool("autochain_dual_get_status");
const autochainCurrent = await autochainTool("autochain_dual_get_claim");
const claim = autochainCurrent.current?.properties || {};
const nextGate = autochainCurrent.current?.nextGate || null;

assertEqual("AutoChain claim state is Approved", claim.state, "Approved");
assertEqual("AutoChain next gate is paid", nextGate?.id, "paid");
assertFalse("AutoChain public writes remain disabled", autochainStatus.safety?.publicWrites);

const autochainEvaluation = await autochainTool("autochain_dual_evaluate_gate", {
  claim,
  gate: nextGate
});
const expectedAutochainDecisionHash = autochainEvaluation.evaluation?.proof?.decision_hash || null;
assertTruthy("AutoChain evaluation returns a decision hash", expectedAutochainDecisionHash);
assertFalse("AutoChain evaluation remains read-only", autochainEvaluation.evaluation?.publicWrites);

const krakenTrade = await krakenTool("kraken_dual_propose_and_execute_paper_trade", trade);
assertEqual("Kraken MCP paper trade executed", krakenTrade.status, "executed");
assertEqual("Kraken trade pair matches requested pair", krakenTrade.proposal?.trade?.pair, trade.pair);
assertEqual("Kraken AutoChain source is MCP", krakenTrade.proposal?.policy?.autoChain?.source, "autochain_mcp");
assertFalse("Kraken AutoChain observation is read-only", krakenTrade.proposal?.policy?.autoChain?.publicWrites);
assertEqual(
  "Kraken proposal carries AutoChain decision hash",
  krakenTrade.proposal?.policy?.autoChain?.proof?.decisionHash,
  expectedAutochainDecisionHash
);
assertEqual(
  "Kraken trade receipt carries AutoChain decision hash",
  krakenTrade.tradeReceipt?.autoChain?.decisionHash,
  expectedAutochainDecisionHash
);

const krakenProof = await krakenTool("kraken_dual_get_proof");
const krakenVerification = await krakenTool("kraken_dual_verify_proof");
const proofAutochainHash = krakenProof.proof?.autoChain?.latestDecision?.decisionHash || null;
assertEqual("Kraken proof bundle includes AutoChain decision hash", proofAutochainHash, expectedAutochainDecisionHash);
assertTruthy("Kraken proof verifier returns proof hash", krakenVerification.verification?.proofHash);

const summary = {
  ok: assertions.every((item) => item.ok),
  generated_at: generatedAt,
  urls: {
    autochain_app: "https://autochain-eight.vercel.app",
    autochain_mcp: autochainMcpUrl,
    kraken_app: "https://kraken-dual-agent-demo.vercel.app",
    kraken_mcp: krakenMcpUrl
  },
  autochain: {
    object_id: autochainCurrent.current?.object?.id || autochainStatus.status?.objectId || null,
    template_id: autochainStatus.status?.templateId || null,
    claim_id: claim.claim_id || null,
    state: claim.state || null,
    next_gate: nextGate?.id || null,
    last_gate_id: claim.last_gate_id || null,
    decision_hash: claim.decision_hash || null,
    evaluation_decision_hash: expectedAutochainDecisionHash,
    state_hash: claim.state_hash || null,
    integrity_hash: claim.integrity_hash || null,
    public_writes: false
  },
  kraken: {
    status: krakenTrade.status,
    proposal_id: krakenTrade.proposal?.id || null,
    trade_receipt_id: krakenTrade.tradeReceipt?.id || null,
    pair: krakenTrade.proposal?.trade?.pair || trade.pair,
    side: krakenTrade.proposal?.trade?.side || trade.side,
    notional_usd: krakenTrade.proposal?.policy?.notional || trade.notional_usd,
    autochain_decision_hash: krakenTrade.proposal?.policy?.autoChain?.proof?.decisionHash || null,
    receipt_autochain_decision_hash: krakenTrade.tradeReceipt?.autoChain?.decisionHash || null,
    receipt_dual_synced: krakenTrade.tradeReceipt?.dualSync?.synced === true,
    receipt_dual_sync_reason: krakenTrade.tradeReceipt?.dualSync?.reason || krakenTrade.tradeReceipt?.dualSync?.error || null,
    proof_hash: krakenProof.proof?.proofHash || krakenVerification.verification?.proofHash || null,
    proof_ok: krakenVerification.verification?.ok === true,
    proof_complete: krakenVerification.verification?.complete === true,
    proof_autochain_decision_hash: proofAutochainHash,
    public_writes_to_autochain: false
  },
  assertions
};

if (!summary.ok) {
  throw new Error("Full-chain proof assertions failed.");
}

await mkdir(outputDir, { recursive: true });
const slug = generatedAt.replace(/[:.]/g, "-");
const jsonPath = join(outputDir, `autochain-full-chain-proof-${slug}.json`);
const mdPath = join(outputDir, `autochain-full-chain-proof-${slug}.md`);
await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(mdPath, markdownSummary(summary));

console.log(JSON.stringify({
  ok: true,
  json: jsonPath,
  markdown: mdPath,
  autochain_state: summary.autochain.state,
  autochain_next_gate: summary.autochain.next_gate,
  autochain_decision_hash: summary.autochain.evaluation_decision_hash,
  kraken_status: summary.kraken.status,
  kraken_receipt: summary.kraken.trade_receipt_id,
  kraken_proof_hash: summary.kraken.proof_hash,
  publicWrites: false
}, null, 2));

async function assertMcpServer(url, expectedName) {
  const initialized = await mcp(url, "initialize", {});
  assertEqual(`${expectedName} MCP initializes`, initialized.serverInfo?.name, expectedName);
  return initialized;
}

async function autochainTool(name, args = {}) {
  return structured(await mcp(autochainMcpUrl, "tools/call", { name, arguments: args }));
}

async function krakenTool(name, args = {}) {
  return structured(await mcp(krakenMcpUrl, "tools/call", { name, arguments: args }));
}

async function mcp(url, method, params = {}) {
  const response = await fetch(url, {
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
  return `# AutoChain Full-Chain Proof

Generated: ${summary.generated_at}

## Result

- Status: ${summary.ok ? "passed" : "failed"}
- AutoChain state: ${summary.autochain.state}
- AutoChain next gate: ${summary.autochain.next_gate}
- Kraken status: ${summary.kraken.status}
- Public writes to AutoChain: ${summary.kraken.public_writes_to_autochain}

## AutoChain

- App: ${summary.urls.autochain_app}
- MCP: ${summary.urls.autochain_mcp}
- Object: ${summary.autochain.object_id}
- Template: ${summary.autochain.template_id}
- Claim: ${summary.autochain.claim_id}
- Decision hash: ${summary.autochain.evaluation_decision_hash}
- State hash: ${summary.autochain.state_hash}
- Integrity hash: ${summary.autochain.integrity_hash}

## Kraken

- App: ${summary.urls.kraken_app}
- MCP: ${summary.urls.kraken_mcp}
- Proposal: ${summary.kraken.proposal_id}
- Trade receipt: ${summary.kraken.trade_receipt_id}
- Pair: ${summary.kraken.pair}
- Notional USD: ${summary.kraken.notional_usd}
- AutoChain decision hash in proposal: ${summary.kraken.autochain_decision_hash}
- AutoChain decision hash in receipt: ${summary.kraken.receipt_autochain_decision_hash}
- AutoChain decision hash in proof: ${summary.kraken.proof_autochain_decision_hash}
- Proof hash: ${summary.kraken.proof_hash}
- Proof verifier ok: ${summary.kraken.proof_ok}
- Proof complete: ${summary.kraken.proof_complete}
- Receipt DUAL synced: ${summary.kraken.receipt_dual_synced}

## Assertions

${summary.assertions.map((item) => `- ${item.ok ? "PASS" : "FAIL"}: ${item.label}`).join("\n")}
`;
}
