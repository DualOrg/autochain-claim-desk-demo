// railLeft.jsx - queue, DUAL readiness, reviewer walkthrough
function QueueRail({ selected, readbackReady, gateIndex }) {
  return (
    <Panel title="Claim queue" meta="1 active" bodyClass="tight">
      <button className={`queue-item ${selected ? "active" : ""}`} type="button">
        <div className="top">
          <span className="id">{CLAIM.id}</span>
          <span className="grow" />
          <Badge kind={CLAIM.state === "Approved" || CLAIM.state === "Paid" ? "approved" : "claimed"}>{CLAIM.state.replace(/_/g, " ")}</Badge>
        </div>
        <div className="meta">
          <span>Risk <b>{CLAIM.risk}</b></span>
          <span>Evidence <b>{CLAIM.evidence}%</b></span>
          <span>Exposure <b>${CLAIM.exposure.toLocaleString()}</b></span>
        </div>
        <div className="meta" style={{ color: "var(--c-faint)", fontSize: 11 }}>
          <Icon name="car" size={13} /> {CLAIM.vehicle.name}
        </div>
      </button>
    </Panel>
  );
}

function ReadinessCard({ readbackReady, status = {} }) {
  const runtime = status.runtime || "node";
  const mode = status.persistenceMode || "local";
  const objectId = status.objectId || CLAIM.dualObject;
  return (
    <Panel title="DUAL readiness" meta="local">
      <div className="ready">
        {!readbackReady && (
          <div className="scan"><i /></div>
        )}
        <div className="rows">
          <div className="r">
            <span className="k">Runtime</span>
            <span className="v">{runtime} / {mode}</span>
          </div>
          <div className="r">
            <span className="k">Readback</span>
            <span className="v">
              {readbackReady
                ? <><span className="dotok" /> Re-derived</>
                : <><span className="dotwait" /> Local seed</>}
            </span>
          </div>
          <div className="r">
            <span className="k">Writable</span>
            <span className="v"><span className="dotwait" /> Operator gated</span>
          </div>
          <div className="r">
            <span className="k">Public writes</span>
            <span className="v"><span className="dotoff" /> Disabled</span>
          </div>
          <div className="r">
            <span className="k">Object</span>
            <span className="v mono">{objectId || "local-autochain-claim-demo"}</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Walkthrough({ steps }) {
  // steps: array of 'done' | 'current' | 'todo'
  return (
    <Panel title="Reviewer walkthrough" meta="90s">
      <div className="wt">
        {WALK.map((w, i) => (
          <div key={i} className={`s ${steps[i]}`}>
            <span className="n">{steps[i] === "done" ? <Icon name="check" size={12} stroke={2.4} /> : i + 1}</span>
            <span className="ln">
              <div className="lab">{w.t}</div>
              <div style={{ fontSize: 11, color: "var(--c-faint)", marginTop: 2 }}>{w.d}</div>
            </span>
            {steps[i] === "current" && <span className="chk"><Icon name="arrowRight" size={15} /></span>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

Object.assign(window, { QueueRail, ReadinessCard, Walkthrough });
