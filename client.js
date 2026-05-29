const stateOrder = ["Claimed", "Part_Verified", "Coverage_Checked", "Approved", "Paid"];
const stateLabels = {
  Claimed: "Claimed",
  Part_Verified: "Part verified",
  Coverage_Checked: "Coverage checked",
  Approved: "Approved",
  Paid: "Paid"
};

const initialState = {
  dualStatus: null,
  selectedClaimId: "AC-OEM-2026-0007",
  claims: [],
  claim: {
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
    policy_version: 1,
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
  },
  proof: {
    policy_hash: "",
    serial_hash: "",
    evidence_hash: "",
    decision_hash: "",
    state_hash: "",
    integrity_hash: ""
  },
  audit: [
    {
      type: "ok",
      title: "Claim opened",
      detail: "Dealer submitted AC-OEM-2026-0007 for one Bosch inverter module.",
      at: "09:08:11"
    },
    {
      type: "ok",
      title: "Evidence pack attached",
      detail: "Repair order, serial signature, scan output, and installation photo anchored locally.",
      at: "09:10:42"
    },
    {
      type: "warn",
      title: "Duplicate rule armed",
      detail: "VIN + part serial can only be reimbursed once across the OEM network.",
      at: "09:11:03"
    }
  ],
  mcpHistory: [],
  proofHistory: []
};

const requiredEvidenceTypes = [
  "dealer_repair_order",
  "oem_serial_signature",
  "diagnostic_scan",
  "installation_photo"
];

const supplementalClaimSeeds = [
  {
    queue: {
      priority: "Medium",
      assigned_to: "Claims ops",
      sla: "4h 12m",
      source: "local queue",
      note: "Awaiting dealer photo metadata.",
      received_at: "2026-05-28T08:21:00.000Z"
    },
    claim: {
      claim_id: "AC-OEM-2026-0008",
      vin: "WDDWF4KB2NR684210",
      vehicle: "2023 Mercedes-Benz C300",
      dealer_id: "DLR-VIC-118",
      dealer_name: "Melbourne Star Motors",
      dealer_region: "VIC-AU",
      oem: "Bosch Mobility",
      part_name: "ABS control module",
      part_category: "powertrain-electrical",
      part_serial: "BOSCHABS-ESP-VIC-684210",
      replacement_serial: "BOSCHABS-ESP-VIC-684210-R",
      claim_amount_usd: 1740,
      approved_amount_usd: 1585,
      deductible_usd: 155,
      odometer_km: 38750,
      state: "Part_Verified",
      verified_gates: 1,
      last_decision_result: "Needs evidence",
      last_decision_reason: "Installation photo metadata is missing before coverage can be checked.",
      last_gate_id: "part_verified",
      updated_at: "2026-05-28T08:24:10.000Z",
      evidence_refs: [
        {
          type: "dealer_repair_order",
          id: "RO-VIC-11855",
          issuer: "Melbourne Star Motors",
          hash: "0x1620a6ce40f5e2023446296df93bb4b0e273ba2c5c1d7d2d5edeeea56c45e184"
        },
        {
          type: "oem_serial_signature",
          id: "BOSCH-SIG-684210",
          issuer: "Bosch Mobility",
          hash: "0x49577e4a2f2f6e3d8122dbbc712347346222a01a9ed2d222da4597918f61ec43"
        },
        {
          type: "diagnostic_scan",
          id: "OBD-20260528-0908",
          issuer: "Dealer diagnostic tool",
          hash: "0xf4766a0d35031d93e7e7aac9510a31a5d1362d59e7e66e56d3d4060f62643628"
        }
      ]
    }
  },
  {
    queue: {
      priority: "Critical",
      assigned_to: "Fraud review",
      sla: "38m",
      source: "local queue",
      note: "VIN and serial already reimbursed once.",
      received_at: "2026-05-28T07:46:00.000Z"
    },
    claim: {
      claim_id: "AC-OEM-2026-0009",
      vin: "JTEBR3FJ50K112909",
      vehicle: "2024 Toyota LandCruiser Prado",
      dealer_id: "DLR-QLD-033",
      dealer_name: "Brisbane North Auto",
      dealer_region: "QLD-AU",
      oem: "Bosch Mobility",
      part_name: "48V inverter module",
      part_category: "powertrain-electrical",
      part_serial: "BOSCHINV-48V-QLD-112909",
      replacement_serial: "BOSCHINV-48V-QLD-112909-R",
      claim_amount_usd: 2210,
      approved_amount_usd: 0,
      deductible_usd: 125,
      odometer_km: 52200,
      duplicate_claim: true,
      serial_status: "duplicate",
      state: "Coverage_Checked",
      verified_gates: 2,
      blocked_actions: 1,
      last_decision_result: "Blocked",
      last_decision_reason: "VIN + part serial has already been reimbursed.",
      last_gate_id: "coverage_checked",
      updated_at: "2026-05-28T07:51:15.000Z"
    }
  }
];

let appState = loadState();

const $ = (id) => document.getElementById(id);

function loadState() {
  const demo = requestedDemoState();
  if (demo) return normalizeAppState(demo);
  const boot = bootState();
  if (boot) return normalizeAppState(boot);
  const stored = localStorage.getItem("dual-autochain-state");
  if (!stored) return normalizeAppState(clone(initialState));
  try {
    const parsed = JSON.parse(stored);
    return normalizeAppState({
      ...clone(initialState),
      ...parsed,
      claim: { ...clone(initialState.claim), ...(parsed.claim || {}) },
      proof: { ...clone(initialState.proof), ...(parsed.proof || {}) },
      audit: Array.isArray(parsed.audit) ? parsed.audit : clone(initialState.audit),
      mcpHistory: Array.isArray(parsed.mcpHistory) ? parsed.mcpHistory : [],
      proofHistory: Array.isArray(parsed.proofHistory) ? parsed.proofHistory : []
    });
  } catch {
    return normalizeAppState(clone(initialState));
  }
}

function normalizeAppState(state) {
  const currentClaim = { ...clone(initialState.claim), ...(state.claim || {}) };
  const claims = ensureClaimQueue(state.claims, currentClaim, state.dualStatus);
  const selectedClaimId = state.selectedClaimId || currentClaim.claim_id;
  const selected = claims.find((item) => item.claim.claim_id === selectedClaimId) || claims[0];
  const claim = selected ? clone(selected.claim) : currentClaim;
  const proof = proofFromClaim(claim, state.proof);
  return {
    ...clone(initialState),
    ...state,
    selectedClaimId: claim.claim_id,
    claims,
    claim,
    proof,
    audit: Array.isArray(state.audit) ? state.audit : clone(initialState.audit),
    mcpHistory: Array.isArray(state.mcpHistory) ? state.mcpHistory : [],
    proofHistory: Array.isArray(state.proofHistory) && state.proofHistory.length
      ? state.proofHistory
      : [proofCheckpoint("Loaded claim proof", claim, proof)]
  };
}

function ensureClaimQueue(existingClaims, currentClaim, dualStatus = null) {
  const normalized = Array.isArray(existingClaims)
    ? existingClaims.map((item) => normalizeQueueItem(item, currentClaim, dualStatus)).filter(Boolean)
    : [];
  const primary = normalizeQueueItem({
    queue: {
      priority: currentClaim.state === "Approved" ? "High" : "Medium",
      assigned_to: "OEM claim desk",
      sla: currentClaim.state === "Approved" ? "1h 42m" : "2h 18m",
      source: dualStatus?.readbackReady ? "DUAL readback" : "local seed",
      note: "Canonical live claim.",
      received_at: currentClaim.claim_date ? `${currentClaim.claim_date}T09:08:00.000Z` : currentClaim.updated_at
    },
    claim: currentClaim
  }, currentClaim, dualStatus);
  const supplemental = supplementalClaimSeeds.map((item) => normalizeQueueItem(item, currentClaim, dualStatus));
  const byId = new Map([...supplemental, ...normalized, primary].filter(Boolean).map((item) => [item.claim.claim_id, item]));
  return Array.from(byId.values()).sort((a, b) => b.risk_score - a.risk_score);
}

function normalizeQueueItem(item, fallbackClaim, dualStatus = null) {
  const claim = {
    ...clone(initialState.claim),
    ...(item?.claim || item || fallbackClaim),
    evidence_refs: Array.isArray(item?.claim?.evidence_refs || item?.evidence_refs)
      ? clone(item.claim?.evidence_refs || item.evidence_refs)
      : clone(initialState.claim.evidence_refs)
  };
  const queue = item?.queue || {};
  return {
    id: claim.claim_id,
    queue: {
      priority: queue.priority || priorityForClaim(claim),
      assigned_to: queue.assigned_to || "Claims ops",
      sla: queue.sla || slaForClaim(claim),
      source: queue.source || (claim.claim_id === fallbackClaim.claim_id && dualStatus?.readbackReady ? "DUAL readback" : "local queue"),
      note: queue.note || claim.last_decision_reason || "Ready for review.",
      received_at: queue.received_at || claim.updated_at || new Date().toISOString()
    },
    claim,
    evidence_score: evidenceScore(claim),
    risk_score: riskScore(claim),
    exposure_usd: Number(claim.approved_amount_usd || claim.claim_amount_usd || 0)
  };
}

function bootState() {
  const node = document.getElementById("autochain-boot");
  if (!node?.textContent) return null;
  try {
    const payload = JSON.parse(node.textContent);
    if (!payload?.dualStatus?.readbackReady || !payload?.claim) return null;
    return {
      ...clone(initialState),
      dualStatus: payload.dualStatus,
      claim: { ...clone(initialState.claim), ...payload.claim },
      proof: {
        ...clone(initialState.proof),
        policy_hash: payload.claim.policy_hash,
        serial_hash: payload.claim.serial_hash,
        evidence_hash: payload.claim.evidence_hash,
        decision_hash: payload.claim.decision_hash,
        state_hash: payload.claim.state_hash,
        integrity_hash: payload.claim.integrity_hash
      },
      mcpHistory: deriveMcpHistory(payload.claim, [])
    };
  } catch {
    return null;
  }
}

function requestedDemoState() {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get("demo");
  if (demo !== "coverage") return null;
  const state = clone(initialState);
  state.claim.state = "Coverage_Checked";
  state.claim.verified_gates = 2;
  state.claim.last_decision_result = "Approved";
  state.claim.last_decision_reason = "Coverage checked. Claim can be approved.";
  state.audit.unshift({
    type: "ok",
    title: "Coverage checked",
    detail: "Warranty date, mileage, dealer authority, and duplicate claim checks passed.",
    at: nowTime()
  });
  return state;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function proofFromClaim(claim, fallback = {}) {
  const policyHash = fallback?.policy_hash || claim.policy_hash || localHash("autochain-oem-warranty-policy:v1");
  const serialHash = fallback?.serial_hash || claim.serial_hash || localHash(`${claim.oem}:${claim.vin}:${claim.part_serial}:${claim.replacement_serial}`);
  const evidenceHash = fallback?.evidence_hash || claim.evidence_hash || localHash(JSON.stringify(claim.evidence_refs || []));
  const decisionHash = fallback?.decision_hash || claim.decision_hash || localHash(`${policyHash}:${serialHash}:${evidenceHash}:${claim.state}:${claim.last_decision_result}`);
  const stateHash = fallback?.state_hash || claim.state_hash || localHash(`${claim.claim_id}:${claim.state}:${claim.verified_gates}:${decisionHash}`);
  const integrityHash = fallback?.integrity_hash || claim.integrity_hash || localHash(`io.dual.autochain_claim.demo.v1:${stateHash}`);
  return {
    ...clone(initialState.proof),
    ...fallback,
    policy_hash: policyHash,
    serial_hash: serialHash,
    evidence_hash: evidenceHash,
    decision_hash: decisionHash,
    state_hash: stateHash,
    integrity_hash: integrityHash
  };
}

function proofCheckpoint(label, claim = appState?.claim || initialState.claim, proof = appState?.proof || {}) {
  return {
    id: `${claim.claim_id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    claim_id: claim.claim_id,
    state: claim.state,
    gate_id: claim.last_gate_id || nextGateForClaim(claim)?.id || "",
    decision_hash: proof.decision_hash || claim.decision_hash || "",
    state_hash: proof.state_hash || claim.state_hash || "",
    integrity_hash: proof.integrity_hash || claim.integrity_hash || "",
    at: new Date().toISOString(),
    publicWrites: false
  };
}

function evidenceScore(claim) {
  const available = new Set((claim.evidence_refs || []).map((item) => item.type));
  return Math.round((requiredEvidenceTypes.filter((type) => available.has(type)).length / requiredEvidenceTypes.length) * 100);
}

function riskScore(claim) {
  let score = 12;
  if (claim.duplicate_claim || claim.serial_status === "duplicate") score += 54;
  if (!claim.oem_signature_valid) score += 22;
  if (!claim.dealer_authorized) score += 20;
  if (!claim.coverage_active) score += 18;
  if (claim.recall_open) score += 14;
  if (Number(claim.claim_amount_usd || 0) > 2000) score += 10;
  if (evidenceScore(claim) < 100) score += 12;
  if (claim.last_decision_result === "Blocked") score += 15;
  if (claim.state === "Approved") score -= 6;
  return Math.max(0, Math.min(99, score));
}

function priorityForClaim(claim) {
  const score = riskScore(claim);
  if (score >= 70) return "Critical";
  if (score >= 42) return "High";
  if (score >= 24) return "Medium";
  return "Low";
}

function slaForClaim(claim) {
  if (claim.last_decision_result === "Blocked") return "38m";
  if (claim.state === "Approved") return "1h 42m";
  if (evidenceScore(claim) < 100) return "4h 12m";
  return "2h 18m";
}

function syncSelectedClaim() {
  appState.claims = ensureClaimQueue(appState.claims, appState.claim, appState.dualStatus).map((item) => {
    if (item.claim.claim_id !== appState.selectedClaimId) return item;
    return normalizeQueueItem({ ...item, claim: appState.claim }, appState.claim, appState.dualStatus);
  });
}

function saveState() {
  syncSelectedClaim();
  localStorage.setItem("dual-autochain-state", JSON.stringify(appState));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function nowTime() {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}

function nextGate() {
  if (appState.claim.state === "Claimed") {
    return {
      id: "part_verified",
      state: "Part_Verified",
      action: "Verify serial hash",
      description: "Validate OEM signature, part serial, VIN binding, and recall status."
    };
  }
  if (appState.claim.state === "Part_Verified") {
    return {
      id: "coverage_checked",
      state: "Coverage_Checked",
      action: "Check warranty terms",
      description: "Validate mileage, date, dealer authority, duplicate claim status, and coverage terms."
    };
  }
  if (appState.claim.state === "Coverage_Checked") {
    return {
      id: "approved",
      state: "Approved",
      action: "Approve reimbursement",
      description: "Approve the net reimbursement and lock the claim decision hash."
    };
  }
  if (appState.claim.state === "Approved") {
    return {
      id: "paid",
      state: "Paid",
      action: "Mark paid",
      description: "Record payment release against the approved claim."
    };
  }
  return {
    id: "closed",
    state: "Paid",
    action: "Claim complete",
    description: "The claim has reached the final AutoChain state."
  };
}

function render() {
  const claim = appState.claim;
  const gate = nextGate();
  $("stateLabel").textContent = stateLabels[claim.state] || claim.state;
  $("claimTitle").textContent = claim.claim_id;
  $("vehicleValue").textContent = claim.vehicle;
  $("vinValue").textContent = claim.vin;
  $("dealerValue").textContent = claim.dealer_name;
  $("dealerIdValue").textContent = claim.dealer_id;
  $("partValue").textContent = claim.part_name;
  $("serialValue").textContent = claim.part_serial;
  $("amountValue").textContent = formatCurrency(claim.approved_amount_usd);
  $("deductibleValue").textContent = `${formatCurrency(claim.deductible_usd)} deductible`;
  $("coverageValue").textContent = `48 months / ${claim.warranty_km_limit.toLocaleString()} km`;
  $("odometerValue").textContent = `${claim.odometer_km.toLocaleString()} km`;
  $("gateTitle").textContent = gate.action;
  $("gateDescription").textContent = gate.description;
  $("evidenceCount").textContent = `${claim.evidence_refs.length} anchors`;
  $("eventCount").textContent = `${appState.audit.length} events`;
  $("proofMode").textContent = appState.dualStatus?.persistenceMode || "local";
  $("objectId").textContent = appState.dualStatus?.objectId || "local-autochain-claim-demo";

  renderResult();
  renderStateList();
  renderEvidence();
  renderHashes();
  renderAudit();
  renderReadiness();
  renderMcpHistory();
  renderQueue();
  renderOpsStrip();
  renderPayment();
  renderProofHistory();

  $("verifyButton").disabled = claim.state === "Paid";
  $("verifyButtonLabel").textContent = claim.state === "Paid" ? "Claim complete" : "Verify next gate";
}

function renderQueue() {
  const claims = ensureClaimQueue(appState.claims, appState.claim, appState.dualStatus);
  appState.claims = claims;
  $("queueCount").textContent = String(claims.length);
  $("claimQueueList").innerHTML = claims.map((item) => {
    const selected = item.claim.claim_id === appState.selectedClaimId;
    const blocked = item.claim.last_decision_result === "Blocked";
    return `
      <button class="queue-item ${selected ? "selected" : ""} ${blocked ? "blocked" : ""}" type="button" data-claim-id="${item.claim.claim_id}">
        <span>
          <strong>${item.claim.claim_id}</strong>
          <small>${item.claim.dealer_region} / ${item.queue.sla}</small>
        </span>
        <em>${item.queue.priority}</em>
      </button>
    `;
  }).join("");
}

function renderOpsStrip() {
  const claims = ensureClaimQueue(appState.claims, appState.claim, appState.dualStatus);
  const currentIndex = Math.max(0, claims.findIndex((item) => item.claim.claim_id === appState.selectedClaimId));
  const current = claims[currentIndex] || normalizeQueueItem({ claim: appState.claim }, appState.claim, appState.dualStatus);
  $("queuePosition").textContent = `${currentIndex + 1} of ${claims.length}`;
  $("riskScore").textContent = String(current.risk_score);
  $("riskScore").className = current.risk_score >= 70 ? "risk-high" : current.risk_score >= 42 ? "risk-med" : "risk-low";
  $("evidenceScore").textContent = `${current.evidence_score}%`;
  $("evidenceScore").className = current.evidence_score < 100 ? "risk-med" : "risk-low";
  $("exposureValue").textContent = formatCurrency(current.exposure_usd);
}

function renderResult() {
  const result = appState.claim.state === "Paid" ? "Paid" : appState.claim.last_decision_result || "Ready";
  const element = $("claimResult");
  element.textContent = result;
  element.className = "claim-result";
  if (["Approved", "Paid"].includes(appState.claim.state) || result === "Approved") element.classList.add("ok");
  if (result === "Approved with review" || result === "Needs evidence") element.classList.add("warn");
  if (result === "Blocked") element.classList.add("blocked");
}

function renderStateList() {
  const currentIndex = stateOrder.indexOf(appState.claim.state);
  $("stateList").innerHTML = stateOrder.map((state, index) => {
    const status = index < currentIndex ? "complete" : index === currentIndex ? "current" : "";
    const blocked = appState.claim.last_decision_result === "Blocked" && index === currentIndex ? " blocked" : "";
    const label = stateLabels[state];
    const copy = state === "Claimed"
      ? "Dealer claim opened"
      : state === "Part_Verified"
        ? "OEM serial validated"
        : state === "Coverage_Checked"
          ? "Warranty terms passed"
          : state === "Approved"
            ? "Reimbursement authorized"
            : "Payment proof recorded";
    return `
      <li class="state-item ${status}${blocked}">
        <span class="state-dot">${index + 1}</span>
        <span class="state-copy"><strong>${label}</strong><span>${copy}</span></span>
      </li>
    `;
  }).join("");
}

function renderEvidence() {
  const available = new Set((appState.claim.evidence_refs || []).map((item) => item.type));
  const rows = [...(appState.claim.evidence_refs || [])].map((item) => ({
    ...item,
    missing: false,
    status: evidenceStatus(item.type, appState.claim)
  }));
  for (const type of requiredEvidenceTypes) {
    if (!available.has(type)) {
      rows.push({
        type,
        id: "missing",
        issuer: "Required evidence",
        hash: "",
        missing: true,
        status: "missing"
      });
    }
  }
  $("evidenceRows").innerHTML = rows.map((item) => `
    <div class="evidence-row">
      <div>
        <strong>${labelize(item.type)}</strong>
        <span>${item.issuer} / ${item.id}</span>
      </div>
      <div class="evidence-proof">
        <em class="${item.status}">${item.status}</em>
        <code>${item.missing ? "not attached" : shortHash(item.hash)}</code>
      </div>
    </div>
  `).join("");
}

function evidenceStatus(type, claim) {
  if (claim.last_decision_result === "Blocked") return "review";
  if (!requiredEvidenceTypes.includes(type)) return "optional";
  if (type === "oem_serial_signature" && !claim.oem_signature_valid) return "failed";
  if (type === "installation_photo" && evidenceScore(claim) < 100) return "missing";
  return "verified";
}

function renderHashes() {
  const claim = appState.claim;
  const proof = { ...appState.proof };
  const items = [
    ["policy hash", proof.policy_hash || claim.policy_hash],
    ["serial hash", proof.serial_hash || claim.serial_hash],
    ["evidence hash", proof.evidence_hash || claim.evidence_hash],
    ["decision hash", proof.decision_hash || claim.decision_hash],
    ["state hash", proof.state_hash || claim.state_hash],
    ["integrity hash", proof.integrity_hash || claim.integrity_hash]
  ];
  $("hashList").innerHTML = items.map(([label, value]) => `
    <div class="hash-item">
      <span>${label}</span>
      <code>${shortHash(value || "pending")}</code>
    </div>
  `).join("");
}

function renderAudit() {
  $("auditList").innerHTML = appState.audit.slice(0, 8).map((event) => `
    <article class="audit-event ${event.type === "blocked" ? "blocked" : event.type === "warn" ? "warn" : ""}">
      <strong>${event.title}</strong>
      <p>${event.detail}</p>
      <time>${event.at}</time>
    </article>
  `).join("");
}

function renderReadiness() {
  const status = appState.dualStatus;
  const box = $("readinessBox");
  if (!status) {
    box.className = "readiness";
    box.innerHTML = "<span>Readiness</span><p>Checking local DUAL boundary...</p>";
    setTextIfPresent("runtimeMode", "local / deterministic");
    setTextIfPresent("writableMode", "operator gated");
    setTextIfPresent("readbackMode", "checking");
    return;
  }
  box.className = status.writable ? "readiness ok" : "readiness";
  const missing = status.missing?.length ? ` Missing: ${status.missing.join(", ")}.` : "";
  box.innerHTML = `
    <span>Readiness</span>
    <p>${status.readbackReady ? "DUAL readback configured." : "Local deterministic proof mode."} Public writes remain disabled.${missing}</p>
  `;
  $("dualStatusChip").textContent = status.readbackReady ? "DUAL readback ready" : "Local proof";
  setTextIfPresent("runtimeMode", status.persistenceMode ? `vercel / ${status.persistenceMode}` : "local / deterministic");
  setTextIfPresent("writableMode", status.writeMode || "operator gated");
  setTextIfPresent("readbackMode", status.readbackReady ? "configured" : "local");
}

function renderMcpHistory() {
  const history = Array.isArray(appState.mcpHistory) ? appState.mcpHistory : [];
  $("mcpHistoryCount").textContent = String(history.length);
  if (!history.length) {
    $("mcpHistoryList").innerHTML = `
      <div class="mcp-history-empty">
        <span>No MCP writes observed in this browser session.</span>
      </div>
    `;
    return;
  }
  $("mcpHistoryList").innerHTML = history.slice(0, 5).map((entry) => `
    <article class="mcp-history-item">
      <div>
        <strong>${entry.tool}</strong>
        <span>${entry.state} / ${entry.nextGate || "complete"}</span>
      </div>
      <p>${entry.reason}</p>
      <code>${shortHash(entry.decisionHash || entry.stateHash || "pending")}</code>
      <time>${entry.at}</time>
    </article>
  `).join("");
}

function renderPayment() {
  const claim = appState.claim;
  const completeEvidence = evidenceScore(claim) === 100;
  const approved = claim.state === "Approved" || claim.state === "Paid";
  const duplicateClear = !claim.duplicate_claim && claim.serial_status !== "duplicate";
  const canRelease = approved && completeEvidence && duplicateClear && claim.last_decision_result !== "Blocked";
  const paid = claim.state === "Paid";
  $("paymentStatus").textContent = paid
    ? `Paid ${claim.payment_reference || ""}`.trim()
    : canRelease
      ? "Ready for controlled release"
      : approved
        ? "Approval held for review"
        : "Locked until approval";
  $("paymentDescription").textContent = paid
    ? "Payment proof is recorded against the claim state."
    : canRelease
      ? "All release conditions are satisfied. Operator-gated write remains separate from this public UI."
      : "Payment release requires an approved claim, complete evidence, and a clean duplicate check.";
  const checks = [
    ["Approved state", approved],
    ["Evidence complete", completeEvidence],
    ["Duplicate clear", duplicateClear],
    ["Public write disabled", true]
  ];
  $("paymentChecks").innerHTML = checks.map(([label, ok]) => `
    <span class="${ok ? "ok" : "hold"}">${ok ? "OK" : "HOLD"} ${label}</span>
  `).join("");
}

function renderProofHistory() {
  const history = Array.isArray(appState.proofHistory) ? appState.proofHistory : [];
  $("proofHistoryCount").textContent = String(history.length);
  if (!history.length) {
    $("proofHistoryList").innerHTML = `<div class="mcp-history-empty"><span>No proof checkpoints yet.</span></div>`;
    return;
  }
  $("proofHistoryList").innerHTML = history.slice(0, 5).map((entry) => `
    <article class="proof-history-item">
      <div>
        <strong>${entry.label}</strong>
        <span>${entry.state}</span>
      </div>
      <code>${shortHash(entry.decision_hash || entry.state_hash || entry.integrity_hash || "pending")}</code>
      <time>${new Date(entry.at).toLocaleString("en-AU")}</time>
    </article>
  `).join("");
}

async function refreshStatus() {
  const response = await fetch("/api/dual/status", { headers: { accept: "application/json" } });
  appState.dualStatus = await response.json();
  saveState();
  render();
}

async function refreshCurrentClaim() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("demo")) return;
  if (appState.claim.last_gate_id && appState.dualStatus?.readbackReady !== true) return;
  const response = await fetch("/api/claims/current", { headers: { accept: "application/json" } });
  const body = await response.json();
  if (!response.ok || !body.ok || !body.properties) return;
  const properties = body.properties;
  if (body.status) appState.dualStatus = body.status;
  const liveClaim = body.source === "dual_readback"
    ? { ...clone(initialState.claim), ...properties }
    : {
        ...appState.claim,
        policy_hash: properties.policy_hash,
        serial_hash: properties.serial_hash,
        evidence_hash: properties.evidence_hash,
        claim_hash: properties.claim_hash,
        decision_hash: properties.decision_hash,
        state_hash: properties.state_hash,
        integrity_hash: properties.integrity_hash
      };
  const liveQueueItem = normalizeQueueItem({
    queue: {
      priority: liveClaim.state === "Approved" ? "High" : "Medium",
      assigned_to: "OEM claim desk",
      sla: liveClaim.state === "Approved" ? "1h 42m" : "2h 18m",
      source: body.source === "dual_readback" ? "DUAL readback" : "local seed",
      note: liveClaim.last_decision_reason || "Canonical live claim.",
      received_at: liveClaim.claim_date ? `${liveClaim.claim_date}T09:08:00.000Z` : liveClaim.updated_at
    },
    claim: liveClaim
  }, liveClaim, appState.dualStatus);
  appState.claims = [liveQueueItem, ...appState.claims.filter((item) => item.claim.claim_id !== liveClaim.claim_id)];
  if (!appState.selectedClaimId || appState.selectedClaimId === liveClaim.claim_id) {
    appState.selectedClaimId = liveClaim.claim_id;
    appState.claim = liveClaim;
  }
  if (appState.selectedClaimId === liveClaim.claim_id) {
    appState.proof = {
      ...appState.proof,
      policy_hash: properties.policy_hash,
      serial_hash: properties.serial_hash,
      evidence_hash: properties.evidence_hash,
      decision_hash: properties.decision_hash,
      state_hash: properties.state_hash,
      integrity_hash: properties.integrity_hash
    };
  }
  appState.mcpHistory = deriveMcpHistory(properties, appState.mcpHistory);
  if (appState.selectedClaimId === liveClaim.claim_id) {
    appState.proofHistory = [
      proofCheckpoint("DUAL readback refreshed", appState.claim, appState.proof),
      ...(appState.proofHistory || [])
    ].slice(0, 8);
  }
  saveState();
  render();
}

function deriveMcpHistory(claim = {}, existing = []) {
  const reason = String(claim.last_decision_reason || "");
  if (!reason.toLowerCase().includes("mcp")) return existing;
  const key = `${claim.updated_at || ""}|${claim.state_hash || ""}|${claim.last_gate_id || ""}|${reason}`;
  if (existing.some((entry) => entry.key === key)) return existing;
  const entry = {
    key,
    tool: reason.toLowerCase().includes("advance") ? "autochain_dual_advance_gate" : "autochain_dual_sync_claim",
    state: stateLabels[claim.state] || claim.state || "Unknown",
    nextGate: nextGateForClaim(claim)?.id || null,
    reason,
    decisionHash: claim.decision_hash || "",
    stateHash: claim.state_hash || "",
    at: claim.updated_at ? new Date(claim.updated_at).toLocaleString("en-AU") : nowTime()
  };
  return [entry, ...existing].slice(0, 5);
}

function nextGateForClaim(claim = {}) {
  const state = claim.state || appState.claim.state;
  if (state === "Claimed") return { id: "part_verified" };
  if (state === "Part_Verified") return { id: "coverage_checked" };
  if (state === "Coverage_Checked") return { id: "approved" };
  if (state === "Approved") return { id: "paid" };
  return null;
}

async function verifyNextGate() {
  const gate = nextGate();
  if (gate.id === "closed") return;
  const response = await fetch("/api/claims/evaluate", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ claim: appState.claim, gate })
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "AutoChain evaluation failed");
  applyEvaluation(body.evaluation);
}

function applyEvaluation(evaluation) {
  const previousState = appState.claim.state;
  appState.proof = { ...appState.proof, ...(evaluation.proof || {}) };
  appState.claim.last_decision_result = evaluation.result;
  appState.claim.last_decision_reason = evaluation.reason;
  appState.claim.last_gate_id = evaluation.gate.id;
  appState.claim.updated_at = evaluation.evaluated_at;

  if (evaluation.allowed) {
    appState.claim.state = evaluation.next_state;
    appState.claim.verified_gates = Math.max(appState.claim.verified_gates || 0, stateOrder.indexOf(evaluation.next_state));
    if (evaluation.next_state === "Paid") {
      appState.claim.payment_reference = `ACH-${Date.now().toString().slice(-6)}`;
    }
  } else {
    appState.claim.blocked_actions = (appState.claim.blocked_actions || 0) + 1;
  }

  appState.audit.unshift({
    type: evaluation.allowed ? "ok" : evaluation.result === "Needs evidence" ? "warn" : "blocked",
    title: `${evaluation.gate.label}: ${evaluation.result}`,
    detail: `${previousState} -> ${evaluation.allowed ? evaluation.next_state : previousState}. ${evaluation.reason}`,
    at: nowTime()
  });
  appState.proofHistory = [
    proofCheckpoint(`${evaluation.gate.label}: ${evaluation.result}`, appState.claim, appState.proof),
    ...(appState.proofHistory || [])
  ].slice(0, 8);
  saveState();
  render();
}

function requestInfo() {
  appState.claim.last_decision_result = "Needs evidence";
  appState.claim.last_decision_reason = "Manual review requested installation-photo metadata before reimbursement.";
  appState.audit.unshift({
    type: "warn",
    title: "More information requested",
    detail: "Reviewer requested installation-photo metadata while preserving current DUAL proof state.",
    at: nowTime()
  });
  saveState();
  render();
}

async function blockTest() {
  const original = clone(appState.claim);
  appState.claim.serial_status = "duplicate";
  appState.claim.duplicate_claim = true;
  const gate = appState.claim.state === "Claimed" ? nextGate() : { id: "coverage_checked", state: "Coverage_Checked" };
  const response = await fetch("/api/claims/evaluate", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ claim: appState.claim, gate })
  });
  const body = await response.json();
  appState.claim = { ...original, last_decision_result: body.evaluation.result, last_decision_reason: body.evaluation.reason };
  appState.proof = { ...appState.proof, ...(body.evaluation.proof || {}) };
  appState.audit.unshift({
    type: "blocked",
    title: "Duplicate claim blocked",
    detail: body.evaluation.reason,
    at: nowTime()
  });
  saveState();
  render();
}

function resetDemo() {
  appState = normalizeAppState(clone(initialState));
  localStorage.removeItem("dual-autochain-state");
  saveState();
  render();
  refreshStatus().then(() => refreshCurrentClaim()).catch(() => {});
}

function selectClaim(claimId) {
  syncSelectedClaim();
  const selected = ensureClaimQueue(appState.claims, appState.claim, appState.dualStatus).find((item) => item.claim.claim_id === claimId);
  if (!selected) return;
  appState.selectedClaimId = selected.claim.claim_id;
  appState.claim = clone(selected.claim);
  appState.proof = proofFromClaim(appState.claim, {});
  appState.audit.unshift({
    type: "ok",
    title: "Claim selected",
    detail: `${selected.claim.claim_id} loaded from ${selected.queue.source}.`,
    at: nowTime()
  });
  appState.proofHistory = [
    proofCheckpoint("Claim selected", appState.claim, appState.proof),
    ...(appState.proofHistory || [])
  ].slice(0, 8);
  saveState();
  render();
}

function attachMissingEvidence() {
  const existing = new Set((appState.claim.evidence_refs || []).map((item) => item.type));
  const missingType = requiredEvidenceTypes.find((type) => !existing.has(type));
  if (!missingType) {
    appState.audit.unshift({
      type: "ok",
      title: "Evidence already complete",
      detail: "All required evidence anchors are present for this claim.",
      at: nowTime()
    });
    saveState();
    render();
    return;
  }
  const id = `${missingType.toUpperCase().replace(/_/g, "-")}-${Date.now().toString().slice(-5)}`;
  const issuer = missingType === "installation_photo" ? "Dealer mobile app" : "AutoChain reviewer";
  appState.claim.evidence_refs = [
    ...(appState.claim.evidence_refs || []),
    {
      type: missingType,
      id,
      issuer,
      hash: localHash(`${appState.claim.claim_id}:${missingType}:${id}`)
    }
  ];
  appState.claim.last_decision_result = "Ready";
  appState.claim.last_decision_reason = `${labelize(missingType)} attached for reviewer verification.`;
  appState.claim.updated_at = new Date().toISOString();
  appState.audit.unshift({
    type: "ok",
    title: "Evidence attached",
    detail: `${labelize(missingType)} anchored locally. No DUAL write was executed.`,
    at: nowTime()
  });
  appState.proofHistory = [
    proofCheckpoint("Evidence attached", appState.claim, appState.proof),
    ...(appState.proofHistory || [])
  ].slice(0, 8);
  saveState();
  render();
}

async function replayProof() {
  const gate = nextGate();
  if (gate.id === "closed") {
    appState.audit.unshift({
      type: "ok",
      title: "Proof replay complete",
      detail: "Final state is already recorded; no gate evaluation was required.",
      at: nowTime()
    });
    saveState();
    render();
    return;
  }
  const response = await fetch("/api/claims/evaluate", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ claim: appState.claim, gate })
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(body.error || "AutoChain proof replay failed");
  const replayProofData = body.evaluation?.proof || {};
  appState.proof = proofFromClaim(appState.claim, replayProofData);
  appState.proofHistory = [
    proofCheckpoint(`Replay: ${body.evaluation.gate.label}`, appState.claim, appState.proof),
    ...(appState.proofHistory || [])
  ].slice(0, 8);
  appState.audit.unshift({
    type: body.evaluation.allowed ? "ok" : "warn",
    title: "Read-only proof replay",
    detail: `${body.evaluation.gate.label} replay returned ${body.evaluation.result}. publicWrites=false.`,
    at: nowTime()
  });
  saveState();
  render();
}

async function copyReviewerBrief() {
  const packet = buildProofPacket();
  const brief = [
    `AutoChain reviewer brief: ${packet.claim.claim_id}`,
    `State: ${packet.claim.state}`,
    `Next gate: ${packet.next_gate}`,
    `Risk: ${packet.risk_score}`,
    `Evidence: ${packet.evidence_score}%`,
    `Decision hash: ${packet.proof.decision_hash || "pending"}`,
    `State hash: ${packet.proof.state_hash || "pending"}`,
    `Boundary: publicWrites=false; live writes are operator-gated.`
  ].join("\n");
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(brief);
  appState.audit.unshift({
    type: "ok",
    title: "Reviewer brief copied",
    detail: "Brief copied with claim state, proof hashes, risk, evidence score, and write boundary.",
    at: nowTime()
  });
  saveState();
  render();
}

function exportProofPacket() {
  const packet = buildProofPacket();
  const blob = new Blob([`${JSON.stringify(packet, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `autochain-proof-packet-${packet.claim.claim_id}.json`;
  link.click();
  URL.revokeObjectURL(url);
  appState.audit.unshift({
    type: "ok",
    title: "Proof packet exported",
    detail: `${packet.claim.claim_id} reviewer packet generated locally. No DUAL write was executed.`,
    at: nowTime()
  });
  saveState();
  render();
}

function buildProofPacket() {
  return {
    generated_at: new Date().toISOString(),
    app: "AutoChain Claim Desk",
    claim: {
      claim_id: appState.claim.claim_id,
      state: appState.claim.state,
      dealer_id: appState.claim.dealer_id,
      dealer_name: appState.claim.dealer_name,
      vin: appState.claim.vin,
      part_serial: appState.claim.part_serial,
      approved_amount_usd: appState.claim.approved_amount_usd,
      last_decision_result: appState.claim.last_decision_result,
      last_decision_reason: appState.claim.last_decision_reason
    },
    next_gate: nextGate().id,
    risk_score: riskScore(appState.claim),
    evidence_score: evidenceScore(appState.claim),
    proof: proofFromClaim(appState.claim, appState.proof),
    proof_history: appState.proofHistory || [],
    mcp_history: appState.mcpHistory || [],
    safety: {
      publicWrites: false,
      anonymousWrites: false,
      writeBoundary: "operator_gated"
    }
  };
}

function labelize(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function shortHash(value) {
  if (!value) return "pending";
  const text = String(value);
  if (text.length <= 22) return text;
  return `${text.slice(0, 12)}...${text.slice(-8)}`;
}

function localHash(input) {
  const text = String(input);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return `0x${(a + b).repeat(4).slice(0, 64)}`;
}

function setTextIfPresent(id, value) {
  const node = $(id);
  if (node) node.textContent = value;
}

$("statusButton").addEventListener("click", () => refreshStatus().catch(showError));
$("verifyButton").addEventListener("click", () => verifyNextGate().catch(showError));
$("infoButton").addEventListener("click", requestInfo);
$("blockButton").addEventListener("click", () => blockTest().catch(showError));
$("resetButton").addEventListener("click", resetDemo);
$("attachEvidenceButton").addEventListener("click", attachMissingEvidence);
$("replayProofButton").addEventListener("click", () => replayProof().catch(showError));
$("copyBriefButton").addEventListener("click", () => copyReviewerBrief().catch(showError));
$("exportProofButton").addEventListener("click", exportProofPacket);
$("headerCopyBriefButton").addEventListener("click", () => copyReviewerBrief().catch(showError));
$("headerExportProofButton").addEventListener("click", exportProofPacket);
$("reviewerModeButton").addEventListener("click", () => {
  $("proofRail").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("claimQueueList").addEventListener("click", (event) => {
  const item = event.target.closest("[data-claim-id]");
  if (item) selectClaim(item.dataset.claimId);
});

function showError(error) {
  appState.audit.unshift({
    type: "blocked",
    title: "Runtime error",
    detail: error.message,
    at: nowTime()
  });
  saveState();
  render();
}

render();
refreshStatus().then(() => refreshCurrentClaim()).catch(() => {});
