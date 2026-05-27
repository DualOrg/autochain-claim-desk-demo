import {
  dualClient,
  dualConfig,
  executeEventBusWithFallback,
  extractResultObject,
  mintPayloadAttempts,
  mintPayload,
  normalizeClaimProperties,
  readBody,
  requireOperator,
  requireMethod,
  requirePositiveBalance,
  requireWritable,
  seedClaimProperties,
  semanticMetadata,
  sendJson,
} from "../_dual.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "POST")) return;
  try {
    requireOperator(req);
    requireWritable({ requireObject: false });
    const body = await readBody(req);
    const config = dualConfig();
    const balance = await requirePositiveBalance(config);
    const claim = normalizeClaimProperties(body.claim || body.properties || seedClaimProperties());
    const metadata = semanticMetadata("autochain_claim_minted", claim, body.audit || {});
    const { result, payloadStyle } = await executeEventBusWithFallback(
      await dualClient(config),
      mintPayloadAttempts(config.templateId, claim, metadata)
    );
    const object = extractResultObject(result);

    sendJson(res, 200, {
      ok: true,
      minted: true,
      synced: true,
      action: "mint",
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
      preview: mintPayload(normalizeClaimProperties(req.body?.claim || req.body?.properties || {})),
      publicWrites: false
    });
  }
}
