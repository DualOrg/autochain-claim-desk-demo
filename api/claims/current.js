import {
  claimGates,
  claimStates,
  claimTemplateProperties,
  dualConfig,
  nextGateForState,
  readCurrentObject,
  readiness,
  requireMethod,
  seedClaimProperties,
  sendJson,
  warrantyPolicy
} from "../_dual.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, "GET")) return;
  const config = dualConfig();
  const status = readiness();
  if (status.readbackReady) {
    try {
      const current = await readCurrentObject();
      sendJson(res, 200, {
        ...current,
        ok: true,
        source: "dual_readback",
        orgId: config.orgId,
        templateName: config.templateName,
        templateId: config.templateId,
        objectId: config.objectId,
        publicWrites: false,
        claimStates,
        claimGates,
        nextGate: nextGateForState(current.properties.state),
        policy: warrantyPolicy()
      });
      return;
    } catch (error) {
      sendJson(res, error.status || 500, {
        ok: false,
        available: false,
        source: "dual_readback_error",
        error: error.message,
        status,
        publicWrites: false
      });
      return;
    }
  }

  const properties = seedClaimProperties();
  sendJson(res, 200, {
    ok: true,
    available: true,
    source: "local_seed",
    orgId: config.orgId,
    templateName: config.templateName,
    templateId: config.templateId,
    objectId: config.objectId || "local-autochain-claim-demo",
    publicWrites: false,
    claimStates,
    claimGates,
    nextGate: nextGateForState(properties.state),
    policy: warrantyPolicy(),
    properties: claimTemplateProperties(properties)
  });
}
