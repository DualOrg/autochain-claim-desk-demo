// core.jsx - icons, claim data, and small UI primitives. Exports to window.
const { useState, useEffect, useRef, useCallback } = React;

/* ============================ ICONS (line, 1.6 stroke) ===================== */
const PATHS = {
  check: "M20 6 9 17l-5-5",
  checkCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4 12 14.01l-3-3",
  chevronRight: "M9 18l6-6-6-6",
  chevronDown: "M6 9l6 6 6-6",
  copy: "M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z|M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3",
  replay: "M3 12a9 9 0 1 0 3-6.7L3 8|M3 3v5h5",
  search: "M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0|M21 21l-4.3-4.3",
  car: "M5 17H3v-5l2-5h11l3 5v5h-2|M5 17a2 2 0 1 0 4 0|M15 17a2 2 0 1 0 4 0|M5 12h14",
  building: "M3 21h18|M5 21V7l7-4 7 4v14|M9 9h.01|M9 13h.01|M9 17h.01|M15 9h.01|M15 13h.01",
  cpu: "M9 3v3|M15 3v3|M9 18v3|M15 18v3|M3 9h3|M3 15h3|M18 9h3|M18 15h3|M6 6h12v12H6z|M10 10h4v4h-4z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M9 13h6|M9 17h4",
  fingerprint: "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4|M14 13.12c0 2.38 0 6.38-1 8.88|M17.29 21.02c.12-.6.43-2.3.5-3.02|M2 12a10 10 0 0 1 18-6|M2 16h.01|M21.8 16c.2-2 .131-5.354 0-6|M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2|M8.65 22c.21-.66.45-1.32.57-2|M9 6.8a6 6 0 0 1 9 5.2v2",
  gauge: "M12 14l4-4|M3.34 19a10 10 0 1 1 17.32 0",
  clock: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0|M12 7v5l3 2",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01",
  arrowRight: "M5 12h14|M13 5l7 7-7 7",
  hash: "M4 9h16|M4 15h16|M10 3L8 21|M16 3l-2 18",
  shieldOff: "M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18|M4.73 4.73 4 5v7c0 6 8 10 8 10a20.3 20.3 0 0 0 5.62-4.38|M2 2l20 20",
  shieldCheck: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4",
  lock: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z|M7 11V7a5 5 0 0 1 10 0v4",
  layers: "M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5|M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5",
  zap: "M13 2 3 14h9l-1 8 10-12h-9z",
  x: "M18 6 6 18|M6 6l12 12",
  info: "M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0|M12 16v-4|M12 8h.01",
  refresh: "M3 2v6h6|M21 12A9 9 0 0 0 6 5.3L3 8|M21 22v-6h-6|M3 12a9 9 0 0 0 15 6.7l3-2.7",
  reviewer: "M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0|M6 21v-1a6 6 0 0 1 12 0v1|M16 3.13a4 4 0 0 1 0 7.75",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6",
  vin: "M3 7h18v10H3z|M7 7v10|M11 7v10|M15 7v10",
  scale: "M12 3v18|M7 7l-4 7h8z|M17 7l-4 7h8z|M5 21h14",
  package: "M12 2 3 7v10l9 5 9-5V7z|M3 7l9 5 9-5|M12 12v10",
  flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z|M4 22v-7",
};
function Icon({ name, size = 16, stroke = 1.7, style, className }) {
  const d = PATHS[name] || PATHS.info;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} aria-hidden="true">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

/* ============================ CLAIM DATA =================================== */
const CLAIM = {
  id: "AC-OEM-2026-0007",
  network: "OEM dealer warranty",
  template: "io.dual.autochain_claim.demo.v1",
  dualObject: "local-autochain-claim-demo",
  objectHash: "6a16d6a8b41e09c7f2a3d5e8b9c01f6cdb2",
  state: "Claimed",
  queuePos: "1 of 1",
  risk: 12,
  evidence: 100,
  exposure: 1189,
  deductible: 95,
  whoCares: "OEM warranty teams",
  whoCaresSub: "Stops duplicate part reimbursement while preserving a dealer-friendly review path.",
  vehicle: { name: "2024 Audi Q5 45 TFSI", vin: "WAUZZZGE7NB009184", odo: "64,220 km" },
  dealer: { name: "North Shore Autohaus", id: "DLR-NSW-042" },
  part: { name: "48V inverter module", serial: "BOSCHINV-48V-AU-009184" },
  warranty: { version: "v1", coverage: "48 months / 100,000 km", ceiling: "$2,500", rule: "VIN + serial single reimbursement" },
  evidencePack: [
    { name: "Dealer repair order", hash: "sha256:0d2f...661c", kind: "doc" },
    { name: "OEM serial signature", hash: "sha256:3adf...aef2", kind: "cpu" },
    { name: "Diagnostic scan", hash: "sha256:4424...2eaa", kind: "vin" },
    { name: "Installation photo", hash: "sha256:632c...055f", kind: "shieldCheck" },
  ],
  raw: null,
  publicProof: null,
  dualStatus: null
};

// Gate index is the current gate to act on. The final payment gate remains locked
// unless an operator-authorized write is performed outside the public UI.
const GATES = [
  { key: "readback", title: "DUAL readback", stage: "Anchored", icon: "layers" },
  { key: "part_verified", title: "Verify serial hash", stage: "Next gate", icon: "fingerprint",
    desc: "Validate OEM signature, part serial, VIN binding, and recall status." },
  { key: "coverage_checked", title: "Coverage checked", stage: "Policy gate", icon: "scale",
    desc: "Validate mileage, dealer authority, duplicate claim status, and active warranty terms." },
  { key: "approved", title: "Approve reimbursement", stage: "Decision hash", icon: "checkCircle",
    desc: "Approve the net reimbursement and lock the claim decision hash." },
  { key: "paid", title: "Mark paid", stage: "Operator gated", icon: "lock",
    desc: "Payment release requires an approved claim and a complete evidence pack." },
];

const WALK = [
  { t: "DUAL readiness", d: "Confirm local DUAL boundary" },
  { t: "Open canonical claim", d: "Select the approved claim" },
  { t: "Replay proof gate", d: "Re-derive read-only" },
  { t: "Export proof packet", d: "Reviewer JSON, no write" },
];

/* ============================ PRIMITIVES =================================== */
function Badge({ kind = "neutral", children, dot = true }) {
  return <span className={`badge ${kind}`}>{dot && <span className="d" />}{children}</span>;
}

function Btn({ variant = "ghost", size, icon, iconRight, children, className = "", ...rest }) {
  return (
    <button className={`btn ${variant} ${size || ""} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}

function DualMark({ size = 30 }) {
  return (
    <svg width={size} height={size * 30 / 34} viewBox="0 0 34 30" fill="none" className="mark" aria-label="DUAL">
      <path d="M23.1828 20.8003C28.9236 20.8003 33.5788 16.1433 33.5788 10.4002C33.5788 4.657 28.9236 0 23.1828 0H12.7866V1.64966C16.2657 2.05843 18.9654 5.01906 18.9654 8.60744V20.8003H23.1828Z" fill="var(--accent)" />
      <path d="M10.3961 8.87939C4.65518 8.87939 0 13.5364 0 19.2796C0 25.0227 4.65518 29.6798 10.3961 29.6798H20.7922V28.0301C17.3131 27.6213 14.6135 24.6606 14.6135 21.0723V8.87939H10.3961Z" fill="var(--accent)" />
    </svg>
  );
}

function Panel({ title, meta, action, children, flush, bodyClass = "" }) {
  return (
    <section className={`panel ${flush ? "flush" : ""}`}>
      {title && (
        <div className="panel-h">
          <span className="t">{title}</span>
          {meta && <span className="x">{meta}</span>}
          {action}
        </div>
      )}
      <div className={`panel-b ${bodyClass}`}>{children}</div>
    </section>
  );
}

function shortHash(h) { return h && h.length > 14 ? h.slice(0, 8) + "..." + h.slice(-4) : (h || "pending"); }

Object.assign(window, { Icon, Badge, Btn, Panel, DualMark, CLAIM, GATES, WALK, shortHash,
  useState, useEffect, useRef, useCallback });
