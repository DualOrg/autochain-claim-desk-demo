import {
  claimGates,
  claimStates,
  claimTemplateProperties,
  dualClient,
  dualConfig,
  evaluateClaimGate,
  executeEventBusWithFallback,
  extractResultObject,
  mintPayloadAttempts,
  nextGateForState,
  normalizeClaimProperties,
  publicVerifierEnvelope,
  readBody,
  readCurrentObject,
  readiness,
  requirePositiveBalance,
  requireWritable,
  seedClaimProperties,
  semanticMetadata,
  sendJson,
  templateName,
  templateVersion,
  updatePayloadAttempts,
  validateOperatorTokenValue,
  warrantyPolicy
} from "./_dual.js";

const protocolVersion = "2025-06-18";
const serverInfo = {
  name: "dual-autochain-claim-desk",
  version: "0.2.0"
};

const claimSchema = {
  type: "object",
  additionalProperties: true,
  description: "AutoChain claim properties. Omit to use the current DUAL-backed claim when configured."
};

const gateSchema = {
  type: "object",
  additionalProperties: true,
  description: "Optional gate override, such as { id: \"approved\" }.",
  properties: {
    id: { type: "string", enum: claimGates.map((gate) => gate.id) },
    state: { type: "string", enum: claimStates },
    label: { type: "string" },
    action: { type: "string" }
  }
};

const auditSchema = {
  type: "object",
  additionalProperties: true,
  description: "Optional non-secret operator audit context to include in DUAL event metadata."
};

const operatorTokenSchema = {
  type: "string",
  description: "Operator token. Required for write tools. Never expose this in prompts, logs, or public clients."
};

const tools = [
  tool("autochain_dual_get_status", "Read AutoChain DUAL readiness, MCP safety, and live object configuration. Returns no secrets.", {
    type: "object",
    additionalProperties: false,
    properties: {}
  }),
  tool("autochain_dual_get_claim", "Read the canonical AutoChain claim from DUAL when configured, otherwise return the local seed claim.", {
    type: "object",
    additionalProperties: false,
    properties: {}
  }),
  tool("autochain_dual_evaluate_gate", "Evaluate a claim gate locally against the AutoChain warranty policy. This is read-only and never writes to DUAL.", {
    type: "object",
    additionalProperties: false,
    properties: {
      claim: claimSchema,
      properties: claimSchema,
      gate: gateSchema
    }
  }),
  tool("autochain_dual_prepare_sync_payload", "Preview the DUAL event-bus update payload for a claim sync without executing it.", {
    type: "object",
    additionalProperties: false,
    properties: {
      claim: claimSchema,
      properties: claimSchema,
      audit: auditSchema
    }
  }),
  tool("autochain_dual_prepare_mint_payload", "Preview the DUAL event-bus mint payload for a new claim object without executing it.", {
    type: "object",
    additionalProperties: false,
    properties: {
      claim: claimSchema,
      properties: claimSchema,
      audit: auditSchema
    }
  }),
  tool("autochain_dual_run_claim_proof", "Run the read-only AutoChain claim proof and return vehicle identity, records, trust score, proof hashes, and verifier status.", {
    type: "object",
    additionalProperties: false,
    properties: {
      claim: claimSchema,
      properties: claimSchema
    }
  }),
  tool("autochain_dual_get_public_verifier_page", "Return the shareable public verifier route and proof envelope for a claim. This is read-only and never writes to DUAL.", {
    type: "object",
    additionalProperties: false,
    properties: {
      claim: claimSchema,
      properties: claimSchema
    }
  }),
  tool("autochain_dual_red_team_claim", "Evaluate common AutoChain blocked-claim scenarios without writing to DUAL.", {
    type: "object",
    additionalProperties: false,
    properties: {
      scenario: {
        type: "string",
        enum: ["duplicate_claim", "invalid_serial", "mileage_over_limit", "unauthorized_dealer", "payment_before_approval"]
      }
    }
  }),
  tool("autochain_dual_generate_reviewer_handoff", "Generate a reviewer handoff pack with route, claim, verifier, API/MCP checks, and safety boundary.", {
    type: "object",
    additionalProperties: false,
    properties: {}
  }),
  tool("autochain_dual_sync_claim", "Operator-gated live DUAL write: sync the supplied or current claim to the configured claim object.", {
    type: "object",
    additionalProperties: false,
    required: ["operator_token"],
    properties: {
      operator_token: operatorTokenSchema,
      claim: claimSchema,
      properties: claimSchema,
      claim_patch: {
        type: "object",
        additionalProperties: true,
        description: "Optional patch merged over the selected claim before writing."
      },
      audit: auditSchema
    }
  }, { readOnly: false, idempotent: false, requiresOperator: true }),
  tool("autochain_dual_advance_gate", "Operator-gated live DUAL write: evaluate the next claim gate and sync the advanced state when policy allows it.", {
    type: "object",
    additionalProperties: false,
    required: ["operator_token"],
    properties: {
      operator_token: operatorTokenSchema,
      gate: gateSchema,
      claim_patch: {
        type: "object",
        additionalProperties: true,
        description: "Optional patch merged over the current claim before evaluating the gate."
      },
      audit: auditSchema
    }
  }, { readOnly: false, idempotent: false, requiresOperator: true }),
  tool("autochain_dual_mint_claim", "Operator-gated live DUAL write: mint a new AutoChain claim object. Requires confirm_mint=true.", {
    type: "object",
    additionalProperties: false,
    required: ["operator_token", "confirm_mint"],
    properties: {
      operator_token: operatorTokenSchema,
      confirm_mint: {
        type: "boolean",
        description: "Must be true to mint a new DUAL object."
      },
      claim: claimSchema,
      properties: claimSchema,
      audit: auditSchema
    }
  }, { readOnly: false, idempotent: false, destructive: true, requiresOperator: true })
];

const resources = [
  resource("autochain://status", "AutoChain status", "DUAL readiness, safety, and MCP tool exposure."),
  resource("autochain://claim", "Current AutoChain claim", "Canonical claim object read from DUAL when configured."),
  resource("autochain://policy", "Warranty policy", "AutoChain warranty gate rules used by the evaluator."),
  resource("autochain://template", "Claim template", "MCP-facing summary of the AutoChain DUAL object schema."),
  resource("autochain://public-verifier", "Public verifier", "Shareable AutoChain claim verifier envelope and route."),
  resource("autochain://safety", "MCP safety", "Read/write boundary and operator-gated write rules.")
];

const prompts = [
  {
    name: "autochain_claim_review_brief",
    description: "Guide an agent to inspect the current claim, evaluate the next gate, and cite proof hashes.",
    arguments: []
  },
  {
    name: "autochain_operator_sync_plan",
    description: "Guide an operator-gated agent through a safe DUAL sync or gate advance.",
    arguments: []
  }
];

export default async function handler(request, response) {
  setMcpHeaders(response);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      endpoint: "/mcp",
      protocolVersion,
      serverInfo,
      auth: {
        required: false,
        type: "operator-token-for-write-tools"
      },
      safety: safetyState(),
      tools: tools.map((item) => item.name),
      resources: resources.map((item) => item.uri)
    });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "method_not_allowed", message: "MCP endpoint accepts GET, POST, and OPTIONS requests." });
    return;
  }

  let message = null;
  try {
    message = await readBody(request);
  } catch (error) {
    sendJson(response, 200, rpcError(null, errorWithCode(error, -32700, "Parse error.")));
    return;
  }

  if (Array.isArray(message)) {
    const results = [];
    for (const item of message) {
      const result = await handleRpcMessage(item, request);
      if (result) results.push(result);
    }
    if (!results.length) {
      response.statusCode = 202;
      response.end();
      return;
    }
    sendJson(response, 200, results);
    return;
  }

  const result = await handleRpcMessage(message, request);
  if (!result) {
    response.statusCode = 202;
    response.end();
    return;
  }
  sendJson(response, 200, result);
}

async function handleRpcMessage(message, request) {
  try {
    if (!message || message.jsonrpc !== "2.0" || !message.method) {
      throw errorWithCode(new Error("Invalid JSON-RPC request."), -32600);
    }
    if (message.id === undefined && String(message.method).startsWith("notifications/")) return null;
    const result = await handleMethod(message.method, message.params || {}, request);
    return { jsonrpc: "2.0", id: message.id ?? null, result };
  } catch (error) {
    return rpcError(message?.id ?? null, error);
  }
}

async function handleMethod(method, params, request) {
  if (method === "initialize") {
    return {
      protocolVersion,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      serverInfo,
      auth: {
        required: false,
        type: "none-for-read-tools; operator-token-for-write-tools",
        detail: "Read and evaluate tools are public. Write tools require DEMO_OPERATOR_TOKEN and never expose the expected token."
      },
      safety: safetyState(),
      instructions: "Use read/evaluate tools for public inspection. Use write tools only in a trusted operator context with the operator token; do not place the token in transcripts, public clients, or logs."
    };
  }
  if (method === "tools/list") return { tools };
  if (method === "resources/list") return { resources };
  if (method === "prompts/list") return { prompts };
  if (method === "tools/call") return toolContent(await callTool(params.name, params.arguments || {}, request));
  if (method === "resources/read") return readResource(params.uri);
  if (method === "prompts/get") return getPrompt(params.name);
  throw errorWithCode(new Error(`Unsupported MCP method: ${method}`), -32601);
}

async function callTool(name, args, request) {
  switch (name) {
    case "autochain_dual_get_status":
      return {
        ok: true,
        status: readiness(),
        safety: safetyState()
      };
    case "autochain_dual_get_claim":
      return { ok: true, current: await safeCurrentClaim() };
    case "autochain_dual_evaluate_gate":
      return evaluateGate(args);
    case "autochain_dual_prepare_sync_payload":
      return prepareSyncPayload(args);
    case "autochain_dual_prepare_mint_payload":
      return prepareMintPayload(args);
    case "autochain_dual_run_claim_proof":
      return runClaimProof(args);
    case "autochain_dual_get_public_verifier_page":
      return getPublicVerifierPage(args);
    case "autochain_dual_red_team_claim":
      return redTeamClaim(args);
    case "autochain_dual_generate_reviewer_handoff":
      return reviewerHandoff();
    case "autochain_dual_sync_claim":
      return syncClaim(args, request);
    case "autochain_dual_advance_gate":
      return advanceGate(args, request);
    case "autochain_dual_mint_claim":
      return mintClaim(args, request);
    default:
      throw errorWithCode(new Error(`Unknown AutoChain MCP tool: ${name}`), -32602);
  }
}

async function evaluateGate(args = {}) {
  const resolved = await resolveClaim(args);
  const evaluation = evaluateClaimGate(resolved.claim, args.gate || {});
  return {
    ok: true,
    evaluated: true,
    source: resolved.source,
    writable: false,
    publicWrites: false,
    status: readiness(),
    evaluation,
    claim: applyEvaluationToClaim(resolved.claim, evaluation)
  };
}

async function prepareSyncPayload(args = {}) {
  const config = dualConfig();
  const resolved = await resolveClaim(args);
  const claim = mergeClaimPatch(resolved.claim, args.claim_patch || args.patch);
  const metadata = semanticMetadata("autochain_claim_synced", claim, { tool: "autochain_dual_prepare_sync_payload", ...(args.audit || {}) });
  return {
    ok: true,
    execute: false,
    action: "update",
    source: resolved.source,
    publicWrites: false,
    objectId: config.objectId || "local-autochain-claim-demo",
    readiness: readiness(),
    metadata,
    claim: claimTemplateProperties(claim),
    payloadAttempts: updatePayloadAttempts(config.objectId || "local-autochain-claim-demo", claim, metadata)
  };
}

async function prepareMintPayload(args = {}) {
  const config = dualConfig();
  const resolved = await resolveClaim(args);
  const claim = mergeClaimPatch(resolved.claim, args.claim_patch || args.patch);
  const metadata = semanticMetadata("autochain_claim_minted", claim, { tool: "autochain_dual_prepare_mint_payload", ...(args.audit || {}) });
  return {
    ok: true,
    execute: false,
    action: "mint",
    source: resolved.source,
    publicWrites: false,
    templateId: config.templateId || templateName,
    readiness: readiness(),
    metadata,
    claim: claimTemplateProperties(claim),
    payloadAttempts: mintPayloadAttempts(config.templateId || templateName, claim, metadata)
  };
}

async function runClaimProof(args = {}) {
  const resolved = await resolveClaim(args);
  const claim = claimTemplateProperties(resolved.claim);
  const gate = nextGateForState(claim.state);
  const evaluation = gate ? evaluateClaimGate(claim, gate) : null;
  const verifier = publicVerifierEnvelope(claim, readiness());
  return {
    ok: true,
    source: resolved.source,
    publicWrites: false,
    claim,
    nextGate: gate,
    evaluation,
    verifier,
    safety: safetyState()
  };
}

async function getPublicVerifierPage(args = {}) {
  const proof = await runClaimProof(args);
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://autochain-eight.vercel.app";
  return {
    ok: true,
    publicWrites: false,
    route: `/proof/${encodeURIComponent(proof.claim.claim_id)}`,
    url: `${baseUrl}/proof/${encodeURIComponent(proof.claim.claim_id)}?content_hash=${encodeURIComponent(proof.verifier.verifier.content_hash.slice(2, 14))}`,
    verifier: proof.verifier,
    safety: safetyState()
  };
}

async function redTeamClaim(args = {}) {
  const resolved = await resolveClaim({ fallback_to_seed: true });
  const scenario = args.scenario || "duplicate_claim";
  const patchByScenario = {
    duplicate_claim: { duplicate_claim: true, serial_status: "duplicate", state: "Part_Verified" },
    invalid_serial: { oem_signature_valid: false, serial_status: "mismatch", state: "Claimed" },
    mileage_over_limit: { odometer_km: 145000, state: "Part_Verified" },
    unauthorized_dealer: { dealer_authorized: false, state: "Part_Verified" },
    payment_before_approval: { state: "Coverage_Checked" }
  };
  const claim = normalizeClaimProperties({ ...resolved.claim, ...(patchByScenario[scenario] || patchByScenario.duplicate_claim) });
  const gate = scenario === "payment_before_approval" ? { id: "paid" } : {};
  const evaluation = evaluateClaimGate(claim, gate);
  return {
    ok: true,
    scenario,
    publicWrites: false,
    evaluation,
    claim: applyEvaluationToClaim(claim, evaluation),
    safety: safetyState()
  };
}

async function reviewerHandoff() {
  const proof = await runClaimProof({});
  const verifier = await getPublicVerifierPage({});
  return {
    ok: true,
    publicWrites: false,
    summary: {
      app: "AutoChain Claim Desk",
      claim_id: proof.claim.claim_id,
      state: proof.claim.state,
      next_gate: proof.nextGate?.id || "complete",
      verifier_url: verifier.url,
      write_boundary: "public read/evaluate only; writes are operator-gated"
    },
    api_checks: [
      "GET /api/dual/status",
      "GET /api/claims/current",
      "GET /api/proof/public",
      "POST /api/claims/evaluate",
      "POST /mcp"
    ],
    mcp_checks: [
      "autochain_dual_get_status",
      "autochain_dual_get_claim",
      "autochain_dual_run_claim_proof",
      "autochain_dual_get_public_verifier_page",
      "autochain_dual_red_team_claim"
    ],
    proof,
    safety: safetyState()
  };
}

async function syncClaim(args = {}, request) {
  if (!hasValidOperator(args, request)) return operatorRejected("autochain_dual_sync_claim");
  try {
    requireWritable();
    const config = dualConfig();
    const resolved = await resolveClaim(args);
    const claim = mergeClaimPatch(resolved.claim, args.claim_patch || args.patch);
    const metadata = semanticMetadata("autochain_claim_synced", claim, { tool: "autochain_dual_sync_claim", ...(args.audit || {}) });
    const balance = await requirePositiveBalance(config);
    const { result, payloadStyle } = await executeEventBusWithFallback(
      await dualClient(config),
      updatePayloadAttempts(config.objectId, claim, metadata)
    );
    const object = extractResultObject(result) || fallbackObject(config, claim);
    return {
      ok: true,
      synced: true,
      action: "update",
      source: resolved.source,
      payloadStyle,
      balance: summarizeBalance(balance),
      publicWrites: false,
      object,
      result
    };
  } catch (error) {
    return toolError(error, "autochain_dual_sync_claim");
  }
}

async function advanceGate(args = {}, request) {
  if (!hasValidOperator(args, request)) return operatorRejected("autochain_dual_advance_gate");
  try {
    requireWritable();
    const config = dualConfig();
    const resolved = await resolveClaim({});
    const patched = mergeClaimPatch(resolved.claim, args.claim_patch || args.patch);
    const evaluation = evaluateClaimGate(patched, args.gate || {});
    if (!evaluation.allowed) {
      return {
        ok: false,
        advanced: false,
        synced: false,
        action: "advance_gate",
        source: resolved.source,
        reason: "Gate evaluation did not allow progression; no DUAL write executed.",
        publicWrites: false,
        evaluation
      };
    }

    const advancedClaim = applyEvaluationToClaim(patched, evaluation);
    const claim = normalizeClaimProperties({
      ...advancedClaim,
      last_decision_reason: `${advancedClaim.last_decision_reason} MCP advance gate executed.`
    });
    const metadata = semanticMetadata("autochain_claim_gate_advanced", claim, { tool: "autochain_dual_advance_gate", ...(args.audit || {}) });
    const balance = await requirePositiveBalance(config);
    const { result, payloadStyle } = await executeEventBusWithFallback(
      await dualClient(config),
      updatePayloadAttempts(config.objectId, claim, metadata)
    );
    const object = extractResultObject(result) || fallbackObject(config, claim);
    return {
      ok: true,
      advanced: true,
      synced: true,
      action: "advance_gate",
      source: resolved.source,
      payloadStyle,
      balance: summarizeBalance(balance),
      publicWrites: false,
      evaluation,
      object,
      result
    };
  } catch (error) {
    return toolError(error, "autochain_dual_advance_gate");
  }
}

async function mintClaim(args = {}, request) {
  if (!hasValidOperator(args, request)) return operatorRejected("autochain_dual_mint_claim");
  if (args.confirm_mint !== true) {
    return {
      ok: false,
      minted: false,
      action: "mint",
      error: "confirm_mint must be true before minting a new DUAL object.",
      publicWrites: false
    };
  }
  try {
    requireWritable({ requireObject: false });
    const config = dualConfig();
    const resolved = await resolveClaim(args);
    const claim = mergeClaimPatch(resolved.claim, args.claim_patch || args.patch);
    const metadata = semanticMetadata("autochain_claim_minted", claim, { tool: "autochain_dual_mint_claim", ...(args.audit || {}) });
    const balance = await requirePositiveBalance(config);
    const { result, payloadStyle } = await executeEventBusWithFallback(
      await dualClient(config),
      mintPayloadAttempts(config.templateId, claim, metadata)
    );
    const object = extractResultObject(result);
    return {
      ok: true,
      minted: true,
      synced: true,
      action: "mint",
      source: resolved.source,
      payloadStyle,
      balance: summarizeBalance(balance),
      publicWrites: false,
      object,
      result
    };
  } catch (error) {
    return toolError(error, "autochain_dual_mint_claim");
  }
}

async function safeCurrentClaim() {
  const status = readiness();
  if (!status.readbackReady) {
    const properties = seedClaimProperties();
    return {
      available: true,
      source: "local_seed",
      status,
      properties: claimTemplateProperties(properties),
      nextGate: nextGateForState(properties.state),
      claimStates,
      claimGates,
      policy: warrantyPolicy()
    };
  }
  try {
    const current = await readCurrentObject();
    return {
      ...current,
      source: "dual_readback",
      claimStates,
      claimGates,
      nextGate: nextGateForState(current.properties.state),
      policy: warrantyPolicy(),
      publicWrites: false
    };
  } catch (error) {
    return {
      available: false,
      source: "dual_readback_error",
      error: error.message,
      status,
      publicWrites: false
    };
  }
}

async function resolveClaim(args = {}) {
  if (args.claim || args.properties) {
    return {
      source: "request",
      claim: normalizeClaimProperties(args.claim || args.properties)
    };
  }

  const status = readiness();
  if (status.readbackReady) {
    try {
      const current = await readCurrentObject();
      if (current.available && current.properties) {
        return {
          source: "dual_readback",
          object: current.object,
          claim: normalizeClaimProperties(current.properties)
        };
      }
    } catch (error) {
      if (!args.fallback_to_seed) throw error;
    }
  }

  return {
    source: "local_seed",
    claim: seedClaimProperties()
  };
}

function applyEvaluationToClaim(claimInput, evaluation) {
  const gateIndex = claimGates.findIndex((gate) => gate.id === evaluation.gate.id);
  const previousBlocked = Number(claimInput.blocked_actions || 0);
  const previousVerified = Number(claimInput.verified_gates || 0);
  return normalizeClaimProperties({
    ...claimInput,
    state: evaluation.allowed ? evaluation.next_state : claimInput.state,
    verified_gates: evaluation.allowed && gateIndex >= 0 ? Math.max(previousVerified, gateIndex + 1) : previousVerified,
    blocked_actions: evaluation.allowed ? previousBlocked : previousBlocked + 1,
    last_decision_result: evaluation.result,
    last_decision_reason: evaluation.reason,
    last_gate_id: evaluation.gate.id,
    updated_at: evaluation.evaluated_at
  });
}

function mergeClaimPatch(claimInput, patch = {}) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return normalizeClaimProperties(claimInput);
  return normalizeClaimProperties({ ...claimInput, ...patch });
}

function hasValidOperator(args = {}, request = {}) {
  const auth = request.headers?.authorization || request.headers?.Authorization || request.headers?.get?.("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const headerToken = request.headers?.["x-demo-operator-token"] || request.headers?.["X-Demo-Operator-Token"] || request.headers?.get?.("x-demo-operator-token") || "";
  return [
    args.operator_token,
    args.operatorToken,
    headerToken,
    bearer
  ].some((value) => validateOperatorTokenValue(value));
}

function operatorRejected(toolName) {
  return {
    ok: false,
    tool: toolName,
    error: "Invalid or missing operator token.",
    publicWrites: false,
    safety: safetyState()
  };
}

function toolError(error, toolName) {
  return {
    ok: false,
    tool: toolName,
    error: error.message || "DUAL write failed.",
    readiness: error.readiness,
    balance: error.balance ? summarizeBalance(error.balance) : undefined,
    publicWrites: false
  };
}

function fallbackObject(config, claim) {
  return {
    id: config.objectId,
    templateId: config.templateId,
    organizationId: config.orgId,
    properties: claimTemplateProperties(claim)
  };
}

function summarizeBalance(balance) {
  return {
    ready: Boolean(balance?.ready),
    value: balance?.value
  };
}

async function readResource(uri) {
  if (uri === "autochain://status") {
    return resourceContent(uri, {
      ok: true,
      status: readiness(),
      safety: safetyState()
    });
  }
  if (uri === "autochain://claim") {
    return resourceContent(uri, { ok: true, current: await safeCurrentClaim() });
  }
  if (uri === "autochain://policy") {
    return resourceContent(uri, {
      ok: true,
      policy: warrantyPolicy(),
      gates: claimGates,
      states: claimStates
    });
  }
  if (uri === "autochain://template") {
    return resourceContent(uri, {
      ok: true,
      schemaVersion: templateName,
      version: templateVersion,
      fields: Object.keys(claimTemplateProperties(seedClaimProperties()))
    });
  }
  if (uri === "autochain://public-verifier") {
    return resourceContent(uri, await getPublicVerifierPage({}));
  }
  if (uri === "autochain://safety") {
    return resourceContent(uri, {
      ok: true,
      safety: safetyState(),
      writeRules: [
        "Read and evaluate tools are public and never write.",
        "Write tools require an operator token matching DEMO_OPERATOR_TOKEN.",
        "Write tools require DUAL_WRITE_MODE=event_bus, DUAL_API_KEY, template/object ids as needed, and positive org balance.",
        "Operator tokens and DUAL API keys must stay server-side or in trusted MCP operator clients."
      ]
    });
  }
  throw errorWithCode(new Error(`Unknown AutoChain MCP resource: ${uri}`), -32602);
}

function getPrompt(name) {
  if (name === "autochain_claim_review_brief") {
    return {
      description: "AutoChain claim review brief",
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "Call autochain_dual_get_claim, then autochain_dual_evaluate_gate for the next gate. Summarize state, next gate, decision result, reason, object id, and proof hashes. Do not call write tools unless explicitly operating in a trusted operator context."
        }
      }]
    };
  }
  if (name === "autochain_operator_sync_plan") {
    return {
      description: "AutoChain operator sync plan",
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: "In a trusted operator context, first call autochain_dual_get_status and autochain_dual_get_claim. Preview with autochain_dual_prepare_sync_payload. Only then call autochain_dual_sync_claim or autochain_dual_advance_gate with the operator token, and report the payload style, object id, state, and decision hash. Never print the token."
        }
      }]
    };
  }
  throw errorWithCode(new Error(`Unknown AutoChain MCP prompt: ${name}`), -32602);
}

function toolContent(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload
  };
}

function resourceContent(uri, payload) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function tool(name, description, inputSchema, options = {}) {
  const readOnly = options.readOnly !== false;
  const destructive = Boolean(options.destructive);
  const requiresOperator = Boolean(options.requiresOperator);
  return {
    name,
    description,
    inputSchema,
    annotations: {
      readOnlyHint: readOnly,
      destructiveHint: destructive,
      idempotentHint: options.idempotent !== false
    },
    "x-dual": {
      requiresAuthentication: requiresOperator,
      authentication: requiresOperator ? "operator_token" : "none",
      readOnly,
      publicWrites: false,
      operatorWritesExposed: !readOnly
    }
  };
}

function resource(uri, name, description) {
  return { uri, name, description, mimeType: "application/json" };
}

function safetyState() {
  const status = readiness();
  return {
    publicWrites: false,
    readToolsPublic: true,
    writeToolsExposed: true,
    writeTools: "operator_gated",
    operatorGateConfigured: status.operatorGateConfigured,
    networkMigration: status.network,
    anonymousWrites: false
  };
}

function setMcpHeaders(response) {
  response.setHeader?.("Cache-Control", "no-store");
  response.setHeader?.("X-Content-Type-Options", "nosniff");
  response.setHeader?.("MCP-Protocol-Version", protocolVersion);
  response.setHeader?.("Access-Control-Allow-Origin", "*");
  response.setHeader?.("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader?.("Access-Control-Allow-Headers", "content-type, accept, authorization, x-demo-operator-token, mcp-protocol-version, mcp-session-id");
}

function errorWithCode(error, code, message) {
  error.code = code;
  if (message) error.message = message;
  return error;
}

function rpcError(id, error) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code: Number.isInteger(error.code) ? error.code : -32603,
      message: error.message || "MCP server error.",
      data: {
        code: error.name || "mcp_error",
        detail: error.detail || error.readiness || null
      }
    }
  };
}
