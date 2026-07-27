<div align="center">

# SolSentry

### A transaction guard and protocol risk engine for Solana AI agents

[![Model Version](https://img.shields.io/badge/model-v3.1-cyan.svg?style=for-the-badge)](packages/core/src/risk-scorer.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-9%20tools-purple.svg?style=for-the-badge)](packages/mcp-server)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

[Live Dashboard](https://solsentry.io/dashboard) &nbsp;·&nbsp; [API &amp; SDK Playground](https://solsentry.io/docs) &nbsp;·&nbsp; [OpenAPI Spec](https://solsentry.io/api/v1/openapi.json) &nbsp;·&nbsp; [Data Integrity Audit](docs/DATA_INTEGRITY_AUDIT.md)

</div>

---

## Overview

**Never sign a drainer.** SolSentry runs your agent's transaction against Solana mainnet without broadcasting it. It reports exactly which tokens leave the wallet, flags known wallet drainer instruction patterns, and, when you name the protocol, folds in protocol risk and policy guardrails. One request returns a single verdict.

```ts
const verdict = await sentry.guard({ transaction, protocolSlug: 'kamino' });
if (!verdict.proceed) return;   // do not sign
```

Around that sits an open source, provenance tagged protocol risk engine and policy guardrail middleware for Solana AI trading agents and autonomous bots. Every risk factor names its data source. Anything the engine cannot measure is reported as unmeasured rather than filled in with a plausible constant.

### How the pieces fit

An agent reaches SolSentry over one of four surfaces:

1. **MCP** with nine `solsentry_*` tools, for Claude, Cursor, and any MCP client.
2. **TypeScript SDK** (`@npmsolsentry/sdk`) for custom bots.
3. **CLI** (`@npmsolsentry/cli`) for the terminal.
4. **REST** for everything else.

The engine grounds each request in live data before answering:

| Source | What it provides |
| :--- | :--- |
| Solana mainnet RPC | Transaction simulation, balance deltas, on chain wallet reads |
| Pyth Hermes | Per protocol oracle health and stablecoin depeg, in basis points |
| DeFiLlama | TVL, fee series, category share, realized hack history |
| Jupiter Token API | Organic activity score and token market integrity |
| Helius | Top holder concentration |
| GitHub | Developer activity over the last 30 days |

---

## Key capabilities

- **`guard_transaction`, the one call before signing.** Give it a serialized transaction. It simulates the bytes against mainnet, scans for drainer patterns, and (with an optional `protocolSlug`, `action`, and `amountUsd`) folds in the exploit gate and policy guardrails into a single `SIGN` or `DO_NOT_SIGN` verdict with reasons. Available over MCP and at `POST /api/v1/guard`.
- **Wallet drainer detection.** Deserializes a base58 or base64 transaction, simulates it with `sigVerify: false`, and scans the instruction sequence for drainer patterns: an `Approve` or `SetAuthority` followed by an immediate `Transfer` or `CloseAccount`, or a sweep of more than 90% of an account balance. Read only, needs no key material, broadcasts nothing.
- **Provenance tagged scoring.** Eight risk factors, each carrying its data source, timestamp, and confidence. A factor with no live source is reported as unmeasured, scores nothing, and has its weight redistributed across the factors that do have data. Every response includes a `factor_coverage` object, and the engine withholds a directional recommendation below 50% coverage.
- **Realized exploit gate.** Every protocol is checked against DeFiLlama's hacks dataset. A large recent loss can force a `block` verdict on its own, regardless of how healthy the other factors look. See [Exploit history can override the score](#exploit-history-can-override-the-score).
- **Transaction simulator.** Replaces the recent blockhash, tracks compute units, and computes the exact incoming and outgoing SOL and SPL token balance deltas.
- **Stress testing.** Applies adverse price shocks against real on chain positions and reports which liquidate, the capital at risk, and the collateral needed to restore a safe health factor.
- **Pay per call in USDC.** Solana Pay micropayments through the `X-402-Payment` header. Billing stays off until `X402_RECIPIENT_WALLET` is set, so every endpoint is free until you configure a wallet.

---

## Factor coverage: what is actually measured

Eight factors. An unmeasured factor returns `score: null`, `source: "unmeasured"`, and contributes nothing; its weight is redistributed across the rest. A factor that does not apply to a protocol (for example, borrow liquidation on a DEX) is marked not applicable and excluded from that protocol's coverage denominator, rather than counted as a gap.

| Factor | Weight | Source | Status |
| :--- | :--- | :--- | :--- |
| Exploit History | 25% | DeFiLlama hacks dataset | Measured. Realized losses, decayed by age. Can force a `block` verdict on its own. |
| Audit &amp; Governance | 15% | Protocol registry and published governance docs | Measured. |
| Liquidity &amp; Liquidation | 15% | Kamino market utilization | Measured for lending markets (borrowed over supplied liquidity). Not applicable to protocols with no borrow book. |
| Oracle Health &amp; Depeg | 15% | Pyth Hermes, per protocol | Measured. Scores the weakest feed a protocol's solvency depends on, plus stablecoin deviation from one dollar. |
| Whale Concentration | 10% | Helius, with Jupiter as fallback | Measured. Top holder share of token supply. |
| Market Integrity | 10% | Jupiter Token API | Measured. The governance token's market: organic versus bot and arbitrage volume, plus mint and freeze authority status. A proxy for manipulation and dump risk, not for sandwich risk on a swap. |
| Developer Activity | 5% | GitHub REST API | Measured. Scores abandonment, not commit volume. Set `GITHUB_TOKEN` to raise the rate limit. |
| Business Efficiency | 5% | DeFiLlama | Measured. TVL, fee series, and category share. |

Live coverage is typically 80% to 90% of model weight per protocol with `GITHUB_TOKEN` set. Every API response and every protocol page states its own coverage. Below 50% the engine returns `HOLD` and withholds a directional call rather than inferring one from too little evidence.

### Exploit history can override the score

A realized loss is the only factor that describes what has actually happened to a protocol rather than how it looks. Averaging it into seven healthy looking co factors would bury it, so it gates the verdict directly:

- A loss of $10M or more within 180 days forces the verdict to `block`.
- A loss of $1M or more within 180 days caps the verdict at `avoid`.
- Older incidents still lower the score, decaying toward roughly 10% of their weight over three years.

Live example. Drift scores well on audits, TVL, and holder concentration, but lost $295M to an admin key compromise. On the composite alone it lands mid pack. With the exploit gate the engine returns `block`. Before this factor existed, no protocol had ever received one.

### Positions are never simulated

`positions/read`, `stress_test`, and `get_position_health` operate only on real on chain data read for a wallet address (Kamino obligations today, Drift pending). Without a wallet they return an empty set and say so. They never return sample positions.

---

## Quickstart

### TypeScript SDK (`@npmsolsentry/sdk`)

```ts
import { SolSentryClient } from '@npmsolsentry/sdk';

const sentry = new SolSentryClient({ baseUrl: 'https://solsentry.io' });

// The one call before signing.
const verdict = await sentry.guard({
  transaction: serializedTx,   // base58 or base64
  protocolSlug: 'kamino',      // optional: folds in protocol risk and policy
  action: 'borrow',
  amountUsd: 500,
});

if (!verdict.proceed) {
  console.warn('Do not sign:', verdict.blockingReasons);
} else {
  // safe to sign and broadcast
}
```

### CLI (`@npmsolsentry/cli`)

```bash
npm install -g @npmsolsentry/cli

# Score a protocol
solsentry check kamino --details

# Simulate and scan a transaction before signing
solsentry simulate 3s8xK9vW2zL... --encoding base58

# Evaluate a trade against the policy guardrails
solsentry policy swap jupiter 5000
```

### Model Context Protocol (MCP)

SolSentry exposes nine `solsentry_*` tools over stdio or HTTP at `/api/v1/mcp`. Add it to `claude_desktop_config.json` or your Cursor configuration:

```json
{
  "mcpServers": {
    "solsentry": {
      "command": "node",
      "args": ["/path/to/solsentry/packages/mcp-server/dist/index.js"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://your_project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your_service_role_key",
        "HELIUS_RPC_URL": "https://mainnet.helius-rpc.com/?api-key=your_key"
      }
    }
  }
}
```

---

## Monorepo layout

```
solsentry/
  app/                Next.js 14 web dashboard, docs, and API routes
    api/v1/           REST endpoints: guard, simulate, risk-check, mcp, stream
    dashboard/        Overview, simulator, positions, policies, alerts
  packages/
    core/             Risk scorer, simulator, drainer detector, wallet reader, data fetchers
    sdk/              TypeScript client (@npmsolsentry/sdk)
    cli/              Developer CLI (@npmsolsentry/cli)
    payment/          x402 USDC micropayment verifier (@npmsolsentry/payment)
    mcp-server/       Model Context Protocol server
  lib/                Shared auth, security, cache, and logging utilities
  sql/                PostgreSQL schema and row level security policies
```

---

## Testing

The suite includes property based fuzz testing over the scorer.

```bash
# Run the Vitest unit and fuzz suite
npm test -- --run

# Compile the workspace packages
npx tsc -p packages/sdk/tsconfig.json
npx tsc -p packages/cli/tsconfig.json
npx tsc -p packages/payment/tsconfig.json

# Production build
npm run build
```

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

Copyright (c) 2026 SolSentry.
