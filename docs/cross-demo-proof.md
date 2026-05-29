# Optional Cross-Demo Proof

AutoChain is a standalone DUAL-backed warranty claim demo. Its core path is:

```text
claim lifecycle -> AutoChain MCP -> DUAL readback -> operator-gated DUAL writes
```

Kraken is not required for AutoChain. The Kraken integration exists only as interoperability evidence: another agent surface can observe AutoChain over public read-only MCP, carry the AutoChain decision hash into its own proposal/receipt/proof bundle, and prove that the hash survived across systems.

Use the AutoChain README, deployment notes, demo playbook, and proof run sheet for the standalone product path:

- `README.md`
- `DEPLOYMENT.md`
- `docs/autochain-demo-playbook.md`
- `docs/autochain-proof-run-sheet.md`
- `docs/autochain-mcp-runbook.md`

## Default AutoChain Proof

```text
npm run proof:chain
```

This is AutoChain-only. It does not execute a Kraken paper trade. It does not write to AutoChain, mint a claim object, or advance the claim state.

## Fresh Kraken Integration Proof

```text
npm run proof:kraken:fresh
```

This is explicitly side-effecting in the Kraken demo. It:

- reads AutoChain over public MCP;
- evaluates the AutoChain next gate read-only;
- executes one Kraken paper trade;
- verifies the AutoChain decision hash in the Kraken proposal, trade receipt, and proof bundle;
- writes an artifact named `autochain-kraken-integration-proof-*.json` and `.md` under `outputs/`.

It does not send an AutoChain operator token to Kraken, does not execute AutoChain writes, does not mint AutoChain objects, and does not advance AutoChain to `Paid`.

## When To Use Each Proof

| Goal | Command | AutoChain write? | Kraken side effect? |
| --- | --- | --- | --- |
| Public reviewer proof | `npm run proof:chain` | No | No |
| MCP operator-readiness check | `npm run agent:harness` | No by default | No |
| Controlled AutoChain sync | `AUTOCHAIN_WRITE_ACTION=sync npm run agent:harness` with operator token | Yes, approved operator only | No |
| Controlled AutoChain advance | `AUTOCHAIN_WRITE_ACTION=advance npm run agent:harness` with operator token | Yes, approved operator only | No |
| Cross-demo interoperability | `npm run proof:kraken:fresh` | No | Yes, Kraken paper trade/receipt path |

## Boundary

Use `proof:chain` for standalone AutoChain demos and reviewer checks.

Use `proof:kraken:fresh` only when the demo objective is cross-demo interoperability and a fresh Kraken paper receipt is acceptable.

Do not use the Kraken proof to claim AutoChain itself requires Kraken. It does not.
