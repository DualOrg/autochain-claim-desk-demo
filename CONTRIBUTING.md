# Contributing

This repository is a public DUAL AutoChain demo. Contributions should preserve the core safety boundary: public read/evaluate only, operator-gated DUAL writes, and no secrets in browser-visible code or committed files.

## Before You Start

- Open an issue for substantial behavior, security, DUAL-write, MCP, deployment, or public-demo changes.
- Keep UI, REST, and MCP behavior aligned. Agent tools should use the same claim state and policy path as the browser UI.
- Keep AutoChain standalone. Kraken interoperability is optional and must remain outside the default proof path.
- Do not add wallet secrets, API keys, bearer tokens, operator tokens, private account data, or live payment controls.
- Do not change the canonical DUAL claim state unless the work explicitly requires an approved operator-gated test.

## Local Setup

```bash
git clone https://github.com/DualOrg/autochain-claim-desk-demo.git
cd autochain-claim-desk-demo
npm install
npm start
```

Open <http://127.0.0.1:4177>.

No `.env` file is required for local read-only development.

## Checks

Run the static check:

```bash
npm run check
```

Run the smoke test against a local server:

```bash
npm start
```

In another terminal:

```bash
npm run smoke
```

The smoke test checks the public page, official DUAL logo, DUAL status, current claim, public MCP tools, read-only gate evaluation, and wrong-token rejection for sync/mint.

## Pull Request Checklist

- Public app still reports `publicWrites=false`.
- Public users cannot sync, mint, advance, or mark the claim paid.
- Operator write behavior is token-gated and documented in README or deployment notes.
- UI, REST, and MCP surfaces agree on claim state, gate decision, and safety boundary.
- Optional Kraken proof remains separate from `npm run proof:chain`.
- No secrets, tokens, private wallet data, or live payment credentials are committed.
- `npm run check` passes.
- `npm run smoke` passes against a local or disposable demo server when runtime behavior changes.
- Docs are updated when environment variables, endpoints, MCP tools, or proof semantics change.

## Documentation Standard

When changing public behavior, update the relevant files:

- [README.md](README.md): new-user path and public contract.
- [DEPLOYMENT.md](DEPLOYMENT.md): environment, rollout, production checks.
- [docs/autochain-demo-playbook.md](docs/autochain-demo-playbook.md): presenter story and objection handling.
- [docs/autochain-proof-run-sheet.md](docs/autochain-proof-run-sheet.md): concrete proof path and values.
- [docs/autochain-mcp-runbook.md](docs/autochain-mcp-runbook.md): MCP operator boundaries.
- [docs/cross-demo-proof.md](docs/cross-demo-proof.md): optional Kraken interoperability boundary.

## License

No open-source license is declared yet. Treat this repository as a DualOrg demo artifact until a `LICENSE` file is added.
