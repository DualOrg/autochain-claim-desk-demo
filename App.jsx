// App.jsx - AutoChain Claim Console
const THEME = {
  theme: "light",
  layout: "console",
  density: "regular",
  accent: "#2094A2",
  illustrations: true,
  headline: "serif"
};

function nowStamp() {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

function normalizeHash(value) {
  if (!value) return "pending";
  const str = String(value);
  if (str.startsWith("0x")) return `sha256:${str.slice(2, 10)}...${str.slice(-4)}`;
  return shortHash(str);
}

function currency(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function readBoot() {
  if (window.__AUTOCHAIN_BOOT__) return window.__AUTOCHAIN_BOOT__;
  const node = document.getElementById("autochain-boot");
  if (!node?.textContent) return {};
  try {
    return JSON.parse(node.textContent);
  } catch {
    return {};
  }
}

function gateIndexForState(state) {
  const normalized = String(state || "").toLowerCase();
  if (normalized === "paid") return 4;
  if (normalized === "approved") return 4;
  if (normalized === "coverage_checked") return 3;
  if (normalized === "part_verified") return 2;
  return 1;
}

function buildClaimProfile(claim = {}, status = {}, publicProof = null) {
  const refs = Array.isArray(claim.evidence_refs) ? claim.evidence_refs : [];
  const evidenceCount = refs.length || 0;
  const evidencePct = Math.min(100, Math.round((evidenceCount / 4) * 100));
  const approvedAmount = Number(claim.approved_amount_usd || claim.claim_amount_usd || CLAIM.exposure);
  const duplicate = Boolean(claim.duplicate_claim) || claim.serial_status === "duplicate";
  const risk = duplicate ? 88 : evidencePct < 100 ? 34 : 12;
  const proof = publicProof || CLAIM.publicProof || null;
  const identity = proof?.vehicle_identity || null;

  return {
    id: claim.claim_id || CLAIM.id,
    network: "OEM dealer warranty",
    template: status.templateName || CLAIM.template,
    dualObject: status.objectId || identity?.dual_object_id || CLAIM.dualObject,
    objectHash: claim.integrity_hash || claim.state_hash || proof?.verifier?.content_hash || CLAIM.objectHash,
    state: claim.state || CLAIM.state,
    queuePos: "1 of 1",
    risk,
    evidence: evidencePct || CLAIM.evidence,
    exposure: approvedAmount || CLAIM.exposure,
    deductible: Number(claim.deductible_usd || CLAIM.deductible),
    whoCares: "OEM warranty teams",
    whoCaresSub: "Stops duplicate part reimbursement while preserving a dealer-friendly review path.",
    vehicle: {
      name: claim.vehicle || CLAIM.vehicle.name,
      vin: claim.vin || CLAIM.vehicle.vin,
      odo: `${Number(claim.odometer_km || 0).toLocaleString("en-US")} km`
    },
    dealer: {
      name: claim.dealer_name || CLAIM.dealer.name,
      id: claim.dealer_id || CLAIM.dealer.id
    },
    part: {
      name: claim.part_name || CLAIM.part.name,
      serial: claim.part_serial || CLAIM.part.serial
    },
    warranty: {
      version: `v${claim.policy_version || 1}`,
      coverage: "48 months / 100,000 km",
      ceiling: "$2,500",
      rule: "VIN + serial single reimbursement"
    },
    evidencePack: refs.length
      ? refs.map((item) => ({
          name: item.type ? item.type.replace(/_/g, " ") : item.id || "Evidence reference",
          hash: normalizeHash(item.hash),
          kind: item.type === "oem_serial_signature" ? "cpu" : item.type === "installation_photo" ? "file" : "doc"
        }))
      : CLAIM.evidencePack,
    raw: claim,
    publicProof: proof,
    dualStatus: status
  };
}

function applyClaimProfile(profile) {
  Object.assign(CLAIM, {
    ...profile,
    vehicle: { ...CLAIM.vehicle, ...profile.vehicle },
    dealer: { ...CLAIM.dealer, ...profile.dealer },
    part: { ...CLAIM.part, ...profile.part },
    warranty: { ...CLAIM.warranty, ...profile.warranty },
    evidencePack: profile.evidencePack || CLAIM.evidencePack
  });
}

async function fetchJson(path, options) {
  const response = await fetch(path, {
    ...options,
    headers: { accept: "application/json", ...(options?.headers || {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error || `${path} returned ${response.status}`);
  return body;
}

function initialBootProfile() {
  const boot = readBoot();
  const status = boot.dualStatus || {};
  const claim = boot.claim || CLAIM.raw || {};
  const profile = buildClaimProfile(claim, status, null);
  applyClaimProfile(profile);
  return {
    status,
    claim,
    publicProof: null,
    loaded: Boolean(claim.claim_id || status.app)
  };
}

function WarrantyTerms() {
  const w = CLAIM.warranty;
  return (
    <Panel title="Warranty terms" meta={w.version}>
      <div className="dl">
        <div className="r"><span className="k">Coverage</span><span className="v">{w.coverage}</span></div>
        <div className="r"><span className="k">Odometer</span><span className="v">{CLAIM.vehicle.odo}</span></div>
        <div className="r"><span className="k">Claim ceiling</span><span className="v">{w.ceiling}</span></div>
        <div className="r"><span className="k">Duplicate rule</span><span className="v">{w.rule}</span></div>
      </div>
    </Panel>
  );
}

function DemoDisclosure({ status }) {
  const mode = status?.readbackReady ? "live DUAL readback" : "local deterministic proof";
  return (
    <section className="disclosure" aria-label="Demo disclosure">
      <strong>Synthetic claim, {mode}.</strong>
      <span>Dealer, vehicle, and evidence details are demo data. The review surface is the DUAL readback/proof packet, public verifier route, and operator-gated write boundary.</span>
      <a href="/proof/AC-OEM-2026-0007">Public verifier</a>
    </section>
  );
}

function App() {
  const boot = useRef(null);
  if (!boot.current) boot.current = initialBootProfile();
  const [status, setStatus] = useState(boot.current.status);
  const [publicProof, setPublicProof] = useState(boot.current.publicProof);
  const [proofLoaded, setProofLoaded] = useState(boot.current.loaded);
  const [gateIndex, setGateIndex] = useState(gateIndexForState(CLAIM.state));
  const [working, setWorking] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [exported, setExported] = useState(false);
  const [contentHash, setContentHash] = useState(null);
  const [events, setEvents] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [renderTick, setRenderTick] = useState(0);

  const addEvent = useCallback((msg, detail, kind) => {
    setEvents((ev) => [{ time: nowStamp(), msg, detail, kind }, ...ev].slice(0, 24));
  }, []);

  const toast = useCallback((msg) => {
    const id = Math.random();
    setToasts((ts) => [...ts, { id, msg }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const [current, proof] = await Promise.all([
          fetchJson("/api/claims/current"),
          fetchJson("/api/proof/public")
        ]);
        if (cancelled) return;
        const currentStatus = current.status || current.dualStatus || {
          ...(status || {}),
          orgId: current.orgId || proof?.dual?.org_id || status?.orgId,
          templateName: current.templateName || status?.templateName,
          templateId: current.templateId || proof?.dual?.template_id || status?.templateId,
          objectId: current.objectId || proof?.dual?.object_id || status?.objectId,
          readbackReady: current.source === "dual_readback" || proof?.dual?.readback_ready === true,
          publicWrites: false
        };
        const currentClaim = current.properties || current.claim || CLAIM.raw || {};
        const profile = buildClaimProfile(currentClaim, currentStatus, proof);
        applyClaimProfile(profile);
        setStatus(currentStatus);
        setPublicProof(proof);
        setContentHash(proof?.verifier?.content_hash || null);
        setGateIndex(gateIndexForState(profile.state));
        setProofLoaded(true);
        setRenderTick((n) => n + 1);
        addEvent(
          currentStatus.readbackReady ? "DUAL readback re-derived" : "Local proof loaded",
          `${profile.id} / publicWrites=false`,
          currentStatus.readbackReady ? "ok" : "warn"
        );
      } catch (error) {
        if (cancelled) return;
        addEvent("Proof readback failed", error.message, "warn");
        toast("Proof readback failed");
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [addEvent, toast]);

  const verifyGate = async () => {
    const currentGate = GATES[gateIndex];
    if (working || !currentGate || currentGate.key === "paid") return;
    setWorking(true);
    try {
      const payload = await fetchJson("/api/claims/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claim: CLAIM.raw || {},
          gate: { id: currentGate.key }
        })
      });
      const evaluation = payload.evaluation || {};
      if (evaluation.proof?.decision_hash) setContentHash(evaluation.proof.decision_hash);
      if (evaluation.allowed !== false) setGateIndex((g) => Math.min(g + 1, GATES.length - 1));
      addEvent(
        `Gate replayed read-only: ${currentGate.title}`,
        `${evaluation.result || "Evaluated"} - ${evaluation.reason || "state machine proof returned"}; no write`,
        evaluation.result === "Blocked" ? "warn" : "ok"
      );
      toast(`${currentGate.title} re-derived`);
    } catch (error) {
      addEvent("Gate replay failed", error.message, "warn");
      toast("Gate replay failed");
    } finally {
      setWorking(false);
    }
  };

  const replayProof = async () => {
    if (working) return;
    setWorking(true);
    try {
      const proof = await fetchJson("/api/proof/public");
      setPublicProof(proof);
      applyClaimProfile(buildClaimProfile(proof.claim || CLAIM.raw || {}, status || {}, proof));
      const hash = proof?.verifier?.content_hash || CLAIM.objectHash;
      setContentHash(hash);
      setReplayed(true);
      setRenderTick((n) => n + 1);
      addEvent("Proof replayed read-only", `${shortHash(hash)} / publicWrites=false`, "ok");
      toast("Proof re-derived - no DUAL write");
    } catch (error) {
      addEvent("Proof replay failed", error.message, "warn");
      toast("Proof replay failed");
    } finally {
      setWorking(false);
    }
  };

  const exportPacket = () => {
    const hash = contentHash || publicProof?.verifier?.content_hash || CLAIM.objectHash;
    setContentHash(hash);
    const packet = {
      template: CLAIM.template,
      claim: CLAIM.id,
      network: CLAIM.network,
      state: CLAIM.state,
      nextGate: (GATES[gateIndex] || {}).title,
      dualObject: CLAIM.dualObject,
      contentHash: hash,
      risk: CLAIM.risk,
      evidence: `${CLAIM.evidence}%`,
      exposure: `$${currency(CLAIM.exposure)}`,
      vehicle: CLAIM.vehicle,
      dealer: CLAIM.dealer,
      part: CLAIM.part,
      publicVerifier: `/proof/${CLAIM.id}`,
      publicProof,
      status,
      publicWrites: false,
      generatedAt: new Date().toISOString()
    };
    try {
      const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${CLAIM.id}-proof.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Browser download may be blocked in embedded review contexts.
    }
    setExported(true);
    addEvent("Proof packet exported", `${CLAIM.id}-proof.json / publicWrites=false`, "ok");
    toast("Proof packet exported locally");
  };

  const copyBrief = () => {
    const brief = [
      `AutoChain reviewer brief - ${CLAIM.id}`,
      `State: ${CLAIM.state}   Next gate: ${(GATES[gateIndex] || {}).title}`,
      `Risk: ${CLAIM.risk}/100   Evidence: ${CLAIM.evidence}%   Exposure: $${currency(CLAIM.exposure)}`,
      `DUAL object: ${CLAIM.dualObject}`,
      `Content hash: ${contentHash || publicProof?.verifier?.content_hash || "pending"}`,
      `Vehicle: ${CLAIM.vehicle.name} (${CLAIM.vehicle.vin})`,
      `Dealer: ${CLAIM.dealer.name} (${CLAIM.dealer.id})`,
      `Part: ${CLAIM.part.name} (${CLAIM.part.serial})`,
      "Public writes: disabled (operator gated)"
    ].join("\n");
    try { navigator.clipboard.writeText(brief); } catch {}
    addEvent("Reviewer brief copied", "state, gate, risk, evidence, hashes", "");
    toast("Reviewer brief copied");
  };

  const resetDemo = () => {
    setGateIndex(gateIndexForState(CLAIM.state));
    setReplayed(false);
    setExported(false);
    setContentHash(publicProof?.verifier?.content_hash || null);
    setEvents([]);
    addEvent("Demo reset", "gate chain restored to current readback state", "warn");
    toast("Demo reset");
  };

  const done = [proofLoaded, proofLoaded, replayed, exported];
  const firstTodo = done.findIndex((d) => !d);
  const steps = done.map((d, i) => d ? "done" : (i === firstTodo ? "current" : "todo"));

  const accentStyle = {
    "--accent": THEME.accent,
    "--accent-strong": "#1A7A86",
    "--accent-soft": "rgba(32,148,162,0.15)",
    "--accent-line": "rgba(32,148,162,0.30)",
    "--accent-glow": "rgba(32,148,162,0.20)",
    "--accent-glow2": "rgba(32,148,162,0.06)"
  };

  return (
    <div className="console"
      data-theme={THEME.theme}
      data-layout={THEME.layout}
      data-density={THEME.density}
      data-illos={THEME.illustrations ? "on" : "off"}
      data-headline={THEME.headline}
      data-render={renderTick}
      style={accentStyle}>

      <header className="topbar">
        <a className="brand" href="/" aria-label="DUAL AutoChain Claim Console">
          <DualMark size={30} />
          <div className="lock">
            <span className="wm"><b>DUAL</b>&nbsp;AutoChain</span>
            <span className="sub">Claim Console</span>
          </div>
        </a>

        <div className="env">
          <span className={`dot ${proofLoaded ? "live" : ""}`} />
          {status?.readbackReady ? "DUAL readback ready" : "Local proof - read-only"}
        </div>

        <span className="spacer" />

        <div className="acts">
          <a className="btn ghost sm" href="/docs/autochain-demo-playbook.md"><Icon name="reviewer" size={14} />Reviewer mode</a>
          <Btn variant="ghost" size="sm" icon="copy" onClick={copyBrief}>Brief</Btn>
          <Btn variant="dark" size="sm" icon="download" onClick={exportPacket}>Export proof</Btn>
        </div>
        <span className="bpill"><Icon name="shieldOff" size={13} /> Writes off</span>
      </header>

      <DemoDisclosure status={status} />

      <main className="workspace">
        <div className="col rail-queue">
          <QueueRail selected readbackReady={Boolean(status?.readbackReady)} gateIndex={gateIndex} />
          <ReadinessCard readbackReady={Boolean(status?.readbackReady)} status={status} />
          <Walkthrough steps={steps} />
        </div>

        <div className="col center">
          <ClaimHeader illos={THEME.illustrations} />
          <GateChain gateIndex={gateIndex} onVerify={verifyGate} onReplay={replayProof} working={working} />
          <div className="grid3">
            <IdentityCard icon="car" label="Vehicle identity" name={CLAIM.vehicle.name} subLabel="VIN" sub={CLAIM.vehicle.vin} />
            <IdentityCard icon="building" label="Dealer" name={CLAIM.dealer.name} subLabel="ID" sub={CLAIM.dealer.id} />
            <IdentityCard icon="cpu" label="Part" name={CLAIM.part.name} subLabel="Serial" sub={CLAIM.part.serial} />
          </div>
          <div className="grid2">
            <EvidenceVault onAnchor={() => toast("Evidence anchor verified")} />
            <WarrantyTerms />
          </div>
        </div>

        <div className="col rail-proof">
          <ProofObject contentHash={contentHash} />
          <ProofActions onReplay={replayProof} onExport={exportPacket} onCopy={copyBrief}
            working={working} exported={exported} />
          <PublicVerifier publicProof={publicProof} />
          <WriteBoundary />
          <EventTrace events={events} onReset={resetDemo} />
        </div>
      </main>

      <div className="toasts">
        {toasts.map((x) => (
          <div key={x.id} className="toast"><Icon name="checkCircle" size={16} />{x.msg}</div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
