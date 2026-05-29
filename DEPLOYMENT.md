# Deployment Notes

## Local Demo

Use local read-only mode for ordinary development:

```bash
npm install
npm start
```

Open <http://127.0.0.1:4177>.

No environment variables are required for the local read-only MVP. The app serves deterministic claim data, public read/evaluate APIs, and public read-only MCP tools.

## Production Demo

The current public deployment is:

<https://autochain-eight.vercel.app/>

The production app should preserve these guarantees:

- official DUAL logo in the top-left header;
- public read/evaluate/replay/export only;
- `publicWrites=false`;
- DUAL readback when configured;
- operator-gated writes only when the server has a scoped DUAL key, event-bus mode, and `DEMO_OPERATOR_TOKEN`;
- no browser-visible DUAL API key or operator token.

## Environment

Safe local defaults:

```text
PORT=4177
HOST=127.0.0.1
DUAL_API_URL=https://api-testnet.dual.network
DUAL_ORG_ID=69b935b4187e903f826bbe71
DUAL_PERSISTENCE_MODE=local
DUAL_WRITE_MODE=read_only
```

DUAL readback configuration:

```text
DUAL_PERSISTENCE_MODE=dual
DUAL_API_URL=https://api-testnet.dual.network
DUAL_API_KEY=...
DUAL_ORG_ID=69b935b4187e903f826bbe71
DUAL_AUTOCHAIN_TEMPLATE_ID=6a16d6a64754b22af1f6cdb0
DUAL_AUTOCHAIN_CLAIM_OBJECT_ID=6a16d6a84754b22af1f6cdb2
DUAL_WRITE_MODE=read_only
```

Controlled operator-write configuration:

```text
DUAL_PERSISTENCE_MODE=dual
DUAL_API_URL=https://api-testnet.dual.network
DUAL_API_KEY=...
DUAL_ORG_ID=69b935b4187e903f826bbe71
DUAL_AUTOCHAIN_TEMPLATE_ID=6a16d6a64754b22af1f6cdb0
DUAL_AUTOCHAIN_CLAIM_OBJECT_ID=6a16d6a84754b22af1f6cdb2
DUAL_WRITE_MODE=event_bus
DEMO_OPERATOR_TOKEN=...
DUAL_L3_EXPLORER_BASE_URL=https://explorer-testnet.dual.network
DUAL_L2_EXPLORER_BASE_URL=https://explorer-test-v2.dual.network
```

Keep `DEMO_OPERATOR_TOKEN` and `DUAL_API_KEY` server-side only. Do not place them in client JavaScript, screenshots, DUAL objects, docs, issue comments, prompts, or logs.

## DUAL-Backed Deployment

The canonical AutoChain live setup is:

| Field | Value |
| --- | --- |
| Org | `69b935b4187e903f826bbe71` |
| Template | `6a16d6a64754b22af1f6cdb0` |
| Claim object | `6a16d6a84754b22af1f6cdb2` |
| Claim id | `AC-OEM-2026-0007` |
| Template name | `io.dual.autochain_claim.demo.v1` |

Recommended rollout:

1. Verify the template payload in `dual-autochain-template.json`.
2. Verify or create the AutoChain DUAL template.
3. Verify or create the canonical claim object.
4. Set DUAL readback environment variables.
5. Deploy.
6. Check `GET /api/dual/status`.
7. Check `GET /api/claims/current`.
8. Run production smoke:

```bash
DEMO_BASE_URL=https://autochain-eight.vercel.app npm run smoke
```

Only after readback is healthy, configure operator-gated write mode for controlled tests.

## Operator Write Rollout

Use this only when the goal is to prove the write boundary or intentionally move the claim.

1. Set `DUAL_WRITE_MODE=event_bus`.
2. Set a high-entropy `DEMO_OPERATOR_TOKEN`.
3. Confirm `DUAL_API_KEY`, template id, object id, and org id are present.
4. Confirm IanTest balance is positive.
5. Run the read-only harness first:

```bash
npm run agent:harness
```

6. For sync without state advance:

```bash
AUTOCHAIN_OPERATOR_TOKEN=[REDACTED] AUTOCHAIN_WRITE_ACTION=sync npm run agent:harness
```

7. For gate advance only when intended:

```bash
AUTOCHAIN_OPERATOR_TOKEN=[REDACTED] AUTOCHAIN_WRITE_ACTION=advance npm run agent:harness
```

8. Re-check `/api/claims/current` and `/api/dual/status`.

The write tools must fail closed when the operator token is missing or wrong.

## API And MCP Checks

Public checks:

```bash
curl https://autochain-eight.vercel.app/api/dual/status
curl https://autochain-eight.vercel.app/api/claims/current
```

MCP initialize:

```bash
curl -s https://autochain-eight.vercel.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

MCP list tools:

```bash
curl -s https://autochain-eight.vercel.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Bad-token write checks should return rejection, not mutation:

```bash
curl -s https://autochain-eight.vercel.app/api/claims/sync \
  -H 'content-type: application/json' \
  -H 'x-demo-operator-token: wrong' \
  -d '{}'
```

## Optional Cross-Demo Deployment

AutoChain does not require Kraken.

If the deployment is being used as an input to the Kraken DUAL Agent demo, keep the default AutoChain proof path read-only and configure Kraken to observe:

```text
AUTOCHAIN_MCP_URL=https://autochain-eight.vercel.app/mcp
AUTOCHAIN_GATE_MODE=observe
```

Use `AUTOCHAIN_GATE_MODE=required` only when a Kraken paper action should be blocked if AutoChain cannot approve the current claim gate.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Production shows local proof | DUAL env missing or deployment not refreshed. | Check Vercel env and redeploy. |
| `readbackReady=false` | Missing API key or claim object id. | Check `DUAL_API_KEY` and `DUAL_AUTOCHAIN_CLAIM_OBJECT_ID`. |
| `writable=false` | Missing event-bus mode, template id, operator token, or balance readiness. | Check `/api/dual/status` and run the read-only harness first. |
| Sync/advance returns `403` | Missing or wrong operator token. | Expected unless running an approved operator test. |
| Claim state differs from presentation notes | Canonical object changed or was advanced in a prior test. | Read `/api/claims/current` and update the run sheet before presenting. |
| Vercel alias still serves an old asset | CDN or deployment alias lag. | Use a cache-busted URL, inspect deployment id, then redeploy if needed. |

## Release Checklist

- `npm run check` passes.
- `npm run smoke` passes locally.
- Production smoke passes against the public URL.
- Browser QA passes desktop and 390px mobile when UI changes.
- README, deployment notes, runbook, and playbook agree on the current state.
- No secrets or operator tokens are committed.
- Vault logs are updated for deployed changes.
