<div align="center">

# SolSentry

### Solana AI Agent Quantitative Risk Engine & Transaction Guardrail Middleware

[![Model Version](https://img.shields.io/badge/model--version-v3.0.0-cyan.svg?style=for-the-badge)](packages/core/src/risk-scorer.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-Server--v3.0.0-purple.svg?style=for-the-badge)](packages/mcp-server)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

[Live Dashboard](https://solsentry.io/dashboard) • [API & SDK Playground](https://solsentry.io/docs) • [OpenAPI Spec](https://solsentry.io/api/v1/openapi.json) • [Security Audits](docs/audits) • [Data Integrity Audit](docs/DATA_INTEGRITY_AUDIT.md)

</div>

---

## ⚡ Overview

**Never sign a drainer.** SolSentry runs your agent's transaction against mainnet *without broadcasting it*, reports exactly which tokens leave the wallet, and flags known wallet-drainer instruction patterns before a signature is ever produced.

```ts
const check = await sentry.simulate(serializedTx);
if (check.drainerScan.isDrainerPattern) return;   // do not sign
```

Around that sits an open-source, provenance-tagged protocol risk engine and policy guardrail middleware for **Solana AI trading agents and autonomous bots**.

It acts as a pre-flight gateway before an agent broadcasts anything on mainnet: multi-factor protocol risk scores, drainer detection, pre-execution balance deltas, and policy guardrails (single-transaction caps, daily volume limits, drawdown thresholds, minimum safety floors).

```
 ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
 │   Solana AI Agents      │      │   @solsentry/sdk + CLI  │      │   Claude / Cursor / IDE │
 │  (Bots / Autonomous)    │      │   (TypeScript client)   │      │    (MCP Client StdIO)   │
 └────────────┬────────────┘      └────────────┬────────────┘      └────────────┬────────────┘
              │                                │                                │
              └────────────────────────────────┼────────────────────────────────┘
                                               │
                                 ┌─────────────▼─────────────┐
                                 │      SolSentry Engine     │
                                 │ (MCP / REST / TS SDK v3)  │
                                 └─────────────┬─────────────┘
                                               │
           ┌───────────────────────────────────┼───────────────────────────────────┐
           │                                   │                                   │
┌──────────▼──────────┐             ┌──────────▼──────────┐             ┌──────────▼──────────┐
│  Pyth · per-protocol│             │  Solana Mainnet RPC │             │ DeFiLlama · Jupiter │
│ feeds + depeg (bps) │             │ (Simulate & Deltas) │             │ TVL/fees·hacks·token│
└─────────────────────┘             └─────────────────────┘             └─────────────────────┘
```

---

## ✨ Key Capabilities

- 🛡️ **`guard_transaction` — the one call before signing**: Give it a serialized transaction and it simulates the bytes against mainnet, scans for drainer patterns, and (with optional `protocolSlug`/`action`/`amountUsd`) folds in the exploit/risk gate and policy guardrails into a single **SIGN / DO_NOT_SIGN** verdict. Over MCP and `POST /api/v1/guard`.
- 🚨 **Wallet Drainer Detection**: Deserializes a raw base58/base64 transaction, simulates it against mainnet RPC with `sigVerify: false`, and scans the instruction sequence for drainer patterns — `Approve`/`SetAuthority` followed by an immediate `Transfer`/`CloseAccount`, or a >90% balance sweep. Read-only, needs no key material, broadcasts nothing.
- 🛡️ **Provenance-Tagged Scoring Model (v3)**: Eight risk factors, each tagged with its data source, timestamp and confidence. **A factor with no live source is reported as `unmeasured` — it scores nothing and its weight is redistributed across the factors that do have data.** The response carries a `factor_coverage` object so a caller can see exactly how much of the model is grounded, and the engine withholds a directional recommendation below 50% coverage. See [Factor coverage](#-factor-coverage-what-is-actually-measured).
- ⚡ **Transaction Pre-Execution Simulator**: Replaces recent blockhashes, tracks Compute Units, and computes exact incoming vs. outgoing SOL/SPL token balance deltas.
- 📉 **Stress Testing**: Simulates adverse price shocks (-10%, -20%, -35%) against REAL on-chain positions, reporting which liquidate, capital at risk, and the collateral needed to restore a safe health factor.
- 💳 **x402 Pay-As-You-Go USDC Micropayments (`@solsentry/payment`)**: Solana Pay USDC micro-payments via the `X-402-Payment` header, enforced on `/api/v1/simulate`. **Off unless `X402_RECIPIENT_WALLET` is set** — every endpoint is free until you configure a wallet.
- 💻 **Official Developer CLI (`@solsentry/cli`)**: Standalone terminal binary for instant protocol risk checks, transaction simulation, and policy evaluation.
- 📦 **Two integration paths, both maintained**:
  - Model Context Protocol (MCP): 9 canonical `solsentry_*` tools over stdio & HTTP — Claude, Cursor, any MCP client.
  - `@solsentry/sdk`: TypeScript client for custom Solana bots, and `@solsentry/cli` for the terminal.

---

## 📊 Factor coverage: what is actually measured

Eight factors. An unmeasured one returns `score: null`, `source: "unmeasured"`,
and contributes nothing — its weight is redistributed across the rest.

| Factor | Weight | Source | Status |
|---|---|---|---|
| **Exploit History** | **25%** | DeFiLlama hacks dataset | ✅ Measured — realized losses, decayed by age. **Can force a `block` verdict on its own** (see below). |
| Audit & Governance | 15% | Protocol registry + published governance docs | ✅ Measured |
| Liquidation & Rekt Risk | 15% | — | ⬜ Unmeasured — protocol-wide near-liquidation ratios need per-obligation indexing. Use `solsentry_get_position_health` with a wallet for real, position-level liquidation risk. |
| Oracle Health & Depeg | 15% | Pyth Hermes, **per protocol** | ✅ Measured — scores the *weakest* feed a protocol's solvency depends on (Kamino checks 5 feeds; Jito's worst is JITOSOL/USD), plus stablecoin deviation from $1.00. |
| Whale Concentration | 10% | Helius `getTokenLargestAccounts`, Jupiter as fallback | ✅ Measured |
| Market Integrity | 10% | Jupiter Token API (organic-activity score) | ✅ Measured — the **governance token's** market: organic vs bot/arbitrage volume, plus mint/freeze authority. A proxy for manipulation and dump risk, **not** for sandwich risk on a swap. |
| Developer Activity | 5% | GitHub REST API (commits + contributors, 30d) | ✅ Measured — scores *abandonment*, not commit volume. Set `GITHUB_TOKEN`. |
| Business Efficiency | 5% | DeFiLlama (TVL, fee series, category share) | ✅ Measured |

Live coverage is **~86% of model weight** (7 of 8 factors) with `GITHUB_TOKEN` set.
Every API response and every protocol page states its own coverage; below 50% the engine returns
`HOLD` and withholds a directional call rather than inferring one from too little evidence.

### Exploit history can override the composite

A realized loss is the only factor describing what has actually *happened* to a protocol rather
than how it looks. Averaging it into seven healthy-looking co-factors buries it, so it gates the
verdict directly:

- A loss ≥ **$10M** within **180 days** → verdict forced to `block`
- A loss ≥ **$1M** within 180 days → capped at `avoid`
- Older incidents still lower the score, decaying to ~10% weight over three years

Live example: Drift scores well on audits, TVL and holder concentration, but lost **$295M** to an
admin-key compromise 114 days ago. Composite alone puts it mid-pack; the engine returns
**`block`**. Before this factor existed, no protocol had ever received one.

**Positions are never simulated.** `positions/read`, `stress_test` and
`get_position_health` operate only on real on-chain data read for a wallet
address (Kamino obligations today; Drift pending). Without a wallet they return
an empty set and say so — they do not return sample positions.

---

## 🛠️ Quickstart Guides

### 1. Developer CLI Tool (`@solsentry/cli`)

Install the global CLI tool to check risks and simulate transactions directly from your terminal:

```bash
# Global installation
npm install -g @solsentry/cli

# Check protocol risk
solsentry check kamino --details

# Simulate raw base58 transaction payload before signing
solsentry simulate 3s8xK9vW2zL... --encoding base58

# Evaluate trade policy guardrails
solsentry policy swap jupiter 5000
```

---

### 2. TypeScript SDK (`@solsentry/sdk`)

Install `@solsentry/sdk` into any Node.js/TypeScript Solana trading bot or agent script:

```typescript
import { SolSentryClient } from '@solsentry/sdk';

const sentry = new SolSentryClient({
  baseUrl: 'https://solsentry.io',
  apiKey: 'ss_live_your_api_key_here',
});

// One-shot pre-flight check before trading
const verdict = await sentry.preflight({
  action: 'swap',
  protocolSlug: 'jupiter',
  amountUsd: 2500,
});

if (verdict.decision === 'PROCEED') {
  console.log('Trade approved. Proceeding with execution...');
} else {
  console.warn('Trade blocked by guardrails:', verdict.blockingReasons);
}
```

---

### 3. Model Context Protocol (MCP) Server

SolSentry exposes 9 canonical MCP tools over stdio or HTTP (`/api/v1/mcp`). Add SolSentry to your `claude_desktop_config.json` or Cursor AI configuration:

```json
{
  "mcpServers": {
    "solsentry": {
      "command": "node",
      "args": ["/path/to/solsentry/packages/mcp-server/dist/index.js"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your_service_role_key",
        "HELIUS_RPC_URL": "https://mainnet.helius-rpc.com/?api-key=your_key"
      }
    }
  }
}
```

---

## 🏛️ Monorepo Architecture

```
solsentry/
├── app/                        ← Next.js 14 Web Dashboard, Docs & API Routes
│   ├── api/v1/                 ← REST Endpoints (/risk-check, /simulate, /mcp, /stream)
│   ├── dashboard/              ← Analytics, Simulator, Policies, Agents, Alerts UI
│   ├── docs/                   ← Interactive API & SDK Developer Playground
├── packages/
│   ├── core/                   ← Risk Scorer, Simulator, Drainer Detector, Wallet Reader, Data Fetchers
│   ├── sdk/                    ← Official TypeScript Client SDK (@solsentry/sdk)
│   ├── cli/                    ← Official Developer CLI Tool (@solsentry/cli)
│   ├── payment/                ← x402 USDC Pay-As-You-Go Micropayment Verifier (@solsentry/payment)
│   └── mcp-server/             ← Model Context Protocol (MCP) Server
├── lib/                        ← Shared Auth, Security, Cache & Logging Utilities
├── docs/                       ← Architecture Documentation, Cookbooks & Security Audits
└── sql/                        ← PostgreSQL Database Schema & RLS Security Policies
```

---

## 🧪 Testing & Verification

SolSentry features an extensive automated test suite including property-based fuzz testing (`fast-check`):

```bash
# Run the Vitest unit & property-based fuzz suite
npm test -- --run

# Compile workspace packages
npx tsc -p packages/sdk/tsconfig.json
npx tsc -p packages/cli/tsconfig.json
npx tsc -p packages/payment/tsconfig.json

# Run Next.js Production Build
npm run build
```

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

Copyright (c) 2026 SolSentry Team.
