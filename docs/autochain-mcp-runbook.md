# AutoChain MCP Operator Runbook

Production MCP endpoint:

```text
https://autochain-eight.vercel.app/mcp
```

Use this runbook when an agent or operator needs to inspect, evaluate, sync, advance, or mint through the AutoChain MCP facade. The default path is read-only.

## Tool Map

| Tool | Access | Purpose |
| --- | --- | --- |
| `autochain_dual_get_status` | Public | Read DUAL readiness and safety state. |
| `autochain_dual_get_claim` | Public | Read the canonical claim or local seed claim. |
| `autochain_dual_evaluate_gate` | Public | Evaluate the next gate without writing. |
| `autochain_dual_prepare_sync_payload` | Public | Preview a DUAL sync payload. |
| `autochain_dual_prepare_mint_payload` | Public | Preview a mint payload. |
| `autochain_dual_sync_claim` | Operator-gated | Write the current claim to the canonical DUAL object. |
| `autochain_dual_advance_gate` | Operator-gated | Evaluate then advance the claim state if allowed. |
| `autochain_dual_mint_claim` | Operator-gated | Mint a new claim object for controlled demos. |

## Read-only flow

Use this for public agent inspection, demos, and policy review. It does not need an operator token.

```text
npm run agent:harness
```

The harness connects to `/mcp`, reads the live DUAL-backed claim, evaluates the next gate, previews the event-bus update payload, and prints the object id, state, next gate, decision hash, payload styles, and `public_writes=false`.

Direct initialize check:

```text
curl -s https://autochain-eight.vercel.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

## Standalone proof flow

Use this for the default AutoChain proof. It is AutoChain-only and does not call Kraken or any other external demo.

```text
npm run proof:chain
```

The proof initializes AutoChain MCP, reads the live claim, confirms the standalone demo target `Approved -> paid`, evaluates the next gate read-only, previews sync and mint payloads without executing them, verifies write tools are operator-gated, and writes proof artifacts under `outputs/`.

## Operator sync flow

Use this when an operator wants to prove the MCP write path without advancing the claim.

```text
AUTOCHAIN_OPERATOR_TOKEN=[REDACTED] AUTOCHAIN_WRITE_ACTION=sync npm run agent:harness
```

Expected result:

- `mode=operator_sync`
- `write.ok=true`
- `write.payload_style=direct_data_custom`
- `write.balance_ready=true`
- live claim state unchanged
- `public_writes=false`

## Operator gate-advance flow

Use this only when the demo should move to the next state.

```text
AUTOCHAIN_OPERATOR_TOKEN=[REDACTED] AUTOCHAIN_WRITE_ACTION=advance npm run agent:harness
```

The MCP tool evaluates the next gate first. If policy blocks the transition, it returns `advanced=false` and does not write to DUAL. If policy allows the transition, it writes the advanced claim to the canonical DUAL object and marks the latest reason as an MCP gate advance.

## Controlled mint flow

`autochain_dual_mint_claim` exists for controlled operator-only demos, but the harness does not call it. Minting creates a new DUAL object and should stay outside routine smoke tests.

## Expected Fail-Closed Checks

These should fail unless the caller has a valid operator token and the server is write-ready:

```text
curl -s https://autochain-eight.vercel.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"autochain_dual_sync_claim","arguments":{"operator_token":"wrong"}}}'
```

Expected result:

- structured content reports `ok=false`;
- `publicWrites=false`;
- no claim state change;
- no DUAL object update.

## Safety boundary

- Public read and evaluate tools remain read-only.
- Write tools require an operator token matching `DEMO_OPERATOR_TOKEN`.
- Write tools require server-side `DUAL_API_KEY`, `DUAL_WRITE_MODE=event_bus`, configured template/object ids as needed, and positive IanTest org balance.
- Never print, commit, or paste the operator token or DUAL API key into prompts, logs, browser clients, or docs.
- Use `npm run proof:chain` for standalone proof. Use `npm run proof:kraken:fresh` only for optional cross-demo interoperability.
