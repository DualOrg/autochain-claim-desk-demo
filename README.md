# AutoChain Claim Desk

DUAL-backed demo for the AutoChain idea from the 30-concept library.

The demo shows an OEM warranty administrator validating one dealer claim for a Bosch powertrain-electrical part:

- claim state machine: `Claimed -> Part_Verified -> Coverage_Checked -> Approved -> Paid`;
- OEM serial signature and VIN/part binding checks;
- warranty coverage, mileage, dealer authority, duplicate-claim, and claim-ceiling checks;
- DUAL-style policy, serial, evidence, decision, state, and integrity hashes;
- blocked duplicate-claim path;
- safe public read/evaluate API endpoints with `publicWrites=false`;
- live DUAL readback from the canonical claim object;
- operator-gated sync/mint endpoints and MCP write tools that execute event-bus writes only when live-write env and `DEMO_OPERATOR_TOKEN` are configured.
- reviewer-grade claim queue with SLA, priority, risk, evidence completeness, and exposure summaries;
- evidence review controls, payment-release readiness checks, replayable proof checkpoints, reviewer brief copy, and proof-packet export.
- TradeFlow-standard reviewer onboarding: sticky metadata bar, synthetic/live-proof disclosure, 60-90 second walkthrough, demo script, support panel, compact DUAL readiness cards, and proof rail copy that keeps the public-write boundary visible.

Production target:

```text
https://autochain-eight.vercel.app
```

## Run Locally

```text
npm run start
```

Open:

```text
http://127.0.0.1:4177
```

Prepared state:

```text
http://127.0.0.1:4177/?demo=coverage
```

## API Surface

Safe public endpoints:

- `GET /api/dual/status`
- `GET /api/claims/current`
- `POST /api/claims/evaluate`

Operator-gated live endpoints:

- `POST /api/claims/sync`
- `POST /api/claims/mint`

The public app does not write to DUAL. The sync/mint endpoints reject missing or wrong operator tokens, require `DUAL_WRITE_MODE=event_bus`, require a positive IanTest org balance, and keep the DUAL API key server-side.

## MCP Surface

MCP JSON-RPC endpoint:

- `POST /mcp`
- `POST /api/mcp`

Public read/evaluate tools:

- `autochain_dual_get_status`
- `autochain_dual_get_claim`
- `autochain_dual_evaluate_gate`
- `autochain_dual_prepare_sync_payload`
- `autochain_dual_prepare_mint_payload`

Operator-gated live write tools:

- `autochain_dual_sync_claim`
- `autochain_dual_advance_gate`
- `autochain_dual_mint_claim`

Write tools require `operator_token` in the tool arguments or a bearer/operator header matching `DEMO_OPERATOR_TOKEN`. They still require `DUAL_WRITE_MODE=event_bus`, server-side `DUAL_API_KEY`, configured template/object ids as needed, and a positive IanTest org balance. The MCP landing and read tools are public; they never return the DUAL API key or the expected operator token.

Agent harness:

```text
npm run agent:harness
```

Standalone AutoChain proof:

```text
npm run proof:chain
```

`proof:chain` is AutoChain-only. It initializes the AutoChain MCP server, reads the live DUAL-backed claim, confirms the standalone demo target `Approved -> paid`, evaluates the next gate read-only, previews sync and mint payloads without executing them, verifies write tools are operator-gated, and writes JSON and Markdown artifacts under `outputs/`.

Optional cross-demo Kraken integration proof:

```text
npm run proof:kraken:fresh
```

This is not part of the standalone AutoChain product path. It exists only to prove that another demo can consume the AutoChain MCP decision hash. It executes one Kraken paper trade and may sync a Kraken DUAL receipt, while keeping AutoChain read-only.

Operator-gated harness modes:

```text
AUTOCHAIN_OPERATOR_TOKEN=[REDACTED] AUTOCHAIN_WRITE_ACTION=sync npm run agent:harness
AUTOCHAIN_OPERATOR_TOKEN=[REDACTED] AUTOCHAIN_WRITE_ACTION=advance npm run agent:harness
```

See `docs/autochain-mcp-runbook.md` for the read-only, sync, advance, and controlled mint boundaries. See `docs/cross-demo-proof.md` for the optional Kraken proof boundary.

## DUAL Object Model

Template:

```text
io.dual.autochain_claim.demo.v1
```

Template payload:

```text
dual-autochain-template.json
```

Live IanTest setup:

```text
Template ID: 6a16d6a64754b22af1f6cdb0
Claim object ID: 6a16d6a84754b22af1f6cdb2
Org ID: 69b935b4187e903f826bbe71
```

Core fields:

- claim id, VIN, dealer, OEM, part category, part serial, reimbursement values;
- signature, serial, recall, duplicate, dealer, and warranty coverage flags;
- evidence references for repair order, OEM signature, diagnostic scan, and installation photo;
- policy, serial, evidence, decision, claim, state, and integrity hashes;
- latest evaluator result and reason.

## Validation

```text
npm run check
npm run smoke
```

Live setup helper:

```text
npm run setup:dual-live
```

Use `.env.example` as the safe local configuration shape. Do not add API keys or operator tokens to the repo.
