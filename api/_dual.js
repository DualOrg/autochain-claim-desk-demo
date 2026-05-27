import { createHash } from "node:crypto";

export const templateName = "io.dual.autochain_claim.demo.v1";
export const templateVersion = 1;
export const defaultOrgId = "69b935b4187e903f826bbe71";

export const claimStates = [
  "Claimed",
  "Part_Verified",
  "Coverage_Checked",
  "Approved",
  "Paid"
];

export const claimGates = [
  {
    id: "part_verified",
    state: "Part_Verified",
    label: "Part verified",
    action: "Verify serial hash",
    description: "Validate OEM signature, part serial, VIN binding, and recall status."
  },
  {
    id: "coverage_checked",
    state: "Coverage_Checked",
    label: "Coverage checked",
    action: "Check warranty terms",
    description: "Validate mileage, date, dealer authority, duplicate claim status, and coverage terms."
  },
  {
    id: "approved",
    state: "Approved",
    label: "Claim approved",
    action: "Approve reimbursement",
    description: "Approve the net reimbursement and lock the claim decision hash."
  },
  {
    id: "paid",
    state: "Paid",
    label: "Dealer paid",
    action: "Mark paid",
    description: "Record payment release against the approved claim."
  }
];

export function dualConfig() {
  const writeMode = process.env.DUAL_WRITE_MODE || "read_only";
  const persistenceMode = process.env.DUAL_PERSISTENCE_MODE || "local";
  return {
    apiUrl: process.env.DUAL_API_URL || "https://api-testnet.dual.network",
    orgId: process.env.DUAL_ORG_ID || defaultOrgId,
    templateName,
    templateId: process.env.DUAL_AUTOCHAIN_TEMPLATE_ID || "",
    objectId: process.env.DUAL_AUTOCHAIN_CLAIM_OBJECT_ID || "",
    apiKey: process.env.DUAL_API_KEY || "",
    operatorToken: process.env.DEMO_OPERATOR_TOKEN || "",
    persistenceMode,
    writeMode,
    writable: Boolean(process.env.DUAL_API_KEY) && writeMode === "event_bus",
    readbackReady: Boolean(process.env.DUAL_API_KEY && process.env.DUAL_AUTOCHAIN_TEMPLATE_ID && process.env.DUAL_AUTOCHAIN_CLAIM_OBJECT_ID),
    operatorGateConfigured: Boolean(process.env.DEMO_OPERATOR_TOKEN),
    publicWrites: false,
    l3ExplorerBaseUrl: normalizeExternalBaseUrl(process.env.DUAL_L3_EXPLORER_BASE_URL || "https://explorer-testnet.dual.network"),
    l2ExplorerBaseUrl: normalizeExternalBaseUrl(process.env.DUAL_L2_EXPLORER_BASE_URL || "https://explorer-test-v2.dual.network")
  };
}

export function readiness() {
  const config = dualConfig();
  const missing = [];
  if (!config.apiKey) missing.push("DUAL_API_KEY");
  if (!config.templateId) missing.push("DUAL_AUTOCHAIN_TEMPLATE_ID");
  if (!config.objectId) missing.push("DUAL_AUTOCHAIN_CLAIM_OBJECT_ID");
  if (!config.operatorToken) missing.push("DEMO_OPERATOR_TOKEN");

  const readbackReady = Boolean(config.apiKey && config.objectId);
  const writable = Boolean(readbackReady && config.templateId && config.operatorToken && config.writeMode === "event_bus");

  return {
    ok: readbackReady,
    app: "AutoChain Claim Desk",
    runtime: process.env.VERCEL ? "vercel" : "node",
    orgId: config.orgId,
    templateName: config.templateName,
    templateId: config.templateId,
    objectId: config.objectId,
    persistenceMode: config.persistenceMode,
    writeMode: config.writeMode,
    readbackReady,
    writable,
    operatorGateConfigured: Boolean(config.operatorToken),
    publicWrites: false,
    writeExecutionExposed: false,
    missing,
    detail: writable
      ? "DUAL readback and operator-gated event-bus writes are configured."
      : readbackReady
        ? "DUAL readback is configured. Operator-gated writes need event_bus mode and DEMO_OPERATOR_TOKEN."
        : "Running in local/read-only mode. Set DUAL_API_KEY and DUAL_AUTOCHAIN_CLAIM_OBJECT_ID to enable DUAL readback.",
    warnings: writable
      ? ["Live writes are operator-gated; the public app still exposes no anonymous write path."]
      : ["Evaluator returns deterministic proof hashes without anonymous DUAL writes."]
  };
}

export async function readCurrentObject() {
  const config = dualConfig();
  const client = await dualClient(config);
  const object = await client.objects.get(config.objectId);
  const properties = normalizeClaimProperties(extractCustom(object));
  return {
    available: true,
    object: summarizeObject(object),
    properties: claimTemplateProperties(properties),
    status: readiness()
  };
}

export async function dualClient(config = dualConfig()) {
  return {
    organizations: {
      balance: (orgId) => dualRequest(config, "GET", `/organizations/${encodeURIComponent(orgId)}/balance`)
    },
    objects: {
      get: (objectId) => dualRequest(config, "GET", `/objects/${encodeURIComponent(objectId)}`)
    },
    eventBus: {
      execute: (payload) => dualRequest(config, "POST", "/ebus/execute", payload)
    }
  };
}

export function extractCustom(object = {}) {
  return object?.properties
    || object?.custom
    || object?.data?.custom
    || object?.state?.custom
    || object?.object?.properties
    || object?.object?.custom
    || {};
}

export function summarizeObject(object = {}) {
  if (!object || typeof object !== "object") return null;
  return {
    id: stringValue(object.id || object.object_id || object.objectId),
    templateId: stringValue(object.template_id || object.templateId || object.template?.id),
    organizationId: stringValue(object.organization_id || object.organizationId || object.org_id),
    stateHash: stringValue(object.state_hash || object.stateHash),
    integrityHash: stringValue(object.integrity_hash || object.integrityHash),
    properties: claimTemplateProperties(extractCustom(object))
  };
}

export function extractResultObject(result = {}) {
  const candidates = [
    result?.object,
    result?.data?.object,
    result?.result?.object,
    result?.objects?.[0],
    result?.data?.objects?.[0],
    result?.result?.objects?.[0],
    result?.affected_objects?.[0],
    result?.affectedObjects?.[0]
  ];
  return candidates.map((candidate) => summarizeObject(candidate)).find(Boolean) || null;
}

export function seedClaimProperties() {
  const claim = {
    claim_id: "AC-OEM-2026-0007",
    vin: "WAUZZZGE7NB009184",
    vehicle: "2024 Audi Q5 45 TFSI",
    dealer_id: "DLR-NSW-042",
    dealer_name: "North Shore Autohaus",
    dealer_region: "NSW-AU",
    oem: "Bosch Mobility",
    part_name: "48V inverter module",
    part_category: "powertrain-electrical",
    part_serial: "BOSCHINV-48V-AU-009184",
    replacement_serial: "BOSCHINV-48V-AU-009184-R",
    claim_amount_usd: 1284,
    approved_amount_usd: 1189,
    deductible_usd: 95,
    odometer_km: 64220,
    warranty_km_limit: 100000,
    warranty_started_at: "2024-02-16",
    warranty_expires_at: "2028-02-16",
    claim_date: "2026-05-27",
    oem_signature_valid: true,
    serial_status: "matched",
    recall_open: false,
    duplicate_claim: false,
    dealer_authorized: true,
    coverage_active: true,
    state: "Claimed",
    verified_gates: 0,
    blocked_actions: 0,
    payment_reference: "",
    policy_version: templateVersion,
    last_decision_result: "Ready",
    last_decision_reason: "Awaiting serial verification.",
    last_gate_id: "",
    updated_at: "2026-05-27T00:00:00.000Z",
    evidence_refs: [
      {
        type: "dealer_repair_order",
        id: "RO-NSW-77831",
        issuer: "North Shore Autohaus",
        hash: "0x0d2f8f3acbb2fda0f433778f43da0d72c44eb15f3e71172854c7f6b6df7b661c"
      },
      {
        type: "oem_serial_signature",
        id: "BOSCH-SIG-009184",
        issuer: "Bosch Mobility",
        hash: "0x3adf5bc59b8829b31dfdbe079db1a50e9f1f2df058860ea28f2ce0e51092aef2"
      },
      {
        type: "diagnostic_scan",
        id: "OBD-20260527-1841",
        issuer: "Dealer diagnostic tool",
        hash: "0x442439ad35932f7d652535b2d495724d9654f987f3f6dd9f60795df377c4e2aa"
      },
      {
        type: "installation_photo",
        id: "IMG-8842",
        issuer: "Dealer mobile app",
        hash: "0x632cefe4cab2a78f8f1a1d9fc6ee295bb4b11e1026905ac6ce3bb78d0387055f"
      }
    ]
  };

  return withDerivedFields(claim, { result: "Ready", reason: "Awaiting serial verification.", gate_id: "" });
}

export function normalizeClaimProperties(input = {}) {
  const seed = seedClaimProperties();
  const claim = {
    ...seed,
    ...input,
    evidence_refs: Array.isArray(input.evidence_refs) ? input.evidence_refs : seed.evidence_refs
  };
  return withDerivedFields(claim, {
    result: claim.last_decision_result || "Ready",
    reason: claim.last_decision_reason || "Awaiting serial verification.",
    gate_id: claim.last_gate_id || ""
  });
}

export function warrantyPolicy() {
  return {
    version: templateVersion,
    name: "autochain-oem-warranty-policy",
    supported_oems: ["Bosch Mobility"],
    authorized_regions: ["NSW-AU", "VIC-AU", "QLD-AU"],
    supported_part_categories: ["powertrain-electrical"],
    max_claim_amount_usd: 2500,
    reimbursement_hold_usd: 95,
    warranty_km_limit: 100000,
    warranty_month_limit: 48,
    duplicate_claim_rule: "same VIN + part serial cannot be reimbursed twice",
    recall_rule: "open recall must route to human review before reimbursement",
    result_convention: "Approved and Approved with review are allowed; Blocked and Needs evidence are not allowed"
  };
}

export function nextGateForState(state) {
  if (state === "Claimed") return claimGates[0];
  if (state === "Part_Verified") return claimGates[1];
  if (state === "Coverage_Checked") return claimGates[2];
  if (state === "Approved") return claimGates[3];
  return null;
}

export function evaluateClaimGate(claimInput = {}, gateInput = {}) {
  const claim = normalizeClaimProperties(claimInput);
  const gate = normalizeGate(claim, gateInput);
  const checks = buildChecks(claim, gate);
  const failed = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  let result = "Approved";
  let reason = `${gate.label} passed.`;
  if (failed.length) {
    result = "Blocked";
    reason = failed[0].detail;
  } else if (warnings.length) {
    result = "Approved with review";
    reason = warnings[0].detail;
  } else if (gate.id === "paid" && claim.state !== "Approved") {
    result = "Needs evidence";
    reason = "Payment release requires an approved claim state first.";
  }

  const allowed = result === "Approved" || result === "Approved with review";
  const nextState = allowed ? gate.state : claim.state;
  const now = new Date().toISOString();
  const decision = {
    result,
    reason,
    gate_id: gate.id,
    gate_label: gate.label,
    allowed,
    evaluated_at: now
  };
  const proof = deriveProofHashes({ ...claim, state: nextState }, gate, decision);

  return {
    result,
    allowed,
    reason,
    gate,
    checks,
    next_state: nextState,
    reimbursement_usd: allowed && ["approved", "paid"].includes(gate.id) ? claim.approved_amount_usd : 0,
    evaluated_at: now,
    proof,
    publicWrites: false
  };
}

export function deriveProofHashes(claimInput = {}, gate = {}, decision = {}) {
  const claim = { ...normalizeClaimProperties(claimInput), ...claimInput };
  const policy = warrantyPolicy();
  const serialSubject = {
    oem: claim.oem,
    vin: claim.vin,
    part_category: claim.part_category,
    part_serial: claim.part_serial,
    replacement_serial: claim.replacement_serial
  };
  const evidenceSubject = claim.evidence_refs || [];
  const claimSubject = {
    claim_id: claim.claim_id,
    vin: claim.vin,
    dealer_id: claim.dealer_id,
    part_serial: claim.part_serial,
    claim_amount_usd: claim.claim_amount_usd,
    state: claim.state,
    verified_gates: claim.verified_gates,
    blocked_actions: claim.blocked_actions
  };
  const policy_hash = hashJson(policy);
  const serial_hash = hashJson(serialSubject);
  const evidence_hash = hashJson(evidenceSubject);
  const claim_hash = hashJson(claimSubject);
  const decision_content_hash = hashJson({ policy_hash, serial_hash, evidence_hash, gate, result: decision.result, reason: decision.reason });
  const decision_envelope_hash = hashJson({ decision_content_hash, evaluated_at: decision.evaluated_at || claim.updated_at });
  const event_hash = hashJson({ claim_id: claim.claim_id, from_state: claimInput.state, to_state: claim.state, gate_id: gate.id, decision_content_hash });
  const state_hash = hashJson({ claim_hash, policy_hash, serial_hash, evidence_hash, decision_content_hash, state: claim.state });
  const integrity_hash = hashJson({ templateName, state_hash, event_hash });

  return {
    policy_hash,
    serial_hash,
    evidence_hash,
    claim_hash,
    decision_hash: decision_content_hash,
    decision_content_hash,
    decision_envelope_hash,
    event_hash,
    state_hash,
    integrity_hash,
    verification_level: "local_deterministic",
    publicWrites: false
  };
}

export function withDerivedFields(claim, decision = {}) {
  const derived = deriveProofHashesUnsafe(claim, decision);
  return {
    ...claim,
    coverage_active: Boolean(claim.coverage_active),
    policy_hash: derived.policy_hash,
    serial_hash: derived.serial_hash,
    evidence_hash: derived.evidence_hash,
    claim_hash: derived.claim_hash,
    decision_hash: derived.decision_hash,
    state_hash: derived.state_hash,
    integrity_hash: derived.integrity_hash
  };
}

export function claimTemplateProperties(claimInput = {}) {
  const claim = normalizeClaimProperties(claimInput);
  return {
    claim_id: claim.claim_id,
    vin: claim.vin,
    dealer_id: claim.dealer_id,
    dealer_name: claim.dealer_name,
    dealer_region: claim.dealer_region,
    oem: claim.oem,
    vehicle: claim.vehicle,
    part_name: claim.part_name,
    part_category: claim.part_category,
    part_serial: claim.part_serial,
    replacement_serial: claim.replacement_serial,
    claim_amount_usd: claim.claim_amount_usd,
    approved_amount_usd: claim.approved_amount_usd,
    deductible_usd: claim.deductible_usd,
    odometer_km: claim.odometer_km,
    warranty_km_limit: claim.warranty_km_limit,
    warranty_started_at: claim.warranty_started_at,
    warranty_expires_at: claim.warranty_expires_at,
    claim_date: claim.claim_date,
    oem_signature_valid: claim.oem_signature_valid,
    serial_status: claim.serial_status,
    recall_open: claim.recall_open,
    duplicate_claim: claim.duplicate_claim,
    dealer_authorized: claim.dealer_authorized,
    coverage_active: claim.coverage_active,
    state: claim.state,
    verified_gates: claim.verified_gates,
    blocked_actions: claim.blocked_actions,
    payment_reference: claim.payment_reference,
    policy_version: claim.policy_version,
    evidence_refs: claim.evidence_refs,
    policy_hash: claim.policy_hash,
    serial_hash: claim.serial_hash,
    evidence_hash: claim.evidence_hash,
    claim_hash: claim.claim_hash,
    decision_hash: claim.decision_hash,
    state_hash: claim.state_hash,
    integrity_hash: claim.integrity_hash,
    last_decision_result: claim.last_decision_result,
    last_decision_reason: claim.last_decision_reason,
    last_gate_id: claim.last_gate_id,
    updated_at: claim.updated_at
  };
}

export function updatePayload(claimInput = {}) {
  const config = dualConfig();
  return updatePayloadByStyle("direct_custom", config.objectId || "local-autochain-claim-demo", normalizeClaimProperties(claimInput), semanticMetadata("autochain_claim_synced", normalizeClaimProperties(claimInput)));
}

export function updatePayloadAttempts(objectId, claimInput = {}, metadata = {}) {
  const claim = normalizeClaimProperties(claimInput);
  return [
    { style: "direct_custom", payload: updatePayloadByStyle("direct_custom", objectId, claim, metadata) },
    { style: "direct_data_custom", payload: updatePayloadByStyle("direct_data_custom", objectId, claim, metadata) }
  ];
}

function updatePayloadByStyle(style, objectId, claimInput, metadata = {}) {
  const custom = {
    ...claimTemplateProperties(claimInput),
    last_event_hash: metadata.event_hash || claimInput.last_event_hash || "",
    updated_at: new Date().toISOString()
  };
  if (style === "direct_data_custom") {
    return {
      action: {
        update: {
          id: objectId,
          data: { custom }
        }
      },
      metadata
    };
  }
  return {
    action: {
      update: {
        id: objectId,
        custom
      }
    },
    metadata
  };
}

export function mintPayload(claimInput = {}) {
  const config = dualConfig();
  return mintPayloadByStyle("direct_custom", config.templateId || templateName, normalizeClaimProperties(claimInput), semanticMetadata("autochain_claim_minted", normalizeClaimProperties(claimInput)));
}

export function mintPayloadAttempts(templateId, claimInput = {}, metadata = {}) {
  const claim = normalizeClaimProperties(claimInput);
  return [
    { style: "direct_custom", payload: mintPayloadByStyle("direct_custom", templateId, claim, metadata) },
    { style: "direct_data_custom", payload: mintPayloadByStyle("direct_data_custom", templateId, claim, metadata) }
  ];
}

function mintPayloadByStyle(style, templateId, claimInput, metadata = {}) {
  const config = dualConfig();
  const custom = {
    ...claimTemplateProperties(claimInput),
    updated_at: new Date().toISOString()
  };
  if (style === "direct_data_custom") {
    return {
      action: {
        mint: {
          template_id: templateId,
          organization_id: config.orgId,
          num: 1,
          data: { custom }
        }
      },
      metadata: mintMetadata(metadata)
    };
  }
  return {
    action: {
      mint: {
        template_id: templateId,
        organization_id: config.orgId,
        num: 1,
        custom
      }
    },
    metadata: mintMetadata(metadata)
  };
}

function mintMetadata(metadata = {}) {
  return {
    name: "AutoChain Claim Demo",
    description: "OEM warranty claim validation object for AutoChain Claim Desk.",
    category: "autochain-warranty-claim",
    ...metadata
  };
}

export async function executeEventBusWithFallback(client, attempts) {
  const errors = [];
  for (const attempt of attempts) {
    try {
      const result = await client.eventBus.execute(attempt.payload);
      return { result, payloadStyle: attempt.style };
    } catch (error) {
      errors.push({
        style: attempt.style,
        status: error.status || null,
        message: error.message,
        body: error.body || null
      });
    }
  }
  const error = new Error(`DUAL event-bus write failed. ${errors.map((item) => `${item.style}: ${item.message}`).join(" | ")}`);
  error.status = errors[0]?.status || 400;
  error.body = { attempts: errors };
  throw error;
}

export async function requirePositiveBalance(config = dualConfig()) {
  const client = await dualClient(config);
  const raw = await client.organizations.balance(config.orgId);
  const value = extractBalance(raw);
  const ready = Number.isFinite(value) && value > 0;
  if (!ready) {
    const error = new Error(`DUAL org balance must be positive before event-bus writes. Current balance: ${value}`);
    error.status = 409;
    error.balance = { ready, value, raw };
    throw error;
  }
  return { ready, value };
}

export function semanticMetadata(eventType, claimInput = {}, audit = {}) {
  const claim = normalizeClaimProperties(claimInput);
  return {
    source: "autochain_claim_desk_demo",
    event_type: eventType,
    event_status: claim.state,
    event_hash: claim.state_hash || claim.decision_hash || "",
    claim_id: claim.claim_id,
    vin: claim.vin,
    part_serial: claim.part_serial,
    last_decision_result: claim.last_decision_result,
    generated_at: new Date().toISOString(),
    audit
  };
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

export function requireMethod(req, res, method) {
  if (req.method === method) return true;
  sendJson(res, 405, { ok: false, error: `Method ${req.method} not allowed`, allowed: [method] });
  return false;
}

export function validateOperator(req) {
  const expected = process.env.DEMO_OPERATOR_TOKEN || "";
  const supplied = req.headers?.["x-demo-operator-token"] || req.headers?.["X-Demo-Operator-Token"] || req.headers?.get?.("x-demo-operator-token") || "";
  const auth = req.headers?.authorization || req.headers?.Authorization || req.headers?.get?.("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return Boolean(expected && (supplied === expected || bearer === expected));
}

export function requireOperator(req) {
  if (!validateOperator(req)) {
    const error = new Error("Invalid or missing operator token.");
    error.status = 403;
    throw error;
  }
}

export function requireWritable(options = {}) {
  const requireObject = options.requireObject !== false;
  const status = readiness();
  const config = dualConfig();
  const baseWritable = Boolean(config.apiKey && config.templateId && config.operatorToken && config.writeMode === "event_bus");
  if (!baseWritable || (requireObject && !config.objectId)) {
    const error = new Error(status.detail);
    error.status = 409;
    error.readiness = status;
    throw error;
  }
}

export async function readBody(request) {
  if (request.body && typeof request.body === "object" && !request.readable) return request.body;
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

export function sendError(response, error) {
  sendJson(response, error.status || 500, {
    error: {
      message: error.message || "Unknown error",
      code: error.code || error.name || "SERVER_ERROR",
      readiness: error.readiness || undefined
    }
  });
}

export function normalizeExternalBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeGate(claim, gateInput) {
  const next = nextGateForState(claim.state) || claimGates[0];
  const matched = claimGates.find((item) => item.id === gateInput.id || item.state === gateInput.state) || next;
  return {
    ...matched,
    ...gateInput,
    id: gateInput.id || matched.id,
    state: gateInput.state || matched.state,
    label: gateInput.label || matched.label,
    action: gateInput.action || matched.action
  };
}

function buildChecks(claim, gate) {
  const checks = [];
  const add = (id, label, passed, detail, warn = false) => {
    checks.push({
      id,
      label,
      status: passed ? "pass" : warn ? "warn" : "fail",
      detail
    });
  };

  if (gate.id === "part_verified") {
    add("oem_signature", "OEM signature", Boolean(claim.oem_signature_valid), "OEM signature failed for submitted serial.");
    add("serial_status", "Serial registry", claim.serial_status === "matched", `Serial registry status is ${claim.serial_status}.`);
    add("recall_status", "Recall status", !claim.recall_open, "Open recall requires human review.", true);
    add("part_category", "Part category", claim.part_category === "powertrain-electrical", "Part category is outside this MVP policy.");
  }

  if (gate.id === "coverage_checked") {
    add("coverage_active", "Coverage active", Boolean(claim.coverage_active), "Warranty coverage is not active for this claim date.");
    add("mileage_limit", "Mileage limit", Number(claim.odometer_km) <= Number(claim.warranty_km_limit), "Odometer exceeds the active warranty limit.");
    add("dealer_authorized", "Dealer authority", Boolean(claim.dealer_authorized), "Submitting dealer is not authorized for this OEM network.");
    add("duplicate_claim", "Duplicate claim", !claim.duplicate_claim, "This VIN and part serial pair has already been reimbursed.");
    add("claim_limit", "Claim ceiling", Number(claim.claim_amount_usd) <= warrantyPolicy().max_claim_amount_usd, "Claim amount exceeds policy ceiling.", true);
  }

  if (gate.id === "approved") {
    add("state_ready", "Coverage state", claim.state === "Coverage_Checked", "Approval requires Coverage_Checked state first.");
    add("evidence_pack", "Evidence pack", Array.isArray(claim.evidence_refs) && claim.evidence_refs.length >= 4, "Approval requires repair order, OEM serial signature, diagnostic scan, and installation photo.");
    add("net_reimbursement", "Net reimbursement", Number(claim.approved_amount_usd) > 0, "Approved reimbursement must be greater than zero.");
  }

  if (gate.id === "paid") {
    add("approved_state", "Approved state", claim.state === "Approved", "Payment requires Approved state first.");
    add("payment_amount", "Payment amount", Number(claim.approved_amount_usd) > 0, "Payment requires a positive approved amount.");
  }

  return checks;
}

async function dualRequest(config, method, path, body) {
  if (!config.apiKey) {
    const error = new Error("DUAL_API_KEY is not configured.");
    error.status = 409;
    throw error;
  }
  const response = await fetch(`${config.apiUrl.replace(/\/+$/, "")}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-key": config.apiKey
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

function deriveProofHashesUnsafe(claim, decision = {}) {
  const policy = warrantyPolicy();
  const policy_hash = hashJson(policy);
  const serial_hash = hashJson({
    oem: claim.oem,
    vin: claim.vin,
    part_category: claim.part_category,
    part_serial: claim.part_serial,
    replacement_serial: claim.replacement_serial
  });
  const evidence_hash = hashJson(claim.evidence_refs || []);
  const claim_hash = hashJson({
    claim_id: claim.claim_id,
    vin: claim.vin,
    dealer_id: claim.dealer_id,
    part_serial: claim.part_serial,
    claim_amount_usd: claim.claim_amount_usd,
    state: claim.state,
    verified_gates: claim.verified_gates,
    blocked_actions: claim.blocked_actions
  });
  const decision_hash = hashJson({
    policy_hash,
    serial_hash,
    evidence_hash,
    result: decision.result || claim.last_decision_result || "Ready",
    reason: decision.reason || claim.last_decision_reason || "Awaiting serial verification.",
    gate_id: decision.gate_id || claim.last_gate_id || ""
  });
  const state_hash = hashJson({ claim_hash, policy_hash, serial_hash, evidence_hash, decision_hash, state: claim.state });
  const integrity_hash = hashJson({ templateName, state_hash });
  return { policy_hash, serial_hash, evidence_hash, claim_hash, decision_hash, state_hash, integrity_hash };
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

export function hashJson(value) {
  return `0x${createHash("sha256").update(JSON.stringify(sortJson(value))).digest("hex")}`;
}

function stringValue(value, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortJson(value[key]);
    return acc;
  }, {});
}
