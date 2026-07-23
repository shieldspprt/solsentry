<div align="center">

# SolSentry

### Solana AI Agent Quantitative Risk Engine & Transaction Guardrail Middleware

[![Build Status](https://img.shields.io/badge/build-passing-emerald.svg?style=for-the-badge&logo=github)](https://github.com/shieldspprt/solsentry)
[![Model Version](https://img.shields.io/badge/model--version-v3.0.0-cyan.svg?style=for-the-badge)](file:///Users/abdurrehman/Desktop/Build/AgentGate/packages/core/src/risk-scorer.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-Server--v3.0.0-purple.svg?style=for-the-badge)](file:///Users/abdurrehman/Desktop/Build/AgentGate/packages/mcp-server)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](file:///Users/abdurrehman/Desktop/Build/AgentGate/LICENSE)

[Live Dashboard](https://solsentry.netlify.app) • [OpenAPI Spec](https://solsentry.netlify.app/api/v1/openapi.json) • [Documentation](file:///Users/abdurrehman/Desktop/Build/AgentGate/docs) • [Security Audits](file:///Users/abdurrehman/Desktop/Build/AgentGate/docs/audits)

</div>

---

## ⚡ Overview

**SolSentry** is an open-source, decision-grade quantitative risk engine, real-time transaction simulator, and policy guardrail middleware for **Solana AI trading agents and autonomous bots**.

SolSentry acts as a trusted **pre-flight security gateway** before any AI agent broadcasts a transaction on Solana mainnet. It calculates multi-factor risk scores, detects malicious wallet drainer instruction patterns, simulates pre-execution token balance deltas, and enforces strict financial policy guardrails (single transaction caps, daily volume limits, drawdown thresholds, and minimum protocol safety floors).

```
 ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
 │   Solana AI Agents      │      │    Agent Frameworks     │      │   Claude / Cursor / IDE │
 │ (Bots / Searchers / AI) │      │ (ElizaOS / Agent Kit)   │      │    (MCP Client StdIO)   │
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
│  Pyth Hermes Oracle │             │  Solana Mainnet RPC │             │ RugCheck & DefiLlama│
│ (Live De-peg & BPS) │             │ (Simulate & Deltas) │             │  (Tokens & TVL Data)│
└─────────────────────┘             └─────────────────────┘             └─────────────────────┘
```

---

## ✨ Key Capabilities

- 🛡️ **Provenance-Tagged Scoring Model (v3)**: Evaluates 7 institutional risk factors (Audit & Governance, Liquidation/Rekt, MEV & Bot Density, Whale Concentration, Pyth Oracle De-peg, Web & Dev Activity, Business Efficiency). Every metric is tagged with data source, timestamp, confidence intervals, and 7d/30d trend deltas.
- ⚡ **Transaction Pre-Execution Simulator**: Deserializes raw Solana base58/base64 transactions, replaces recent blockhashes, executes RPC simulation with `sigVerify: false`, tracks Compute Units (CU), and computes exact incoming vs. outgoing SOL/SPL token balance deltas.
- 🚨 **Wallet Drainer Pattern Detector**: Scans instruction logs for malicious sequences (`Approve` or `SetAuthority` followed by immediate `Transfer`/`CloseAccount`, or >90% account balance drains).
- 📉 **Stress Testing & Liquidation Engine**: Simulates adverse price shocks (-10%, -20%, -35%) to estimate portfolio capital at risk, cascade liquidation contagion, and exact collateral needed to restore safety.
- 📦 **Multi-Framework Integrations**:
  - `@solsentry/sdk`: Lightweight TypeScript client for custom Solana bots.
  - `@solsentry/eliza-plugin`: First-class plugin for ElizaOS (ai16z) agents.
  - Model Context Protocol (MCP): 8 canonical `solsentry_*` tools over stdio & HTTP.

---

## 🛠️ Quickstart Guides

### 1. TypeScript SDK (`@solsentry/sdk`)

Install `@solsentry/sdk` into any Node.js/TypeScript Solana trading bot or agent script:

```typescript
import { SolSentryClient } from '@solsentry/sdk';

const sentry = new SolSentryClient({
  baseUrl: 'https://solsentry.io',
  apiKey: 'ss_live_your_api_key_here',
});

// 1. One-shot pre-flight check before trading
const verdict = await sentry.preflight({
  action: 'swap',
  protocolSlug: 'jupiter',
  amountUsd: 2500,
});

if (verdict.decision === 'PROCEED') {
  console.log('Trade approved. Proceeding with execution...');
} else {
  console.warn('Trade blocked by guardrails:', verdict.blockingReasons);
  console.log('Max allowed USD:', verdict.maxAllowedUsd);
  console.log('Safer alternatives:', verdict.saferAlternatives);
}

// 2. Pre-execution Transaction Simulation & Drainer Scan
const sim = await sentry.simulateTransaction({
  transaction: 'raw_base58_serialized_solana_transaction_string',
});

console.log('Simulation status:', sim.status);
console.log('Compute Units consumed:', sim.unitsConsumed);
console.log('Drainer Risk Level:', sim.drainerScan.riskLevel);
console.log('Net Token Deltas:', sim.netTokenDeltas);
```

---

### 2. ElizaOS Agent Integration (`@solsentry/eliza-plugin`)

Integrate SolSentry risk actions into any ElizaOS AI Agent in 2 lines:

```typescript
import { solSentryPlugin } from '@solsentry/eliza-plugin';

export const agentConfig = {
  name: 'SolanaTradingAgent',
  plugins: [solSentryPlugin],
  // ... rest of agent configuration
};
```

---

### 3. Model Context Protocol (MCP) Server

SolSentry exposes 8 canonical MCP tools over stdio or HTTP (`/api/v1/mcp`). Add SolSentry to your `claude_desktop_config.json` or Cursor AI configuration:

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

#### Canonical MCP Tools Exposed:
- `solsentry_preflight`: One-shot `PROCEED` / `DO_NOT_PROCEED` trade verdict combining risk score and policy check.
- `solsentry_check_protocol_risk`: 7-factor institutional risk breakdown, safety score (`0..10`), drivers, and data quality metrics.
- `solsentry_simulate_transaction`: Simulates raw transaction, returning token balance deltas and drainer scan results.
- `solsentry_evaluate_policy`: Checks trade against single-tx caps, daily volume, drawdown, and position limits.
- `solsentry_stress_test`: Simulates price-shock scenarios (-10%, -20%, -35%) and liquidation cascade risks.
- `solsentry_get_position_health`: Reads live on-chain lending & perp position health factors.
- `solsentry_get_protocol_list`: Returns list of supported protocols and categories.
- `solsentry_get_business_ratios`: Financial sustainability metrics (fee-to-TVL, revenue capture).

---

## 🏛️ Monorepo Architecture

```
solsentry/
├── app/                        ← Next.js 14 Web Dashboard & API Routes
│   ├── api/v1/                 ← REST Endpoints (/risk-check, /simulate, /mcp, /webhooks/subscribe)
│   ├── dashboard/              ← Fund Manager Analytics, Simulator, Policies & Positions UI
├── packages/
│   ├── core/                   ← Quantitative Scorer, Stress Engine, Transaction Simulator & Fetchers
│   │   ├── src/
│   │   │   ├── data-fetchers/  ← Pyth, Helius, DefiLlama, RugCheck fetchers
│   │   │   ├── simulation/     ← Transaction Simulator & Drainer Detector
│   │   │   ├── risk-scorer.ts  ← 7-Factor Quantitative Scoring Engine (v3.0.0)
│   │   │   ├── stress-engine.ts← Asset-Tiered Price-Shock Cascade Simulator
│   ├── mcp-server/             ← Model Context Protocol (MCP) Server
│   ├── sdk/                    ← Official TypeScript Client SDK (@solsentry/sdk)
│   └── eliza-plugin/           ← Official ElizaOS Agent Plugin (@solsentry/eliza-plugin)
├── lib/                        ← Shared Auth, Security, Cache & Logging Utilities
├── docs/                       ← Architecture Documentation & Security Audits
│   └── audits/                 ← Public White-Hat Security Audit Reports
├── sql/                        ← PostgreSQL Database Schema & RLS Security Policies
```

---

## 🌐 Supported Solana Protocols & Actions

| Protocol | Category | Supported Actions | Pyth / On-Chain Feeds |
| :--- | :--- | :--- | :--- |
| **Jupiter** | DEX Aggregator / Perps | `swap`, `perp_long`, `perp_short` | Live Pyth & Helius |
| **Kamino** | Lending & Liquidity | `lend`, `borrow`, `lp` | Live On-Chain Klend SDK |
| **Drift** | Perpetual DEX | `perp_long`, `perp_short`, `lend` | Live Pyth & Market Stats |
| **Raydium** | AMM DEX | `swap`, `lp` | Live DefiLlama & Helius |
| **Orca** | Concentrated AMM | `swap`, `lp` | Live DefiLlama & Helius |
| **Meteora** | Dynamic Vaults / LST | `swap`, `lp` | Live DefiLlama |
| **Jito** | Liquid Staking | `stake`, `swap` | Live Pyth jitoSOL Feed |
| **Marinade** | Liquid Staking | `stake`, `swap` | Live Pyth mSOL Feed |
| **Pump.fun** | Launchpad | `buy_bonding_curve`, `swap` | RugCheck & Wallet Metrics |

---

## 🧪 Testing & Verification

SolSentry features an extensive automated test suite including property-based fuzz testing (`fast-check`):

```bash
# Run Vitest Unit & Fuzz Test Suite (26 Tests Across 7 Test Files)
npm test -- --run

# Build TypeScript Packages (@solsentry/sdk & @solsentry/eliza-plugin)
npx tsc -p packages/sdk/tsconfig.json
npx tsc -p packages/eliza-plugin/tsconfig.json

# Run Next.js Production Build
npm run build
```

---

## 🔒 Security & Disclosure Policy

SolSentry takes security seriously. All database queries enforce Row Level Security (RLS), Edge middleware validates `ss_` API keys, and HTTP headers enforce strict Content-Security-Policy (CSP) headers without `unsafe-eval`.

- **Security Audits**: See [`docs/audits/security-audit-v3.md`](file:///Users/abdurrehman/Desktop/Build/AgentGate/docs/audits/security-audit-v3.md).
- **Vulnerability Reporting**: Read [`SECURITY.md`](file:///Users/abdurrehman/Desktop/Build/AgentGate/SECURITY.md) to report vulnerabilities privately.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](file:///Users/abdurrehman/Desktop/Build/AgentGate/LICENSE) for more information.

Copyright (c) 2026 SolSentry Team.
