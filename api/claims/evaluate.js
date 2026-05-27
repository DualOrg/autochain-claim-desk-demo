import {
  evaluateClaimGate,
  normalizeClaimProperties,
  readBody,
  readCurrentObject,
  readiness,
  requireMethod,
  sendJson
} from "../_dual.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  const body = await readBody(req);
  const status = readiness();
  let source = "request";
  let claim = normalizeClaimProperties(body.claim || body.properties || {});

  if (!body.claim && !body.properties && status.readbackReady) {
    try {
      const current = await readCurrentObject();
      if (current.available && current.properties) {
        source = "dual_readback";
        claim = normalizeClaimProperties(current.properties);
      }
    } catch (error) {
      source = "request_fallback";
    }
  }

  const evaluation = evaluateClaimGate(claim, body.gate || {});
  sendJson(res, 200, {
    ok: true,
    source,
    status,
    evaluation,
    claim: {
      ...claim,
      state: evaluation.allowed ? evaluation.next_state : claim.state,
      last_decision_result: evaluation.result,
      last_decision_reason: evaluation.reason,
      last_gate_id: evaluation.gate.id,
      updated_at: evaluation.evaluated_at
    },
    publicWrites: false
  });
}
