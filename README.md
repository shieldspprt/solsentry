<div align="center">

# SolSentry

### Solana AI Agent Quantitative Risk Engine & Transaction Guardrail Middleware

[![Build Status](https://img.shields.io/badge/build-passing-emerald.svg?style=for-the-badge&logo=github)](https://github.com/shieldspprt/solsentry)
[![Model Version](https://img.shields.io/badge/model--version-v3.0.0-cyan.svg?style=for-the-badge)](file:///Users/abdurrehman/Desktop/Build/AgentGate/packages/core/src/risk-scorer.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-Server--v3.0.0-purple.svg?style=for-the-badge)](file:///Users/abdurrehman/Desktop/Build/AgentGate/packages/mcp-server)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](file:///Users/abdurrehman/Desktop/Build/AgentGate/LICENSE)

[Live Dashboard](https://solsentry.io/dashboard) • [API & SDK Playground](https://solsentry.io/docs) • [OpenAPI Spec](https://solsentry.io/api/v1/openapi.json) • [Security Audits](file:///Users/abdurrehman/Desktop/Build/AgentGate/docs/audits)

</div>

---

## ⚡ Overview

**SolSentry** is an open-source, decision-grade quantitative risk engine, real-time transaction simulator, and policy guardrail middleware for **Solana AI trading agents and autonomous bots**.

SolSentry acts as a trusted **pre-flight security gateway** before any AI agent broadcasts a transaction on Solana mainnet. It calculates multi-factor risk scores, detects malicious wallet drainer instruction patterns, simulates pre-execution token balance deltas, and enforces strict financial policy guardrails (single transaction caps, daily volume limits, drawdown thresholds, and minimum protocol safety floors).

```
 ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
 │   Solana AI Agents      │      │    Agent Frameworks     │      │   Claude / Cursor / IDE │
 │ (Bots / CLI / Autonomy) │      │(Eliza / Agent Kit / Lang)│      │    (MCP Client StdIO)   │
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

- 🛡️ **Provenance-Tagged Scoring Model (v3)**: Evaluates institutional risk factors (Audit & Governance, Liquidation/Rekt, MEV & Bot Density, Whale Concentration, Pyth Oracle De-peg, Web & Dev Activity, Business Efficiency). Every metric is tagged with data source, timestamp, confidence intervals, and trend deltas.
- ⚡ **Transaction Pre-Execution Simulator**: Deserializes raw Solana base58/base64 transactions, replaces recent blockhashes, executes RPC simulation with `sigVerify: false`, tracks Compute Units (CU), and computes exact incoming vs. outgoing SOL/SPL token balance deltas.
- 🚨 **Wallet Drainer Pattern Detector**: Scans instruction logs for malicious sequences (`Approve` or `SetAuthority` followed by immediate `Transfer`/`CloseAccount`, or >90% account balance drains).
- 📉 **Stress Testing & Historical Backtesting Engine**: Simulates adverse price shocks (-10%, -20%, -35%) and historical market crash scenarios (Nov 2022 FTX, March 2023 USDC de-peg, Feb 2022 Wormhole hack) to evaluate policy guardrail protection.
- 💳 **x402 Pay-As-You-Go USDC Micropayments (`@solsentry/payment`)**: Native Solana Pay USDC micro-payments (`X-402-Payment` header) per MCP/API call.
- 🤖 **Autonomous Execution Engine (`@solsentry/agent-autonomy`)**: Automated de-leveraging transaction instruction generation, portfolio rebalancing, and circuit breaker halts.
- 💻 **Official Developer CLI (`@solsentry/cli`)**: Standalone terminal binary for instant protocol risk checks, transaction simulation, and policy evaluation.
- 📦 **Multi-Framework Integrations**:
  - `@solsentry/sdk`: Lightweight TypeScript client for custom Solana bots.
  - `@solsentry/cli`: Global CLI tool (`npm install -g @solsentry/cli`).
  - `@solsentry/eliza-plugin`: Official plugin for ElizaOS (ai16z) agents.
  - `@solsentry/agent-kit`: Official plugin for Solana Agent Kit (`ai16z`).
  - `@solsentry/langchain`: Structured Tools for LangChain & CrewAI.
  - Model Context Protocol (MCP): 8 canonical `solsentry_*` tools over stdio & HTTP.

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

### 3. Solana Agent Kit Integration (`@solsentry/agent-kit`)

Integrate SolSentry risk actions into `solana-agent-kit` (ai16z):

```typescript
import { SolSentryAgentKitPlugin } from '@solsentry/agent-kit';

const sentryPlugin = new SolSentryAgentKitPlugin({
  apiKey: process.env.SOLSENTRY_API_KEY,
});

const risk = await sentryPlugin.checkProtocolRiskTool('kamino');
console.log('Safety Score:', risk.score);
```

---

### 4. LangChain & CrewAI Tools (`@solsentry/langchain`)

Expose SolSentry tools to LangChain or CrewAI agents:

```typescript
import { SolSentryRiskCheckTool, SolSentrySimulateTool } from '@solsentry/langchain';

const riskTool = new SolSentryRiskCheckTool();
const simTool = new SolSentrySimulateTool();
```

---

### 5. ElizaOS Agent Integration (`@solsentry/eliza-plugin`)

Integrate SolSentry risk actions into any ElizaOS AI Agent:

```typescript
import { solSentryPlugin } from '@solsentry/eliza-plugin';

export const agentConfig = {
  name: 'SolanaTradingAgent',
  plugins: [solSentryPlugin],
};
```

---

### 6. Model Context Protocol (MCP) Server

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

---

## 🏛️ Monorepo Architecture

```
solsentry/
├── app/                        ← Next.js 14 Web Dashboard, Docs & API Routes
│   ├── api/v1/                 ← REST Endpoints (/risk-check, /simulate, /mcp, /stream)
│   ├── dashboard/              ← Analytics, Simulator, Policies, Agents, Alerts UI
│   ├── docs/                   ← Interactive API & SDK Developer Playground
├── packages/
│   ├── core/                   ← Quantitative Scorer, Stress Engine, Simulator & Backtester
│   ├── sdk/                    ← Official TypeScript Client SDK (@solsentry/sdk)
│   ├── cli/                    ← Official Developer CLI Tool (@solsentry/cli)
│   ├── payment/                ← x402 USDC Pay-As-You-Go Micropayment Verifier (@solsentry/payment)
│   ├── agent-autonomy/         ← Autonomous Execution Engine (@solsentry/agent-autonomy)
│   ├── agent-kit/              ← Official Solana Agent Kit Plugin (@solsentry/agent-kit)
│   ├── langchain/              ← LangChain & CrewAI Structured Tools (@solsentry/langchain)
│   ├── eliza-plugin/           ← Official ElizaOS Agent Plugin (@solsentry/eliza-plugin)
│   └── mcp-server/             ← Model Context Protocol (MCP) Server
├── lib/                        ← Shared Auth, Security, Cache & Logging Utilities
├── docs/                       ← Architecture Documentation, Cookbooks & Security Audits
└── sql/                        ← PostgreSQL Database Schema & RLS Security Policies
```

---

## 🧪 Testing & Verification

SolSentry features an extensive automated test suite including property-based fuzz testing (`fast-check`):

```bash
# Run Vitest Unit & Fuzz Test Suite (26 Tests Across 7 Test Files)
npm test -- --run

# Compile All Workspace Packages (SDK, CLI, Payment, Autonomy, Agent Kit, LangChain, Eliza)
npx tsc -p packages/sdk/tsconfig.json
npx tsc -p packages/cli/tsconfig.json
npx tsc -p packages/payment/tsconfig.json
npx tsc -p packages/agent-autonomy/tsconfig.json
npx tsc -p packages/agent-kit/tsconfig.json
npx tsc -p packages/langchain/tsconfig.json
npx tsc -p packages/eliza-plugin/tsconfig.json

# Run Next.js Production Build
npm run build
```

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](file:///Users/abdurrehman/Desktop/Build/AgentGate/LICENSE) for more information.

Copyright (c) 2026 SolSentry Team.
