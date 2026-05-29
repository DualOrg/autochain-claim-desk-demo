import {
  publicVerifierEnvelope,
  readCurrentObject,
  seedClaimProperties,
  sendError,
  sendJson,
  readiness
} from "../_dual.js";

export default async function handler(request, response) {
  try {
    const status = readiness();
    let claim = seedClaimProperties();
    let source = "local_seed";
    if (status.readbackReady) {
      const current = await readCurrentObject();
      claim = current.properties || claim;
      source = "dual_readback";
    }
    const envelope = publicVerifierEnvelope(claim, status);
    const requestedClaimId = request.query?.claim_id || request.query?.claimId || "";
    const requestedHash = request.query?.content_hash || request.query?.hash || "";
    const claimMatches = !requestedClaimId || requestedClaimId === envelope.claim.claim_id;
    const hashMatches = !requestedHash || envelope.verifier.content_hash.startsWith(String(requestedHash));
    const linkStatus = !requestedClaimId && !requestedHash
      ? "link_unpinned"
      : claimMatches && hashMatches
        ? "link_verified"
        : "link_mismatch";

    sendJson(response, linkStatus === "link_mismatch" ? 409 : 200, {
      ...envelope,
      ok: linkStatus !== "link_mismatch",
      source,
      verifier: {
        ...envelope.verifier,
        link_status: linkStatus
      }
    });
  } catch (error) {
    sendError(response, error);
  }
}
