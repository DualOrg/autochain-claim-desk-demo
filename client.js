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
  mcpHistory: []
};

let appState = loadState();

const $ = (id) => document.getElementById(id);

function loadState() {
  const demo = requestedDemoState();
  if (demo) return demo;
  const boot = bootState();
  if (boot) return boot;
  const stored = localStorage.getItem("dual-autochain-state");
  if (!stored) return clone(initialState);
  try {
    const parsed = JSON.parse(stored);
    return {
      ...clone(initialState),
      ...parsed,
      claim: { ...clone(initialState.claim), ...(parsed.claim || {}) },
      proof: { ...clone(initialState.proof), ...(parsed.proof || {}) },
      audit: Array.isArray(parsed.audit) ? parsed.audit : clone(initialState.audit),
      mcpHistory: Array.isArray(parsed.mcpHistory) ? parsed.mcpHistory : []
    };
  } catch {
    return clone(initialState);
  }
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

function saveState() {
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

  $("verifyButton").disabled = claim.state === "Paid";
  $("verifyButtonLabel").textContent = claim.state === "Paid" ? "Claim complete" : "Verify next gate";
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
  $("evidenceRows").innerHTML = appState.claim.evidence_refs.map((item) => `
    <div class="evidence-row">
      <div>
        <strong>${labelize(item.type)}</strong>
        <span>${item.issuer} / ${item.id}</span>
      </div>
      <code>${shortHash(item.hash)}</code>
    </div>
  `).join("");
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
    return;
  }
  box.className = status.writable ? "readiness ok" : "readiness";
  const missing = status.missing?.length ? ` Missing: ${status.missing.join(", ")}.` : "";
  box.innerHTML = `
    <span>Readiness</span>
    <p>${status.readbackReady ? "DUAL readback configured." : "Local deterministic proof mode."} Public writes remain disabled.${missing}</p>
  `;
  $("dualStatusChip").textContent = status.readbackReady ? "DUAL readback ready" : "Local proof";
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
  appState.claim = body.source === "dual_readback"
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
  appState.proof = {
    ...appState.proof,
    policy_hash: properties.policy_hash,
    serial_hash: properties.serial_hash,
    evidence_hash: properties.evidence_hash,
    decision_hash: properties.decision_hash,
    state_hash: properties.state_hash,
    integrity_hash: properties.integrity_hash
  };
  appState.mcpHistory = deriveMcpHistory(properties, appState.mcpHistory);
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
  appState = clone(initialState);
  localStorage.removeItem("dual-autochain-state");
  saveState();
  render();
  refreshStatus().then(() => refreshCurrentClaim()).catch(() => {});
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

$("statusButton").addEventListener("click", () => refreshStatus().catch(showError));
$("verifyButton").addEventListener("click", () => verifyNextGate().catch(showError));
$("infoButton").addEventListener("click", requestInfo);
$("blockButton").addEventListener("click", () => blockTest().catch(showError));
$("resetButton").addEventListener("click", resetDemo);

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
