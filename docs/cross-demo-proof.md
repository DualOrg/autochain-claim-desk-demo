# Optional Cross-Demo Proof

AutoChain is a standalone DUAL-backed warranty claim demo. Its core path is:

```text
claim lifecycle -> AutoChain MCP -> DUAL readback -> operator-gated DUAL writes
```

Kraken is not required for AutoChain. The Kraken integration exists only as interoperability evidence: another agent surface can observe AutoChain over public read-only MCP, carry the AutoChain decision hash into its own proposal/receipt/proof bundle, and prove that the hash survived across systems.

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

## Boundary

Use `proof:chain` for standalone AutoChain demos and reviewer checks.

Use `proof:kraken:fresh` only when the demo objective is cross-demo interoperability and a fresh Kraken paper receipt is acceptable.
