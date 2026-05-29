# AutoChain Proof Run Sheet

Live app: <https://autochain-eight.vercel.app/>

Purpose: run the standalone AutoChain proof, then show exactly where the claim evidence lives across the app, API, MCP surface, DUAL Console, and optional operator write path.

This run sheet is for the standalone AutoChain surface. Kraken is not required.

## 30-Second Frame

Say this before touching the controls:

> AutoChain is a claim-state proof demo. The public surface can read and evaluate the warranty claim. DUAL supplies the canonical object and proof boundary. Writes remain operator-gated.

Point to:

- Official DUAL logo.
- `DUAL readback ready` when production readback is configured.
- `publicWrites=false`.
- `Synthetic claim, live DUAL proof`.

## Current Canonical Claim

Verify before a live presentation:

```bash
curl https://autochain-eight.vercel.app/api/claims/current
```

Current expected public demo state from the latest production pass:

| Field | Value |
| --- | --- |
| Claim id | `AC-OEM-2026-0007` |
| State | `Approved` |
| Next gate | `paid` / `Mark paid` |
| Org | `69b935b4187e903f826bbe71` |
| Template | `6a16d6a64754b22af1f6cdb0` |
| Object | `6a16d6a84754b22af1f6cdb2` |
| Public writes | `false` |

If the API returns a different state, use the returned state in the demo. Do not present this table as current without checking.

## Run The Browser Proof

1. Open <https://autochain-eight.vercel.app/>.
2. Confirm the top status and disclosure.
3. Click `Reviewer Mode`.
4. Click `Replay proof`.
5. Confirm `Proof history` increases.
6. Click `Export proof`.
7. Open or inspect the downloaded JSON proof packet if useful.

Presenter line:

> This proof was generated in the browser from the visible claim state. It does not write to DUAL.

## Run The Local Standalone Proof

Start the app:

```bash
npm start
```

In another terminal:

```bash
npm run proof:chain
```

What the proof does:

- initializes the AutoChain MCP endpoint;
- reads DUAL status;
- reads the current claim;
- confirms the standalone target `Approved -> Paid` when the canonical claim is approved;
- evaluates the next gate read-only;
- prepares sync and mint payload previews;
- verifies MCP write tools reject missing/wrong operator credentials;
- writes JSON and Markdown artifacts under `outputs/`.

What the proof does not do:

- no AutoChain DUAL write;
- no claim mint;
- no state advance;
- no payment release;
- no Kraken call;
- no operator-token exposure.

## Run The Production Smoke Proof

```bash
DEMO_BASE_URL=https://autochain-eight.vercel.app npm run smoke
```

Expected coverage:

- home page loads;
- official DUAL logo is present;
- reviewer disclosure/support content is present;
- `/api/dual/status` returns public writes false;
- `/api/claims/current` returns the canonical claim;
- MCP initialize and tool listing work;
- public MCP read tools work;
- wrong operator token is rejected for sync;
- claim evaluation works;
- sync and mint reject wrong operator token.

## API Proof Points

Status:

```bash
curl https://autochain-eight.vercel.app/api/dual/status
```

Current claim:

```bash
curl https://autochain-eight.vercel.app/api/claims/current
```

Evaluate the next gate:

```bash
curl -s https://autochain-eight.vercel.app/api/claims/evaluate \
  -H 'content-type: application/json' \
  -d '{"gate":{"id":"paid"}}'
```

Bad-token sync rejection:

```bash
curl -s https://autochain-eight.vercel.app/api/claims/sync \
  -H 'content-type: application/json' \
  -H 'x-demo-operator-token: wrong' \
  -d '{}'
```

Presenter line:

> The API proof is not just that the happy path works. It is also that write attempts fail closed without the operator boundary.

## MCP Proof Points

Initialize:

```bash
curl -s https://autochain-eight.vercel.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

List tools:

```bash
curl -s https://autochain-eight.vercel.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Read claim:

```bash
curl -s https://autochain-eight.vercel.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"autochain_dual_get_claim","arguments":{}}}'
```

Evaluate:

```bash
curl -s https://autochain-eight.vercel.app/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"autochain_dual_evaluate_gate","arguments":{}}}'
```

Use `docs/autochain-mcp-runbook.md` for operator-sync and operator-advance modes.

## Where To Look In The App

Use the first screen and proof rail.

1. Header
   - Official DUAL logo, claim metadata, DUAL status, and `publicWrites=false`.
2. Disclosure band
   - Explains synthetic claim versus live proof surface.
3. Claim queue
   - Reviewer context: SLA, priority, risk, exposure.
4. Claim workflow
   - Canonical claim, state chain, evidence, and payment control.
5. DUAL readiness rail
   - Runtime, mode, write mode, readback, and public-write status.
6. Proof history
   - Replayable checkpoints and proof hashes.
7. Demo support
   - Runbook and support links.

## DUAL Console Links

Use these when someone asks, "Is this really in DUAL?"

| Evidence | Link |
| --- | --- |
| DUAL org dashboard | <https://console-testnet.dual.network/69b935b4187e903f826bbe71> |
| AutoChain template | <https://console-testnet.dual.network/69b935b4187e903f826bbe71/collections/templates?templateId=6a16d6a64754b22af1f6cdb0> |
| Canonical claim object | <https://console-testnet.dual.network/69b935b4187e903f826bbe71/collections/objects?objectId=6a16d6a84754b22af1f6cdb2> |
| Production status | <https://autochain-eight.vercel.app/api/dual/status> |
| Production claim readback | <https://autochain-eight.vercel.app/api/claims/current> |

Action, batch, and L2 links are only available after an operator-gated write produces action/batch identifiers. Do not invent or reuse stale hashes.

## Operator-Gated Write Proof

Only run this with explicit approval.

Read-only harness first:

```bash
npm run agent:harness
```

Sync without state advance:

```bash
AUTOCHAIN_OPERATOR_TOKEN=[REDACTED] AUTOCHAIN_WRITE_ACTION=sync npm run agent:harness
```

Gate advance:

```bash
AUTOCHAIN_OPERATOR_TOKEN=[REDACTED] AUTOCHAIN_WRITE_ACTION=advance npm run agent:harness
```

Expected operator-sync result:

- `write.ok=true`;
- payload style is direct custom data;
- claim state does not advance;
- public writes remain false.

Expected operator-advance behavior:

- evaluates the next gate first;
- refuses to write if policy blocks;
- writes only when gate approval and operator readiness are present;
- updates the canonical DUAL object.

## Optional Cross-Demo Proof

Use only when the demo objective is interoperability with Kraken:

```bash
npm run proof:kraken:fresh
```

This path is side-effecting in the Kraken demo. It executes one Kraken paper trade and may sync a Kraken DUAL receipt. It keeps AutoChain read-only.

Default presenter line:

> AutoChain does not need Kraken. Kraken can observe AutoChain over read-only MCP when we want to prove cross-demo interoperability.

## If Something Is Pending During A Live Demo

| Symptom | What to say |
| --- | --- |
| DUAL readback is unavailable | "This run is local proof mode. The same gate chain and public-write boundary remain visible." |
| Claim state is not expected | "The canonical DUAL object has changed. We will use the live state returned by `/api/claims/current`." |
| Operator write is not ready | "That is correct for public mode. Writes require explicit operator readiness and token-gated execution." |
| L3/L2 proof is missing | "No operator-gated write has been run in this proof path, so there is no action/batch hash to show." |

## Close

End with:

> The payment is not the product. The proof boundary is the product. AutoChain shows how DUAL can make claim state inspectable, gateable, and safe to expose to agents without opening public mutation.
