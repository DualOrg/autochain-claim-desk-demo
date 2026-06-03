// center.jsx - selected claim detail surface
function ClaimHeader({ illos }) {
  return (
    <section className="panel flush" style={{ position: "relative", overflow: "hidden" }}>
      {illos && (
        <img className="illo" src="/assets/illustrations/certificate.png" alt=""
          style={{ width: 168, right: -18, top: -22 }} />
      )}
      <div className="claimhead">
        <div className="top">
          <div className="idblock">
            <div className="crumb">
              <span>{CLAIM.network}</span>
              <span className="sep">/</span>
              <span className="mono">{CLAIM.template}</span>
            </div>
            <h1 className="serif">{CLAIM.id}</h1>
            <div className="badges">
              <Badge kind={CLAIM.state === "Approved" || CLAIM.state === "Paid" ? "approved" : "claimed"}>
                State / {CLAIM.state.replace(/_/g, " ")}
              </Badge>
              <Badge kind="claimed" dot={false}>Queue {CLAIM.queuePos}</Badge>
              <Badge kind="neutral" dot={false}>{CLAIM.whoCares}</Badge>
            </div>
            <p className="who">{CLAIM.whoCaresSub}</p>
          </div>
        </div>
        <div className="kpis">
          <div className="kpi risk">
            <span className="k">Risk score</span>
            <span className="v">{CLAIM.risk}<small>/ 100</small></span>
            <span className="bar"><i style={{ width: CLAIM.risk + "%", background: "var(--pos)" }} /></span>
          </div>
          <div className="kpi">
            <span className="k">Evidence</span>
            <span className="v">{CLAIM.evidence}<small>%</small></span>
            <span className="bar"><i style={{ width: CLAIM.evidence + "%" }} /></span>
          </div>
          <div className="kpi">
            <span className="k">Exposure</span>
            <span className="v">${CLAIM.exposure.toLocaleString()}</span>
            <span style={{ fontSize: 11, color: "var(--c-faint)" }}>${CLAIM.deductible} deductible</span>
          </div>
          <div className="kpi">
            <span className="k">Claim ceiling</span>
            <span className="v">{CLAIM.warranty.ceiling}</span>
            <span style={{ fontSize: 11, color: "var(--c-faint)" }}>per VIN + serial</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function GateChain({ gateIndex, onVerify, onReplay, working }) {
  const current = GATES[gateIndex] || GATES[GATES.length - 1];
  const locked = current.key === "paid";
  return (
    <Panel title="Gate chain" meta={`${gateIndex} of ${GATES.length - 1} cleared`}
      action={<span className="badge claimed" style={{ marginLeft: "auto" }}><Icon name="link" size={11} /> Re-derived</span>}>
      <div className="gatechain">
        {GATES.map((g, i) => {
          const cls = i < gateIndex ? "done" : i === gateIndex ? "current" : (g.key === "pay" ? "locked" : "");
          return (
            <div key={g.key} className={`gate ${cls}`}>
              <div className="gi">
                <span className="ring">
                  {i < gateIndex ? <Icon name="check" size={12} stroke={2.4} />
                    : g.key === "paid" ? <Icon name="lock" size={12} />
                    : <Icon name={g.icon} size={12} />}
                </span>
                <span className="gs">{i < gateIndex ? "Cleared" : g.stage}</span>
              </div>
              <div className="gt">{g.title}</div>
            </div>
          );
        })}
      </div>

      <div className="between" style={{ marginTop: 14, padding: "14px 4px 2px", borderTop: "1px solid var(--c-border-soft)", alignItems: "flex-start" }}>
        <div style={{ maxWidth: "60%" }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {locked ? "Payment control" : "Next gate"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", marginBottom: 4 }}>
            {locked ? "Locked until payout authorization" : current.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--c-muted)", lineHeight: 1.5 }}>
            {current.desc || "Re-derived from the state machine and anchored evidence."}
          </div>
        </div>
        <div className="row" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Btn variant="ghost" size="sm" icon="replay" onClick={onReplay} disabled={working}>Replay proof</Btn>
          {locked
            ? <Btn variant="ghost" size="sm" icon="lock" disabled>Operator gated</Btn>
            : <Btn variant="primary" size="sm" icon="checkCircle" onClick={onVerify} disabled={working}>
                {working ? "Re-deriving..." : "Verify next gate"}
              </Btn>}
        </div>
      </div>
    </Panel>
  );
}

function IdentityCard({ icon, label, name, sub, subLabel, mono }) {
  return (
    <Panel>
      <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
        <span className="ev-ic" style={{ width: 34, height: 34, borderRadius: 9, flex: "none",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "var(--accent-soft)", color: "var(--accent-strong)" }}>
          <Icon name={icon} size={17} />
        </span>
        <div className="field" style={{ flex: 1, minWidth: 0 }}>
          <span className="k">{label}</span>
          <span className="v">{name}</span>
          <span className="sub">{subLabel ? subLabel + " / " : ""}{sub}</span>
        </div>
      </div>
    </Panel>
  );
}

function EvidenceRow({ e, onClick }) {
  return (
    <div className="row" onClick={onClick}>
      <span className="ic"><Icon name={e.kind} size={15} /></span>
      <div className="mid">
        <span className="nm">{e.name}</span>
        <span className="hs">{e.hash}</span>
      </div>
      <span className="anchored"><Icon name="check" size={12} stroke={2.4} /> Anchored</span>
    </div>
  );
}

function EvidenceVault({ onAnchor }) {
  return (
    <Panel title="Evidence vault" meta="4 anchors / 100%"
      action={<span className="badge approved" style={{ marginLeft: "auto" }}><Icon name="shieldCheck" size={11} /> Anchored</span>}
      bodyClass="tight">
      <div className="ev">
        {CLAIM.evidencePack.map((e, i) => (
          <EvidenceRow key={i} e={e} onClick={onAnchor} />
        ))}
      </div>
    </Panel>
  );
}

Object.assign(window, { ClaimHeader, GateChain, IdentityCard, EvidenceVault });
