# AutoChain Claim Desk

A DUAL-backed warranty-claim demo for the AutoChain idea from the DUAL 30-concept library.

The short version:

> AutoChain checks the claim. DUAL anchors the state, proof, and operator boundary.

The demo shows an OEM warranty administrator validating one dealer claim for a Bosch powertrain-electrical part. It is safe by default: public users can read the claim, evaluate the next gate, replay the proof, copy a reviewer brief, and export a local proof packet. Public users cannot write to DUAL, mint a new claim object, advance the claim state, or release payment.

## Live Demo

Open the public demo:

<https://autochain-eight.vercel.app/>

What to look for:

- `DUAL readback ready`: the canonical claim is read from DUAL when production credentials are configured.
- `publicWrites=false`: the public UI and public MCP path do not expose anonymous writes.
- `Synthetic claim, live DUAL proof`: the dealer/vehicle details are demo data; the DUAL readback, hashes, proof packet, and write boundary are the review surface.
- `60-90 second reviewer walkthrough`: the first-screen path for a quick inspection.
- `Claim queue`: reviewer-grade queue metadata, risk, SLA, evidence completeness, and exposure.
- `Payment control`: payment release remains gated behind claim state and proof readiness.
- `Proof history`: replayable checkpoints and deterministic claim/proof hashes.
- `DUAL readiness`: runtime, write mode, readback, and public-write status.
- `Vehicle identity`: DVIN-style identifier, VIN, DUAL object, and identity hash.
- `Vehicle record timeline`: identity, mileage, maintenance, and warranty-claim events.
- `Vehicle trust score`: transparent score across identity, serial, coverage, mileage, dealer, duplicate, and evidence checks.
- `Evidence vault`: hash-only repair order, OEM signature, diagnostic scan, and image refs.
- `Public verifier`: shareable `/proof/:claimId` route plus `/api/proof/public` JSON envelope.

For presenter and operator guidance, use:

- [AutoChain demo playbook](docs/autochain-demo-playbook.md)
- [AutoChain proof run sheet](docs/autochain-proof-run-sheet.md)
- [MCP operator runbook](docs/autochain-mcp-runbook.md)
- [Optional cross-demo proof](docs/cross-demo-proof.md)
- [Deployment notes](DEPLOYMENT.md)

## New User Paths

Use the path that matches what you are trying to do.

| Path | Use this when | Requires credentials |
| --- | --- | --- |
| Live demo viewer | You only want to inspect the current public AutoChain demo. | No |
| Local developer | You want to run and change the read-only claim desk locally. | No |
| DUAL readback reviewer | You want the app to read the canonical DUAL claim object. | Yes, scoped DUAL API key |
| DUAL operator | You want controlled claim sync, gate advance, or mint tests. | Yes, scoped DUAL API key and operator token |
| Cross-demo integration | You want to prove Kraken can consume AutoChain's read-only MCP decision hash. | Maybe; Kraken side may create a paper-trade receipt |

## Requirements

- Node.js 20 or newer.
- npm.
- Git.
- No database is required.
- No DUAL credentials are required for local read-only development.

## Quick Start: Local Read-Only Demo

```bash
git clone https://github.com/DualOrg/autochain-claim-desk-demo.git
cd autochain-claim-desk-demo
npm install
npm start
```

Open <http://127.0.0.1:4177>.

No `.env` file is required for the local read-only path. The app will:

- serve the claim desk locally;
- evaluate claim gates deterministically;
- expose public read/evaluate API and MCP tools;
- keep DUAL writes disabled unless explicit server-side credentials and operator token are configured.

If port `4177` is busy:

```bash
PORT=4178 npm start
```

## Optional Local `.env`

For explicit local settings, copy the example:

```bash
cp .env.example .env
```

The default `.env.example` is safe for local mode:

```text
DUAL_PERSISTENCE_MODE=local
DUAL_WRITE_MODE=read_only
```

Do not put API keys, operator tokens, private wallet data, screenshots containing secrets, or copied terminal secrets into browser code, docs, logs, commits, prompts, or DUAL objects.

## First Run Walkthrough

After the app opens:

1. Confirm the header shows the official DUAL logo, `AutoChain Claim Desk`, and `publicWrites=false`.
2. Read the demo disclosure: synthetic claim, live DUAL proof.
3. Use `Reviewer Mode` to jump to the proof rail.
4. Confirm `DUAL readiness` shows whether readback is local or DUAL-backed.
5. Inspect the canonical claim `AC-OEM-2026-0007`.
6. Click `Replay proof` to create a new proof checkpoint.
7. Inspect `Vehicle identity`, `Vehicle trust score`, `Vehicle record timeline`, and `Evidence vault`.
8. Open `/proof/AC-OEM-2026-0007` for the shareable public verifier route.
9. Use `Copy brief` for a reviewer summary.
10. Use `Export proof` for a local JSON proof packet.
11. Confirm no public action asks for an operator token or writes to DUAL.

The happy path proves the claim can move through a deterministic gate chain. The blocked path proves unsafe claims, duplicate claims, or unready payment release can be denied before state changes.

## Test And Validate

Static syntax check:

```bash
npm run check
```

Smoke test against a running server:

```bash
npm start
```

In another terminal:

```bash
npm run smoke
```

To test a different URL:

```bash
DEMO_BASE_URL=http://127.0.0.1:4178 npm run smoke
DEMO_BASE_URL=https://autochain-eight.vercel.app npm run smoke
```

The smoke test checks the home page, official DUAL logo, reviewer support content, DUAL status, current claim, public MCP tools, operator-token rejection, gate evaluation, sync rejection, and mint rejection.

## Modes

### Local Read-Only Mode

Local mode is the default and is the right path for most development.

```text
DUAL_PERSISTENCE_MODE=local
DUAL_WRITE_MODE=read_only
```

The app uses deterministic seed claim data when DUAL readback is not configured.

### DUAL Readback Mode

DUAL readback mode reads the canonical claim object from DUAL but still keeps public writes disabled.

Minimum server-side configuration:

```bash
DUAL_PERSISTENCE_MODE=dual
DUAL_API_URL=https://api-testnet.dual.network
DUAL_API_KEY=...
DUAL_ORG_ID=69b935b4187e903f826bbe71
DUAL_AUTOCHAIN_TEMPLATE_ID=6a16d6a64754b22af1f6cdb0
DUAL_AUTOCHAIN_CLAIM_OBJECT_ID=6a16d6a84754b22af1f6cdb2
DUAL_WRITE_MODE=read_only
```

This mode should show `readbackReady=true` while `publicWrites=false`.

### Operator-Gated Write Mode

Operator-gated write mode is for controlled demos and maintenance only.

```bash
DUAL_PERSISTENCE_MODE=dual
DUAL_API_URL=https://api-testnet.dual.network
DUAL_API_KEY=...
DUAL_ORG_ID=69b935b4187e903f826bbe71
DUAL_AUTOCHAIN_TEMPLATE_ID=6a16d6a64754b22af1f6cdb0
DUAL_AUTOCHAIN_CLAIM_OBJECT_ID=6a16d6a84754b22af1f6cdb2
DUAL_WRITE_MODE=event_bus
DEMO_OPERATOR_TOKEN=...
```

Even in this mode, public writes remain false. Write endpoints and MCP write tools require the server-side DUAL key and the operator token.

## DUAL Setup Checklist

1. Use [dual-autochain-template.json](dual-autochain-template.json) as the claim template payload.
2. Create or verify the DUAL template `io.dual.autochain_claim.demo.v1`.
3. Mint or verify one canonical claim object.
4. Set `DUAL_AUTOCHAIN_TEMPLATE_ID`.
5. Set `DUAL_AUTOCHAIN_CLAIM_OBJECT_ID`.
6. Set `DUAL_AUTH_MODE` only if a future adapter requires it; the current app uses a scoped API key through `x-api-key`.
7. Set `DUAL_WRITE_MODE=event_bus` only for controlled operator-gated write testing.
8. Set `DEMO_OPERATOR_TOKEN` only in server-side env.
9. Verify:
   - `GET /api/dual/status`
   - `GET /api/claims/current`
   - `POST /api/claims/evaluate`
   - MCP `initialize`
   - MCP `tools/list`
   - bad-token rejection for sync and mint

## API Quick Checks

```bash
curl http://127.0.0.1:4177/api/dual/status
curl http://127.0.0.1:4177/api/claims/current
curl -s http://127.0.0.1:4177/api/claims/evaluate \
  -H 'content-type: application/json' \
  -d '{"gate":{"id":"paid"}}'
```

Useful endpoints:

```text
GET  /api/dual/status
GET  /api/claims/current
GET  /api/proof/public
POST /api/claims/evaluate
POST /api/claims/sync
POST /api/claims/mint
POST /mcp
POST /api/mcp
```

Public endpoints are read/evaluate only. `sync` and `mint` reject missing or wrong operator tokens and still require DUAL write readiness.

## MCP Quick Start

`POST /mcp` is a JSON-RPC MCP facade for agent clients. Public tools are read-only or payload-preview tools. Write tools are present so operators can test the full boundary, but they require an operator token and server-side readiness.

Initialize:

```bash
curl -s http://127.0.0.1:4177/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

List tools:

```bash
curl -s http://127.0.0.1:4177/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Read the canonical claim:

```bash
curl -s http://127.0.0.1:4177/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"autochain_dual_get_claim","arguments":{}}}'
```

Evaluate the next gate read-only:

```bash
curl -s http://127.0.0.1:4177/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"autochain_dual_evaluate_gate","arguments":{}}}'
```

Available MCP tools:

- `autochain_dual_get_status`
- `autochain_dual_get_claim`
- `autochain_dual_evaluate_gate`
- `autochain_dual_prepare_sync_payload`
- `autochain_dual_prepare_mint_payload`
- `autochain_dual_run_claim_proof`
- `autochain_dual_get_public_verifier_page`
- `autochain_dual_red_team_claim`
- `autochain_dual_generate_reviewer_handoff`
- `autochain_dual_sync_claim`
- `autochain_dual_advance_gate`
- `autochain_dual_mint_claim`

Use the agent harness for a scripted MCP check:

```bash
npm run agent:harness
```

Use the standalone proof runner for the default AutoChain proof:

```bash
npm run proof:chain
```

`proof:chain` is AutoChain-only. It initializes the AutoChain MCP server, reads the live DUAL-backed claim when configured, confirms the standalone target `Approved -> Paid`, evaluates the next gate read-only, previews sync and mint payloads without executing them, verifies write tools are operator-gated, and writes artifacts under `outputs/`.

## Optional Kraken Integration Proof

Kraken is not required for AutoChain.

The optional proof below exists only to demonstrate interoperability: another demo can consume the AutoChain MCP decision hash and carry it into its own paper-trade receipt/proof bundle.

```bash
npm run proof:kraken:fresh
```

This path is explicitly side-effecting in the Kraken demo. It can execute one Kraken paper trade and may sync a Kraken DUAL receipt. It does not send an AutoChain operator token to Kraken, does not write to AutoChain, does not mint an AutoChain object, and does not advance the AutoChain claim.

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
Org ID: 69b935b4187e903f826bbe71
Template ID: 6a16d6a64754b22af1f6cdb0
Claim object ID: 6a16d6a84754b22af1f6cdb2
Canonical claim: AC-OEM-2026-0007
```

Core fields:

- claim id, VIN, dealer, OEM, part category, part serial, replacement serial, and reimbursement values;
- warranty start/expiry, odometer, mileage limit, deductible, and approved amount;
- OEM signature, serial, recall, duplicate, dealer-authority, and coverage flags;
- evidence refs for repair order, OEM signature, diagnostic scan, and installation photo;
- policy, serial, evidence, decision, claim, state, and integrity hashes;
- latest evaluator result, reason, gate id, payment reference, and update timestamp.

## Automotive Record Surface

AutoChain covers the enterprise-useful parts of an automotive record without pretending to be a dedicated automotive chain:

| Automotive record claim | AutoChain implementation |
| --- | --- |
| Vehicle identity / DVIN | DVIN-style identifier derived from VIN, OEM, part serial, DUAL object, and identity hash. |
| Maintenance records | Claim-linked service event for the replacement part, serial, dealer, date, and proof hash. |
| Mileage records | Claim-time odometer event checked against warranty mileage limit. |
| Insurance/warranty claims | Canonical warranty claim object, gate chain, reimbursement state, and proof hashes. |
| Vehicle condition/evidence | Evidence vault with hash-only document/image refs. |
| Reputation score | Vehicle trust score with transparent scoring checks. |
| Public explorer/verifier | `/proof/:claimId` and `/api/proof/public` expose read-only verifier envelopes. |

AutoChain does not claim token rewards, bridging, NFT titling, vehicle ownership transfer, or a standalone automotive L1. DUAL remains the proof/control layer.

Claim state machine:

```text
Claimed -> Part_Verified -> Coverage_Checked -> Approved -> Paid
```

## DUAL Links

Use these when someone asks, "Is this really connected to DUAL?"

- Console org: `https://console-testnet.dual.network/69b935b4187e903f826bbe71`
- Console template: `https://console-testnet.dual.network/69b935b4187e903f826bbe71/collections/templates?templateId=6a16d6a64754b22af1f6cdb0`
- Console object: `https://console-testnet.dual.network/69b935b4187e903f826bbe71/collections/objects?objectId=6a16d6a84754b22af1f6cdb2`
- L3 explorer base: `https://explorer-testnet.dual.network`
- L2 explorer base: `https://explorer-test-v2.dual.network`

Action and batch links appear only after controlled operator-gated writes produce action or batch identifiers. Do not invent L3/L2/L1 hashes in presenter material.

## Safety Rules

- Public users can read, evaluate, replay local proof checkpoints, copy a brief, and export a local proof packet.
- Public users cannot write to DUAL.
- Public users cannot mint a claim object.
- Public users cannot advance the canonical claim.
- Public users cannot release payment.
- Operator writes require server-side DUAL credentials, `DUAL_WRITE_MODE=event_bus`, a positive IanTest balance, configured template/object ids, and `DEMO_OPERATOR_TOKEN`.
- Never print, commit, paste, screenshot, or store `DUAL_API_KEY` or `DEMO_OPERATOR_TOKEN`.
- Kraken is optional and must stay outside the standalone AutoChain proof path.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Port `4177` is busy | Another local server is running. | Start with `PORT=4178 npm start`. |
| UI shows local proof | DUAL readback env is missing or intentionally disabled. | Configure `DUAL_API_KEY` and `DUAL_AUTOCHAIN_CLAIM_OBJECT_ID` only if readback is required. |
| `readbackReady=false` | Missing DUAL key or claim object id. | Check `/api/dual/status` and server env. |
| `writable=false` | Missing template id, operator token, event-bus mode, or balance readiness. | Check `/api/dual/status`, `DUAL_WRITE_MODE`, and operator env. |
| Sync/mint returns `403` | Missing or wrong operator token. | Use only the approved server-side operator token for controlled tests. |
| MCP write tool returns `ok=false` | Operator gate or DUAL write readiness failed. | Treat this as expected unless running an approved operator test. |
| Kraken proof creates unexpected paper receipt | `npm run proof:kraken:fresh` was used instead of `npm run proof:chain`. | Use `proof:chain` for standalone AutoChain checks. |

## Support And Contributing

This is a public DUAL demo repo under `DualOrg`.

- Issues: <https://github.com/DualOrg/autochain-claim-desk-demo/issues>
- Repository: <https://github.com/DualOrg/autochain-claim-desk-demo>
- Contribution guidance: [CONTRIBUTING.md](CONTRIBUTING.md)
- License status: no open-source license is declared yet. Treat the code as a DualOrg demo artifact until a `LICENSE` file is added.

## Build Roadmap

1. Add app-served DUAL record readback links for action and batch evidence after controlled writes.
2. Add a prepared public proof URL for the canonical claim.
3. Add screenshot assets to the presenter playbook once the current UI stabilizes.
4. Add durable non-secret run artifacts under `outputs/` for reviewer packs.
5. Add production-specific health metadata for the latest deployed commit and Vercel deployment id.
