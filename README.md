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
- operator-gated sync/mint endpoints that execute event-bus writes only when live-write env and `DEMO_OPERATOR_TOKEN` are configured.

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
