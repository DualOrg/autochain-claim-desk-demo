// proofRail.jsx - proof object, export, write boundary, event trace
function ProofObject({ contentHash }) {
  return (
    <Panel title="DUAL object" meta="re-derived">
      <div className="proofobj">
        <div className="objbox">
          <span className="k">Object id</span>
          <span className="h">{CLAIM.dualObject}</span>
        </div>
        <div className="rail-line">
          <span className="k">Identity hash</span>
          <span className="v mono" style={{ color: "var(--accent-strong)" }}>{shortHash(CLAIM.objectHash)}</span>
        </div>
        <div className="rail-line">
          <span className="k">Record scope</span>
          <span className="v">warranty-claim</span>
        </div>
        <div className="rail-line">
          <span className="k">Proof rail</span>
          <span className="v"><span className="dotok" /> Re-derived</span>
        </div>
        <div className="rail-line">
          <span className="k">Content hash</span>
          <span className="v mono" style={{ color: contentHash ? "var(--pos)" : "var(--c-faint)" }}>
            {contentHash ? shortHash(contentHash) : "pending"}
          </span>
        </div>
      </div>
    </Panel>
  );
}

function ProofActions({ onReplay, onExport, onCopy, working, exported }) {
  return (
    <Panel title="Proof packet" meta="in-browser">
      <div className="stack-sm">
        <p style={{ margin: 0, fontSize: 12, color: "var(--c-muted)", lineHeight: 1.5 }}>
          The reviewer packet is generated locally and never writes to DUAL. Replay re-derives every gate from
          the state machine and anchored evidence.
        </p>
        <Btn variant="primary" className="block" icon="replay" onClick={onReplay} disabled={working}
          style={{ width: "100%" }}>
          {working ? "Replaying..." : "Replay proof read-only"}
        </Btn>
        <Btn variant="dark" icon="download" onClick={onExport} style={{ width: "100%" }}>
          {exported ? "Re-export proof packet" : "Export proof packet"}
        </Btn>
        <Btn variant="ghost" icon="copy" onClick={onCopy} style={{ width: "100%" }}>Copy reviewer brief</Btn>
      </div>
    </Panel>
  );
}

function PublicVerifier({ publicProof }) {
  const verifier = publicProof?.verifier || {};
  const status = verifier.status || (CLAIM.dualStatus?.readbackReady ? "verified" : "local_unverified");
  const hash = verifier.content_hash || "";
  return (
    <Panel title="Public verifier" meta={status.replace(/_/g, "-")}>
      <div className="stack-sm">
        <p className="verifier-copy">
          Claim identity, DUAL readback state, vehicle records, trust score, and proof hashes are available without
          exposing a public write path.
        </p>
        <a className="btn ghost block" href={`/proof/${CLAIM.id}`} style={{ width: "100%" }}>
          Open proof page
          <Icon name="arrowRight" size={14} />
        </a>
        <div className="rail-line">
          <span className="k">Link hash</span>
          <span className="v mono">{hash ? shortHash(hash) : "pending"}</span>
        </div>
      </div>
    </Panel>
  );
}

function WriteBoundary() {
  return (
    <div className="panel">
      <div className="panel-b">
        <div className="boundary">
          <div className="bh">
            <span className="ic"><Icon name="shieldOff" size={16} /></span>
            <span className="t">Public payment writes
              <small>Operator gated / disabled</small>
            </span>
          </div>
          <p className="desc">
            The demo exports proof locally. Live payment release stays behind the operator token boundary -
            nothing in this session can write to the public ledger.
          </p>
          <div className="toggle">
            <span className="lab">publicWrites</span>
            <span className="row" style={{ gap: 8 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--neg)" }}>false</span>
              <span className="sw" title="Operator gated"><i /></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventTrace({ events, onReset }) {
  return (
    <Panel title="Event trace" meta={`${events.length} ${events.length === 1 ? "event" : "events"}`}
      action={<button className="iconbtn" onClick={onReset} title="Reset demo" style={{ marginLeft: "auto", width: 28, height: 28 }}><Icon name="refresh" size={14} /></button>}>
      {events.length === 0
        ? <div className="trace"><div className="empty">No proof activity yet. Replay a gate or export the packet to populate the trace.</div></div>
        : (
          <div className="trace">
            {events.map((e, i) => (
              <div key={i} className={`e ${e.kind || ""}`}>
                <span className="gd"><b /></span>
                <span className="tl">{e.time}</span>
                <span className="bd">
                  <span className="m">{e.msg}</span>
                  {e.detail && <span className="d">{e.detail}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
    </Panel>
  );
}

Object.assign(window, { ProofObject, ProofActions, PublicVerifier, WriteBoundary, EventTrace });
