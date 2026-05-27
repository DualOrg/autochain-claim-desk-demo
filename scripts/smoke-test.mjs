const baseUrl = process.env.DEMO_BASE_URL || "http://127.0.0.1:4177";

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`ok - ${message}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.operatorToken ? { "x-demo-operator-token": options.operatorToken } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body };
}

const home = await fetch(baseUrl);
assert(home.ok, "home page loads");
assert((await home.text()).includes("AutoChain Claim Desk"), "home page includes demo title");

const status = await request("/api/dual/status");
assert(status.response.ok, "status endpoint returns 200");
assert(status.body.publicWrites === false, "status endpoint reports no public writes");
assert(status.body.orgId === "69b935b4187e903f826bbe71", "status endpoint defaults to IanTest org");
assert(!("apiKey" in status.body), "status endpoint does not expose API key");

const current = await request("/api/claims/current");
assert(current.response.ok, "current claim endpoint returns 200");
assert(current.body.properties?.claim_id === "AC-OEM-2026-0007", "current claim endpoint returns canonical claim");
const expectedNextGate = {
  Claimed: "part_verified",
  Part_Verified: "coverage_checked",
  Coverage_Checked: "approved",
  Approved: "paid"
}[current.body.properties?.state];
assert(current.body.nextGate?.id === expectedNextGate || (!expectedNextGate && !current.body.nextGate), "current claim reports the next gate for its state");

const baselineClaim = {
  ...current.body.properties,
  state: "Claimed",
  verified_gates: 0,
  blocked_actions: 0,
  duplicate_claim: false,
  serial_status: "matched",
  last_decision_result: "Ready",
  last_decision_reason: "Awaiting serial verification.",
  last_gate_id: ""
};

const serialEvaluation = await request("/api/claims/evaluate", {
  method: "POST",
  body: {
    claim: baselineClaim,
    gate: { id: "part_verified" }
  }
});
assert(serialEvaluation.response.ok, "evaluate endpoint returns 200");
assert(serialEvaluation.body.evaluation?.result === "Approved", "evaluate endpoint approves valid OEM serial");
assert(serialEvaluation.body.evaluation?.proof?.serial_hash, "evaluate endpoint returns serial hash");
assert(serialEvaluation.body.evaluation?.publicWrites === false, "evaluate endpoint never exposes public writes");

const coverageEvaluation = await request("/api/claims/evaluate", {
  method: "POST",
  body: {
    claim: {
      ...baselineClaim,
      state: "Part_Verified",
      duplicate_claim: true
    },
    gate: { id: "coverage_checked" }
  }
});
assert(coverageEvaluation.response.ok, "blocked evaluation still returns 200");
assert(coverageEvaluation.body.evaluation?.result === "Blocked", "evaluate endpoint blocks duplicate claim");
assert(coverageEvaluation.body.evaluation?.reason.includes("already been reimbursed"), "blocked reason explains duplicate claim");

const approvalEvaluation = await request("/api/claims/evaluate", {
  method: "POST",
  body: {
    claim: {
      ...baselineClaim,
      state: "Coverage_Checked",
      verified_gates: 2
    },
    gate: { id: "approved" }
  }
});
assert(approvalEvaluation.body.evaluation?.result === "Approved", "approval gate passes after coverage check");
assert(approvalEvaluation.body.evaluation?.reimbursement_usd === 1189, "approval gate returns reimbursement amount");

const rejectedSync = await request("/api/claims/sync", {
  method: "POST",
  operatorToken: "wrong",
  body: { claim: current.body.properties }
});
assert(rejectedSync.response.status === 403, "sync endpoint rejects wrong operator token");

const rejectedMint = await request("/api/claims/mint", {
  method: "POST",
  operatorToken: "wrong",
  body: { claim: current.body.properties }
});
assert(rejectedMint.response.status === 403, "mint endpoint rejects wrong operator token");
