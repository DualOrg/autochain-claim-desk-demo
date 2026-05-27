import {
  dualClient,
  dualConfig,
  executeEventBusWithFallback,
  extractResultObject,
  normalizeClaimProperties,
  readBody,
  requireOperator,
  requireMethod,
  requirePositiveBalance,
  requireWritable,
  semanticMetadata,
  sendJson,
  updatePayloadAttempts
} from "../_dual.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  try {
    requireOperator(req);
    requireWritable();
    const body = await readBody(req);
    const config = dualConfig();
    const balance = await requirePositiveBalance(config);
    const claim = normalizeClaimProperties(body.claim || body.properties || body);
    const metadata = semanticMetadata("autochain_claim_synced", claim, body.audit || body.gate || {});
    const { result, payloadStyle } = await executeEventBusWithFallback(
      await dualClient(config),
      updatePayloadAttempts(config.objectId, claim, metadata)
    );
    const object = extractResultObject(result) || {
      id: config.objectId,
      templateId: config.templateId,
      organizationId: config.orgId,
      properties: claim
    };

    sendJson(res, 200, {
      ok: true,
      synced: true,
      action: "update",
      payloadStyle,
      balance,
      publicWrites: false,
      object,
      result
    });
  } catch (error) {
    sendJson(res, error.status || 500, {
      ok: false,
      error: error.message,
      readiness: error.readiness,
      balance: error.balance,
      publicWrites: false
    });
  }
}
