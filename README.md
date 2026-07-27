<div align="center">

# SolSentry

### A transaction guard and protocol risk engine for Solana AI agents

[![Model Version](https://img.shields.io/badge/model-v3.1.5-cyan.svg?style=for-the-badge)](packages/core/src/risk-scorer.ts)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MCP Ready](https://img.shields.io/badge/MCP-9%20tools-purple.svg?style=for-the-badge)](packages/mcp)
[![Tests](https://img.shields.io/badge/tests-69%20passing-brightgreen.svg?style=for-the-badge)](packages/core/src/__tests__)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)
[![npm](https://img.shields.io/badge/npm-%40npmsolsentry%2Fmcp-red.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@npmsolsentry/mcp)
[![Smithery](https://img.shields.io/badge/Smithery-verified-purple.svg?style=for-the-badge)](https://smithery.ai/server/@npmsolsentry/mcp)

[Live Dashboard](https://solsentry.netlify.app/dashboard) &nbsp;·&nbsp; [API & SDK Playground](https://solsentry.netlify.app/docs) &nbsp;·&nbsp; [OpenAPI Spec](https://solsentry.netlify.app/api/v1/openapi.json) &nbsp;·&nbsp; [Data Integrity Audit](docs/DATA_INTEGRITY_AUDIT.md)

</div>

---

## Overview

**Never sign a drainer.** SolSentry runs your agent's transaction against Solana mainnet without broadcasting it. It reports exactly which tokens leave the wallet, flags known wallet drainer instruction patterns, and, when you name the protocol, folds in protocol risk and policy guardrails. One request returns a single verdict.

```ts
const verdict = await sentry.guard({ transaction, protocolSlug: 'kamino' });
if (!verdict.proceed) return;   // do not sign
```

Around that sits an open source, provenance tagged protocol risk engine and policy guardrail middleware for Solana AI trading agents and autonomous bots. Every risk factor names its data source. Anything the engine cannot measure is reported as unmeasured rather than filled in with a plausible constant.

### What is new in v3.1.5

The guard answers a question at the moment you ask it. This release is mostly about the two problems that sit on either side of that moment: not crying wolf when a transaction is ordinary, and noticing when a feed goes wrong between calls.

| Area | Change |
| :--- | :--- |
| **Fewer false positives** | Routine CPI token transfers and compensated swap sweeps are now returned as *observations* with zero penalty. A drainer signal requires corroboration: an authority mutation, or a measured balance sweep the wallet is not paid back for. |
| **Deeper simulation** | Typed SPL Token and Token&#8209;2022 inner instruction parsing, address lookup table resolution, and native payer balance analysis, surfaced through the SDK and the simulator UI. |
| **Explainable anomaly detection** | A per feed rolling median/MAD + EWMA baseline over price returns, confidence band expansion, staleness, slot lag, and stablecoin de&#8209;peg. Events carry severity, score, and per feature contributions. |
| **Durability** | Detector state, anomaly events, webhook subscriptions, and delivery outcomes persist in Supabase. Deterministic event IDs are claimed before side effects, so a serverless fleet cannot double fire a webhook. |
| **One poller per process** | Per client anomaly polling was replaced by a shared process monitor, so ten dashboard tabs cost one upstream subscription rather than ten. |
| **Resilient WebSocket streaming** | A browser native `slotSubscribe` stream with jittered exponential backoff that closes unhealthy idle sockets instead of presenting stale network state as live. |
| **Supply chain** | Next.js, React, Vitest, and vulnerable transitive dependencies upgraded. All audited package trees report zero vulnerabilities. |
| **Housekeeping** | Middleware migrated to the `proxy.ts` convention, root level patch scripts removed, and the oracle sampling bucket corrected so it can never precede Pyth's `asOf` timestamp. |

Package metadata, the Smithery manifest, and the app constants are aligned at **v3.1.5**. See the [CHANGELOG](CHANGELOG.md) for the full history.

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
- **Wallet drainer detection.** Deserializes a base58 or base64 transaction, simulates it with `sigVerify: false`, and scans top-level plus inner CPI instructions. Routine SPL transfers inside swaps, lending, and staking are returned as observations with zero penalty; they become a drainer signal only when corroborated by an authority mutation or a measured balance sweep. Read only, needs no key material, broadcasts nothing.
- **Provenance tagged scoring.** Eight risk factors, each carrying its data source, timestamp, and confidence. A factor with no live source is reported as unmeasured, scores nothing, and has its weight redistributed across the factors that do have data. Every response includes a `factor_coverage` object, and the engine withholds a directional recommendation below 50% coverage.
- **Realized exploit gate.** Every protocol is checked against DeFiLlama's hacks dataset. A large recent loss can force a `block` verdict on its own, regardless of how healthy the other factors look. See [Exploit history can override the score](#exploit-history-can-override-the-score).
- **Transaction simulator.** Asks the RPC to replace the recent blockhash, tracks compute units, resolves address-lookup-table keys, and reports incoming/outgoing token deltas plus parsed SPL Token and Token-2022 CPI transfers.
- **Explainable oracle anomaly detection.** A per feed online detector maintains a rolling median/MAD baseline plus an EWMA variance estimate over five features: price return, confidence band expansion, oracle staleness, slot lag, and stablecoin de-peg. Guardrail thresholds fire immediately on dangerous readings even before a baseline has warmed up. Every event names the features that drove it and the size of the window behind them, so an agent can act on a reason rather than a bare score. See [Live monitoring](#live-monitoring-and-anomaly-events).
- **Durable, deduplicated alerting.** Detector baselines, anomaly events, webhook subscriptions, and delivery outcomes persist in Postgres. Deterministic event IDs are claimed before any side effect, so two serverless instances observing the same feed cannot deliver the same webhook twice.
- **Stress testing.** Applies adverse price shocks against real on chain positions and reports which liquidate, the capital at risk, and the collateral needed to restore a safe health factor.
- **Pay per call in USDC.** Solana Pay micropayments through the `X-402-Payment` header. Billing stays off until `X402_RECIPIENT_WALLET` is set, so every endpoint is free until you configure a wallet.

---

## Factor coverage: what is actually measured

Eight factors. An unmeasured factor returns `score: null`, `source: "unmeasured"`, and contributes nothing; its weight is redistributed across the rest. A factor that does not apply to a protocol (for example, borrow liquidation on a DEX) is marked not applicable and excluded from that protocol's coverage denominator, rather than counted as a gap.

| Factor | Weight | Source | Status |
| :--- | :--- | :--- | :--- |
| Exploit History | 25% | DeFiLlama hacks dataset | Measured. Realized losses, decayed by age. Can force a `block` verdict on its own. |
| Audit & Governance | 15% | Protocol registry and published governance docs | Measured. |
| Liquidity & Liquidation | 15% | Kamino market utilization | Measured for lending markets (borrowed over supplied liquidity). Not applicable to protocols with no borrow book. |
| Oracle Health & Depeg | 15% | Pyth Hermes, per protocol | Measured. Scores the weakest feed a protocol's solvency depends on, plus stablecoin deviation from one dollar. |
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

## Live monitoring and anomaly events

A guard call answers a question at the instant you ask it. Between calls, `GET /api/v1/stream` keeps watching. It is a Server-Sent Events feed carrying two event families:

- `event: telemetry` — raw Pyth Hermes readings for SOL, USDC, and USDT: price, confidence interval, staleness, and health score.
- `event: anomaly` — scored, explainable anomaly events.

### What the detector actually measures

Each feed carries an independent baseline: a rolling median with median absolute deviation, plus an EWMA mean and variance for feeds that drift. Five features are scored against it.

| Feature | What a spike means |
| :--- | :--- |
| `price_return_bps` | Move between consecutive samples, relative to the feed's own normal volatility. |
| `confidence_expansion_bps` | Publishers disagreeing more than usual — the earliest warning of oracle driven liquidation risk. |
| `oracle_staleness_ms` | The feed has stopped updating. |
| `slot_lag_ms` | The oracle is falling behind the chain. |
| `stablecoin_depeg_bps` | Distance from one dollar on a feed that is supposed to hold it. |

Two properties matter for an agent consuming this:

1. **It explains itself.** Every event carries `severity`, a 0–100 `score`, `feature_contributions` naming which features drove it and by how much, and `baseline_window` counts so you can tell a warmed-up baseline from a cold one.
2. **It does not wait to warm up.** Baseline z-scores need history, so hardcoded guardrail thresholds fire immediately on dangerous absolute readings. A de-peg during the first minute of uptime still alerts.

### Delivery guarantees

All SSE clients in one process share a single upstream poller. With Supabase configured, the detector snapshot survives cold starts and deterministic event IDs are claimed in Postgres *before* any side effect, so two serverless instances observing the same feed cannot deliver the same webhook twice. Without Supabase the stream still works and says explicitly that it is running in process-only mode.

Sampling buckets are derived from Pyth's own `asOf` timestamp, so a bucket can never be stamped earlier than the data it contains.

### Subscribing to a callback

```bash
curl -X POST https://solsentry.netlify.app/api/v1/webhooks/subscribe \
  -H "X-SolSentry-API-Key: $SOLSENTRY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://alerts.example.com/solsentry","events":["oracle_anomaly"]}'
```

Subscriptions are attributed to the API key that created them. `GET` the same endpoint with that key to list your callbacks. Callback URLs are validated, and HTTPS is enforced in production.

### Network health in the dashboard

The alerts view also holds a direct `slotSubscribe` JSON-RPC WebSocket to the configured Solana RPC. It reconnects with jittered exponential backoff, re-subscribes on every open, and marks an idle socket unhealthy rather than presenting stale network state as live. No wallet or transaction data is sent over it — point `NEXT_PUBLIC_SOLANA_WS_URL` at a public RPC.

---

## Quickstart

### TypeScript SDK (`@npmsolsentry/sdk`)

```ts
import { SolSentryClient } from '@npmsolsentry/sdk';

const sentry = new SolSentryClient({ baseUrl: 'https://solsentry.netlify.app' });

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

SolSentry exposes nine `solsentry_*` tools over stdio via the published `@npmsolsentry/mcp` package. The package is a thin proxy that forwards calls to the hosted SolSentry engine (`https://solsentry.netlify.app/api/v1/mcp`), so it holds no keys and runs no engine code locally.

#### Quick install (Claude Desktop, Cursor, any MCP client)

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "solsentry": {
      "command": "npx",
      "args": ["-y", "@npmsolsentry/mcp"],
      "env": {
        "SOLSENTRY_URL": "https://solsentry.netlify.app",
        "SOLSENTRY_API_KEY": "your_api_key_optional"
      }
    }
  }
}
```

**Cursor** — `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "solsentry": {
      "command": "npx",
      "args": ["-y", "@npmsolsentry/mcp"],
      "env": {
        "SOLSENTRY_URL": "https://solsentry.netlify.app"
      }
    }
  }
}
```

**Any stdio MCP client** — run directly:

```bash
npx -y @npmsolsentry/mcp
```

#### Available tools (proxied from hosted engine)

| Tool | Description |
|------|-------------|
| `solsentry_guard_transaction` | Simulate transaction bytes, scan for drainers, and apply optional protocol and policy gates. |
| `solsentry_simulate_transaction` | Dry-run simulation: balance deltas, inner SPL transfers, compute units, and drainer signals. |
| `solsentry_check_protocol_risk` | Full grounded eight-factor risk score for a protocol slug. |
| `solsentry_get_protocol_list` | List tracked protocols with live telemetry and risk ratings. |
| `solsentry_evaluate_policy` | Check an intended action against financial guardrails. |
| `solsentry_preflight` | Run protocol risk and policy evaluation for one pre-trade verdict. |
| `solsentry_stress_test` | Apply adverse price shocks and report liquidation and capital at risk. |
| `solsentry_get_position_health` | Read positions and evaluate health factors and liquidation distance. |
| `solsentry_get_business_ratios` | Compute fee-to-TVL, revenue-capture, and TVL-efficiency metrics. |

---

## Concrete Agent Usage Patterns

These are copy-paste ready patterns for the most common agent frameworks. Each shows the *exact* call sequence an autonomous agent should use before signing any Solana transaction.

### 1. Vercel AI SDK (Node/Next.js)

```ts
import { SolSentryClient } from '@npmsolsentry/sdk';
import { tool } from 'ai';
import { z } from 'zod';

const sentry = new SolSentryClient({ baseUrl: 'https://solsentry.netlify.app' });

const guardTx = tool({
  description: 'Simulate and risk-check a Solana transaction before signing',
  parameters: z.object({
    txBase58: z.string(),
    protocolSlug: z.string().optional(),
    action: z.enum(['swap','lend','borrow','lp','stake','perp_long','perp_short','buy_bonding_curve']).optional(),
    amountUsd: z.number().optional(),
  }),
  execute: async ({ txBase58, protocolSlug, action, amountUsd }) => {
    const verdict = await sentry.guard({ transaction: txBase58, protocolSlug, action, amountUsd });
    if (!verdict.proceed) {
      throw new Error(`BLOCKED: ${verdict.blockingReasons.join('; ')}`);
    }
    return { proceed: true, riskScore: verdict.riskScore, factors: verdict.factors };
  },
});

// Agent usage:
// await agent.generate({ tools: { guardTx }, prompt: 'User wants to swap 5000 USDC on Jupiter. Here is the serialized tx: <tx>...' });
```

### 2. LangChain / LangGraph (Python)

```python
from langchain_core.tools import tool
from pydantic import BaseModel
import httpx

SENTRY_URL = "https://solsentry.netlify.app/api/v1/guard"

class GuardInput(BaseModel):
    transaction: str          # base58 or base64
    protocol_slug: str | None = None
    action: str | None = None
    amount_usd: float | None = None

@tool("guard_solana_transaction")
async def guard_transaction(input: GuardInput) -> dict:
    """Simulate and risk-check a Solana transaction before signing. Returns verdict + reasons."""
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(SENTRY_URL, json=input.model_dump(exclude_none=True))
        resp.raise_for_status()
        data = resp.json()
        if not data.get("proceed"):
            raise RuntimeError(f"BLOCKED: {data.get('blockingReasons', ['unknown'])}")
        return data

# In a LangGraph node:
# async def check_tx(state):
#     result = await guard_transaction.ainvoke(state["tx_payload"])
#     return {**state, "guard_result": result}
```

### 3. CrewAI (Python)

```python
from crewai.tools import BaseTool
from pydantic import BaseModel, Field
import httpx

class GuardTransactionTool(BaseTool):
    name: str = "SolSentry Transaction Guard"
    description: str = "Simulate a Solana transaction, detect drainers, and apply protocol risk + policy guardrails. Call this BEFORE signing any transaction."
    
    def _run(self, tx_base58: str, protocol_slug: str = None, action: str = None, amount_usd: float = None) -> str:
        payload = {"transaction": tx_base58}
        if protocol_slug: payload["protocolSlug"] = protocol_slug
        if action: payload["action"] = action
        if amount_usd: payload["amountUsd"] = amount_usd
        
        resp = httpx.post("https://solsentry.netlify.app/api/v1/guard", json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        
        if not data.get("proceed"):
            return f"BLOCKED — {', '.join(data.get('blockingReasons', ['unknown']))}"
        return f"SAFE — Risk score: {data.get('riskScore', 'N/A')}, Coverage: {data.get('factorCoverage', {}).get('measuredPct', 'N/A')}%"

# Agent usage:
# trading_agent = Agent(
#     role="Solana Trader",
#     tools=[GuardTransactionTool()],
#     system_prompt="Never sign a transaction without calling GuardTransactionTool first."
# )
```

### 4. AutoGen (Python)

```python
import json
from autogen import AssistantAgent, UserProxyAgent
import httpx

def guard_transaction(tx_base58: str, protocol_slug: str = None, action: str = None, amount_usd: float = None) -> str:
    payload = {"transaction": tx_base58}
    if protocol_slug: payload["protocolSlug"] = protocol_slug
    if action: payload["action"] = action
    if amount_usd: payload["amountUsd"] = amount_usd
    
    r = httpx.post("https://solsentry.netlify.app/api/v1/guard", json=payload, timeout=20)
    r.raise_for_status()
    data = r.json()
    
    if not data.get("proceed"):
        return json.dumps({"allowed": False, "reasons": data.get("blockingReasons")})
    return json.dumps({"allowed": True, "riskScore": data.get("riskScore"), "factors": data.get("factors")})

# Register as a function tool:
# trading_assistant = AssistantAgent(
#     name="Trader",
#     system_message="You are a Solana trading agent. ALWAYS call guard_transaction before signing.",
#     function_map={"guard_transaction": guard_transaction},
# )
```

### 5. MCP-based Agents (Claude, Cursor, Continue, etc.)

**Prompt pattern for any MCP-enabled agent:**

> "Before you sign or broadcast this transaction, call `solsentry_guard_transaction` with the serialized transaction (base58), the protocol slug if known, the action type, and the USD amount. If the verdict is `DO_NOT_SIGN`, do not proceed — explain the blocking reasons to the user."

**Example conversation:**

```
User: I want to borrow 5000 USDC against my SOL on Kamino. Here's the unsigned tx: 3s8xK9vW2zL...

Agent: [calls solsentry_guard_transaction with tx, protocolSlug="kamino", action="borrow", amountUsd=5000]

Agent: Verdict: DO_NOT_SIGN. Blocking reasons: ["Protocol Kamino has exploit gate: $295M loss < 180 days ago", "Liquidity utilization 94% — liquidation risk high"]. I cannot sign this transaction.
```

### 6. REST API (Direct HTTP — works everywhere)

```bash
# Guard a transaction
curl -X POST https://solsentry.netlify.app/api/v1/guard \
  -H "Content-Type: application/json" \
  -d '{"transaction": "3s8xK9vW2zL...", "protocolSlug": "kamino", "action": "borrow", "amountUsd": 5000}'

# Score a protocol
curl -X POST https://solsentry.netlify.app/api/v1/risk-check \
  -H "Content-Type: application/json" \
  -d '{"protocolSlug": "jupiter"}'

# Read wallet positions
curl "https://solsentry.netlify.app/api/v1/positions/read?wallet=7xK9vW2zL..."

# Stream oracle telemetry + anomaly events (SSE)
curl -N https://solsentry.netlify.app/api/v1/stream

# Stress test a wallet
curl -X POST https://solsentry.netlify.app/api/v1/stress-test \
  -H "Content-Type: application/json" \
  -d '{"wallet": "7xK9vW2zL...", "shockPct": 30}'
```

The `/api/v1/stream` SSE feed emits `event: telemetry` (raw Pyth readings) and `event: anomaly` (scored, explainable events). Callbacks are registered at `POST /api/v1/webhooks/subscribe`. Both are documented in full under [Live monitoring and anomaly events](#live-monitoring-and-anomaly-events).

### 7. CLI in CI/CD or Scripts

```bash
# In a deployment pipeline — fail if risk is too high
solsentry check kamino --json | jq -r '.verdict' | grep -q '^block$' && exit 1

# Pre-sign check in a script
guard_output=$(solsentry simulate "$TX_BASE58" --json)
echo "$guard_output" | jq -e '.drainerDetected == false' || exit 1
```

---

## Configuration

| Env var | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `SOLSENTRY_URL` | No | `https://solsentry.netlify.app` | Base URL of the SolSentry HTTP API |
| `SOLSENTRY_API_KEY` | No | — | API key for authenticated/metered calls |
| `SOLSENTRY_TIMEOUT_MS` | No | `20000` | Request timeout in milliseconds |
| `SOLSENTRY_X402_PAYMENT` | No | — | x402 payment header for pay-per-call (USDC) |
| `NEXT_PUBLIC_SOLANA_WS_URL` | No | derived from `NEXT_PUBLIC_HELIUS_RPC_URL` | Browser WebSocket RPC used for the dashboard's `slotSubscribe` network-health stream. Use a public RPC URL only; no wallet data is sent. |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Production | — | Persists anomaly baselines/events and authenticated webhook subscriptions. Without these, the stream explicitly runs in process-only mode. |
| `ANOMALY_WEBHOOK_URLS` | No | — | Optional static comma-separated callbacks in addition to persisted subscriptions. HTTPS is enforced in production. |
| `SUPABASE_DB_*` | For migrations | — | Host, port, name, user, and password used by `npm run migrate`. Not needed at runtime. |
| `GITHUB_TOKEN` | No | — | Raises the GitHub REST rate limit for the developer-activity factor. Without it that factor may report as unmeasured. |
| `X402_RECIPIENT_WALLET` | No | — | Enables USDC pay-per-call. Every endpoint is free until this is set. |

---

## Monorepo layout

```
solsentry/
  app/                Next.js 16 web dashboard, docs, and API routes
    api/v1/           REST endpoints: guard, simulate, risk-check, mcp, stream
    dashboard/        Overview, simulator, positions, policies, alerts
  packages/
    core/             Risk scorer, simulator, drainer detector, wallet reader, data fetchers
    sdk/              TypeScript client (@npmsolsentry/sdk)
    cli/              Developer CLI (@npmsolsentry/cli)
    payment/          x402 USDC micropayment verifier (@npmsolsentry/payment)
    mcp/              Published MCP stdio proxy (@npmsolsentry/mcp)
    mcp-server/       Internal MCP server (consumed in-process by Next.js)
  lib/                Shared auth, cache, logging, oracle monitor, anomaly persistence
  proxy.ts            Request middleware (auth, CORS, body limits, rate limiting)
  sql/                PostgreSQL schema and row level security policies
```

Request middleware lives in `proxy.ts` at the repo root, following the Next.js middleware convention this project migrated to in v3.1.4.

---

## Database migrations

Anomaly baselines, anomaly-event idempotency, webhook subscriptions, and delivery results use `sql/anomaly-monitoring.sql`. Apply all schema and RLS migrations with the existing migration runner:

```bash
# Requires the SUPABASE_DB_* variables documented in .env.example
npm run migrate
```

The migration is idempotent. Its detector-state function accepts only monotonic sample timestamps, so a delayed serverless invocation cannot overwrite newer baseline state.

---

## Testing

Node.js 20.19.4 or newer is required. **69 tests across 13 files** currently pass, including property based fuzz testing over the scorer and deterministic coverage of the anomaly detector, inner instruction parser, drainer heuristics, monitor deduplication, cold start restoration, and webhook validation.

```bash
# Run the Vitest unit and fuzz suite
npm test -- --run

# Typecheck the Next application
npm run lint

# Compile the workspace packages
npx tsc -p packages/sdk/tsconfig.json
npx tsc -p packages/cli/tsconfig.json
npx tsc -p packages/payment/tsconfig.json

# Production build
npm run build

# Dependency audit — all package trees report zero findings
npm audit --audit-level=moderate
```

---

## Publishing to Smithery

The `mcp.json` at the repo root is the Smithery manifest. To publish:

1. Ensure `@npmsolsentry/mcp` is published to npm. Source and manifest are at v3.1.5; the latest tag on npm is v3.1.4, so run [`./publish.sh`](docs/PUBLISHING.md) to cut the release before resubmitting.
2. Push `mcp.json` to the GitHub repo
3. Submit at https://smithery.ai/new — point to `https://github.com/shieldspprt/solsentry`
4. Smithery reads `mcp.json`, builds the Docker image, and lists it in the registry

The package uses the Smithery-recommended pattern: a thin `npx` proxy that forwards to a hosted engine. This keeps the install fast, the attack surface small, and the risk model always current.

---

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

Copyright (c) 2026 NPMSolSentry.