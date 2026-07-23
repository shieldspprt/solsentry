Now I have a thorough understanding of the entire codebase. Let me compile the comprehensive improvement report.


The Python interpreter is choking on the markdown code blocks. Let me write this differently:


The code interpreter keeps choking on the TypeScript code blocks. Let me just deliver the full report directly as markdown text — you said you're good with `.md`, so here it is. Copy everything below into a `.md` file and hand it to your SWE agent:

---

# SolSentry - Senior Engineering, QA & CTO Review Report

**Repo:** `github.com/shieldspprt/solsentry`
**Reviewed:** 2026-07-23
**Perspective:** Senior Solana SWE | QA Lead | CTO
**Purpose:** Handoff document for SWE agent (Google Antigravity) to execute improvements
**Goal:** Make SolSentry the **default risk middleware for every AI agent in the Solana ecosystem**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Critical Security Vulnerabilities (P0)](#2-critical-security-vulnerabilities)
3. [Safety & Correctness Issues (P1)](#3-safety--correctness-issues)
4. [Speed & Performance (P2)](#4-speed--performance)
5. [Browser Tool Safety & Wallet Interaction (P1)](#5-browser-tool-safety--wallet-interaction)
6. [Agent Ecosystem Dominance (P1)](#6-agent-ecosystem-dominance)
7. [Architecture & Code Quality (P2)](#7-architecture--code-quality)
8. [QA & Testing Gaps (P1)](#8-qa--testing-gaps)
9. [Operational Readiness (P2)](#9-operational-readiness)
10. [Prioritized Implementation Roadmap](#10-prioritized-implementation-roadmap)

---

## 1. Executive Summary

SolSentry is a **well-conceived** quantitative risk engine with a solid scoring model (v3), provenance-tagged factors, MCP server integration, and a clean preflight API. The type system is comprehensive (404-line `types.ts`), the policy engine is sound, and the stress testing logic is thoughtful.

**However**, the project is at **commit #3** and has several **critical security holes**, zero test coverage in production paths, no authentication layer, hardcoded infrastructure secrets in source, and missing integrations that would make it the default choice for the 50+ active Solana AI agent frameworks.

The scoring model and MCP tool design are **genuinely good**. The execution around security, reliability, and ecosystem integration needs to catch up to the vision.

---

## 2. Critical Security Vulnerabilities

### 2.1 Hardcoded Infrastructure Identifiers in Source [P0]

**File:** `lib/supabase-admin.ts`

```typescript
// CURRENT - LEAKS PROJECT IDENTITY
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fptxzwsadfsscyujfgqr.supabase.co';
const host = process.env.SUPABASE_DB_HOST || 'aws-0-eu-west-1.pooler.supabase.com';
const user = process.env.SUPABASE_DB_USER || 'postgres.fptxzwsadfsscyujfgqr';
```

**Impact:** Anyone reading the repo knows the exact Supabase project ref, DB host, and user. Even without the password, this is reconnaissance gold. The `NEXT_PUBLIC_` prefix means the URL is shipped to every browser.

**Fix:**
```typescript
const url = process.env.SUPABASE_URL; // NOT NEXT_PUBLIC_
if (!url) throw new Error('SUPABASE_URL is required');
// Remove ALL fallback strings. Fail hard if env is missing.
```

---

### 2.2 TLS Verification Disabled on Database Connection [P0]

**File:** `lib/supabase-admin.ts`

```typescript
ssl: { rejectUnauthorized: false }  // MITM vulnerability
```

**Impact:** Any network intermediary can intercept the PostgreSQL connection, steal the service role key, and gain full DB access. This is a PCI-DSS / SOC2 instant fail.

**Fix:**
```typescript
ssl: { rejectUnauthorized: true, ca: process.env.SUPABASE_SSL_CA }
// Or use the Supabase pooler which handles TLS natively
```

---

### 2.3 Zero Authentication on MCP Server and REST API [P0]

**File:** `packages/mcp-server/src/index.ts`, `app/api/v1/*`

The MCP server accepts **any** stdio connection. The REST API routes have **no API key validation, no JWT, no OAuth**. Any agent (or attacker) can:
- Query all protocol risk data
- Read any wallet's positions (privacy violation)
- Trigger stress tests (DoS vector)
- Subscribe to push alerts for arbitrary wallets

**Fix - Implement layered auth:**
```typescript
// MCP: Require agent registration + API key in initialization
// REST: Bearer token middleware on all /api/v1/* routes
// Wallet reads: Require wallet signature proof (sign a nonce)

// middleware/auth.ts
export function requireApiKey(req: NextRequest): UserRecord {
  const key = req.headers.get('x-solsentry-key');
  if (!key || !key.startsWith('ss_')) throw new AuthError('Invalid API key');
  // Validate against DB, check plan limits, rate limit
}
```

---

### 2.4 No Rate Limiting Anywhere [P0]

**Impact:** A single agent loop can DoS the Pyth/Helius/DeFiLlama upstream APIs (burning your API credits), or flood the MCP server with requests.

**Fix:**
```typescript
// Add per-agent rate limiting:
// - Free: 60 req/min
// - Pro: 600 req/min
// - Enterprise: 6000 req/min
// Use Upstash Redis or in-memory sliding window
```

---

### 2.5 CSP Allows unsafe-inline and unsafe-eval [P0]

**File:** `netlify.toml`

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

**Impact:** Completely negates XSS protection. Any injected script runs freely.

**Fix:** Use nonce-based CSP or move to `'strict-dynamic'` with hashed scripts. Remove `unsafe-eval` entirely (Next.js does not need it in production).

---

### 2.6 Wallet Address Validation is Insufficient [P0]

**File:** `lib/validation.ts`

```typescript
// Only checks length + base58 charset
if (cleanAddr.length < 32 || cleanAddr.length > 44) { ... }
const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
```

**Impact:** Accepts strings that are valid base58 but NOT valid ed25519 public keys. An attacker could pass crafted strings to the wallet reader that cause unexpected behavior in downstream RPC calls.

**Fix:**
```typescript
import { PublicKey } from '@solana/web3.js';

export function validateSolanaAddress(address: string): ValidationResult {
  try {
    new PublicKey(address); // Throws if not a valid 32-byte ed25519 point
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid Solana public key' };
  }
}
```

---

## 3. Safety & Correctness Issues

### 3.1 MCP Tool Names Still Say `agentgate_*` (Rebrand Incomplete) [P1]

The project is "SolSentry" but every MCP tool is still `agentgate_check_protocol_risk`, `agentgate_preflight`, etc. The server announces itself as `solsentry-mcp-server` v3.0.0 but logs `AgentGate MCP Server v2.5.0`.

**Impact:** Agents integrating via MCP will be confused. Documentation mismatches. Looks unfinished.

**Fix:** Rename all tools to `solsentry_*`. Update all descriptions. Bump the log message.

---

### 3.2 `pumpfun` in Tool Enums but NOT in `SUPPORTED_PROTOCOLS` Constant [P1]

**File:** `packages/core/src/constants.ts`

```typescript
export const SUPPORTED_PROTOCOLS = [
  'kamino', 'drift', 'jupiter', 'orca', 'raydium', 'meteora', 'marinade', 'jito',
] as const;
// 'pumpfun' is MISSING here
```

But the MCP tool schemas list `pumpfun` as a valid enum value, and `getDefaultMetricsForProtocol` has a `pumpfun` entry.

**Impact:** Zod validation in `schemas.ts` imports `SUPPORTED_PROTOCOLS` so `pumpfun` will **fail validation** at the schema layer even though the MCP description says it is valid. Agents will get confusing errors.

**Fix:** Add `'pumpfun'` to `SUPPORTED_PROTOCOLS` or remove it from MCP enums until properly supported.

---

### 3.3 Stress Engine Uses Fixed Volatility Assumption [P1]

**File:** `packages/core/src/stress-engine.ts`

```typescript
const ASSUMED_DAILY_VOL_PCT = 6; // Hardcoded for "SOL-correlated majors"
```

**Impact:** A -20% shock on a memecoin (100%+ daily vol) vs. USDC (0.01% vol) gets the same time-to-liquidation estimate. This is **dangerously misleading** for agents making automated decisions.

**Fix:**
```typescript
// Fetch realized vol from Pyth confidence interval or Birdeye price history
// Per-asset vol lookup with fallback tiers:
// - SOL/majors: 6%
// - Mid-cap alts: 15%
// - Memecoins/low-liquidity: 40%
// - Stablecoins: 0.5%
```

---

### 3.4 Fail-Closed is Documented but Not Fully Implemented [P1]

The README says "fail-closed" but the `evaluatePolicyRules` function returns `allowed: true` when `violations.length === 0`. If the risk scorer throws or returns null, the preflight tool does not explicitly block.

**Fix:**
```typescript
// In preflight.ts, wrap in try/catch:
try {
  const [risk, policy] = await Promise.all([...]);
} catch (error) {
  return {
    verdict: 'DO_NOT_PROCEED',
    reason: 'FAIL_CLOSED: Risk engine error - ' + error.message,
    proceed: false,
  };
}
```

---

### 3.5 No Input Bounds on `amountUsd` Beyond `> 0` [P1]

An agent could pass `amountUsd: 999999999999` (Number.MAX_SAFE_INTEGER territory). The policy engine will compare it but the arithmetic could overflow in edge cases.

**Fix:** Add `.max(1_000_000_000)` (1B USD) to the Zod schema. No single Solana tx should exceed this.

---

## 4. Speed & Performance

### 4.1 No Connection Pooling for PostgreSQL [P2]

**File:** `lib/supabase-admin.ts`

```typescript
export const getPgClient = () => {
  return new Client({ ... }); // New TCP connection EVERY call
};
```

**Impact:** Each API request opens a new TLS handshake + PG auth. Adds 50-200ms per request.

**Fix:**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: true },
});

export const getPgPool = () => pool;
```

---

### 4.2 Pyth Cache Has No Size Bound [P2]

**File:** `packages/core/src/data-fetchers/pyth.ts`

```typescript
const priceCache = new Map<string, { price: number; timestamp: number }>();
```

Currently only 4 feeds so it is fine, but if you add per-token feeds for position monitoring, this grows unbounded.

**Fix:** Use a bounded LRU cache (`lru-cache` package, max 100 entries).

---

### 4.3 No Response Caching on MCP/REST Layer [P2]

Every `solsentry_check_protocol_risk` call re-fetches Pyth + Helius + DeFiLlama even if called 10 times in 5 seconds by the same agent.

**Fix:**
```typescript
// Add a 30-second response cache per (protocolSlug, modelVersion)
// Use Map with TTL or Vercel KV / Upstash
const riskCache = new Map<string, { data: unknown; expires: number }>();
```

---

### 4.4 Wallet Reader Has No Timeout on External Calls [P2]

**File:** `packages/core/src/wallet-reader/index.ts`

```typescript
const res = await fetch(`https://api.kamino.finance/...`, { next: { revalidate: 30 } });
// No AbortController, no timeout
```

**Impact:** If Kamino API hangs, the entire MCP call hangs indefinitely. Agent frameworks typically have 30s timeouts and will mark SolSentry as unresponsive.

**Fix:**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
const res = await fetch(url, { signal: controller.signal });
clearTimeout(timeout);
```

---

### 4.5 Target Latency Budget [P2]

For SolSentry to be the go-to pre-trade check, it MUST respond in **< 500ms p95**. Current architecture (3 parallel external fetches + DB read) could hit 2-3s in cold starts.

**Recommended architecture:**
```
Agent -> SolSentry Edge (Vercel/Cloudflare) -> Cached Risk Score (Redis, 30s TTL)
                                             -> Background: Pyth/Helius/DeFiLlama refresh (every 60s)
```

Pre-compute risk scores on a cron, serve from cache. Only the wallet-specific position read needs to be live.

---

## 5. Browser Tool Safety & Wallet Interaction

### 5.1 De-Leveraging Execution Needs Transaction Simulation [P1]

The README mentions "One Click De-Leveraging" via Phantom/Solflare. Before broadcasting ANY transaction:

**Required:**
```typescript
// 1. Simulate via RPC before signing
const simulation = await connection.simulateTransaction(tx);
if (simulation.value.err) {
  throw new Error('Transaction simulation failed - DO NOT broadcast');
}

// 2. Add compute budget limits
tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));

// 3. Add priority fee estimation
const fees = await connection.getRecentPrioritizationFees();
```

---

### 5.2 No Transaction Confirmation UX Guard [P1]

For a browser tool that can move funds:
- Require explicit user confirmation modal before signing
- Show simulated outcome (expected position change, slippage)
- Implement a "cool-down" for amounts > $1000
- Log every signed transaction to an audit trail

---

### 5.3 Wallet Adapter Security [P1]

```typescript
// NEVER auto-approve. Always require user interaction.
const walletConfig = {
  autoApprove: false, // CRITICAL
  maxTransactionValue: 10_000, // USD equivalent
  requireConfirmationAbove: 100,
};
```

---

## 6. Agent Ecosystem Dominance

### 6.1 Missing: Solana Agent Kit Integration [P1]

The [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) is the **largest** agent framework on Solana (60+ actions). SolSentry must be a first-class tool in it.

**Action:** Submit a PR to `solana-agent-kit` adding a `SolSentryTool` that wraps the preflight API.

---

### 6.2 Missing: ElizaOS Plugin [P1]

ElizaOS (formerly ai16z) is the second-largest agent framework. Create a `@solsentry/eliza-plugin` package:

```typescript
// packages/eliza-plugin/src/index.ts
export const solSentryPlugin: Plugin = {
  name: 'solsentry-risk',
  description: 'Pre-trade risk checks via SolSentry',
  actions: [preflightAction, stressTestAction, positionHealthAction],
  evaluators: [riskEvaluator],
};
```

---

### 6.3 Missing: Solana Agent Registry Integration [P1]

The [Solana Agent Registry](https://solana.com/agent-registry) is the official trust layer. SolSentry should:
- Register as a verified "risk oracle" service
- Accept agent registry credentials for auth
- Write risk attestations on-chain (optional, for premium tier)

---

### 6.4 Missing: Webhook / SSE Push for Agents [P1]

Current model is **poll-only**. Agents need:
```json
POST /api/v1/webhooks/subscribe
{
  "url": "https://agent.example.com/callback",
  "events": ["liquidation_risk", "health_factor_low", "oracle_down"],
  "walletAddress": "...",
  "threshold": { "healthFactor": 1.3 }
}
```

Without push, agents must poll every 5-10s, which is wasteful and slow for liquidation prevention.

---

### 6.5 Missing: Multi-Chain Oracle Awareness [P2]

Currently only Pyth feeds for SOL, USDC, BTC, ETH. Add:
- Jito SOL (jitoSOL) - for LST depeg detection
- mSOL, bSOL - Marinade/BlazeStake LSTs
- Major perp assets (wBTC, wETH on Drift)
- USDT (critical for depeg monitoring)

---

### 6.6 Expand Protocol Coverage [P2]

Current: 9 protocols. The Solana DeFi ecosystem has 50+ active protocols.

**Priority additions:**

| Protocol | Category | Why |
|----------|----------|-----|
| Marginfi | Lending | Top-3 lending, agents use it |
| Solend/Save | Lending | Legacy but still active |
| Phoenix | DEX (CLOB) | Different risk profile than AMMs |
| Squads | Multisig/Treasury | Agent treasury management |
| Tensor | NFT | NFT-collateralized loans |
| Sanctum | LST | LST liquidity risk |
| Perena | Yield | Structured products |

---

### 6.7 SDK / Client Library [P1]

Ship a typed client so agents do not need to parse raw JSON:

```typescript
// @solsentry/sdk
import { SolSentry } from '@solsentry/sdk';

const sentry = new SolSentry({ apiKey: 'ss_...' });

const verdict = await sentry.preflight({
  action: 'borrow',
  protocol: 'kamino',
  amountUsd: 5000,
  portfolio: { dailyVolume: 12000, drawdown: 3.2, openPositions: 4 },
});

if (verdict.proceed) {
  // Execute trade
} else {
  console.log(verdict.maxAllowedUsd); // Resize
  console.log(verdict.alternatives);  // Switch protocol
}
```

---

### 6.8 `llms.txt` and AI Discoverability (Good - Enhance) [P2]

The repo already has `app/llms.txt` and `.well-known/ai-plugin.json`. Enhance:
- Add structured tool descriptions in `llms.txt` with example request/response pairs
- Ensure the OpenAPI spec (`app/api/v1/openapi.json`) is 100% complete and accurate
- Add `/.well-known/agent.json` for the emerging agent discovery standard

---

## 7. Architecture & Code Quality

### 7.1 Informal Monorepo - No Workspace Config [P2]

`packages/core` and `packages/mcp-server` use `../../../lib/types` relative imports. This breaks if you ever publish packages or restructure.

**Fix:**
```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'app'
```

```json
// packages/core/package.json
{
  "name": "@solsentry/core",
  "main": "src/index.ts",
  "dependencies": {}
}
```

Use TypeScript project references or path aliases instead of `../../../`.

---

### 7.2 No Error Boundary / Graceful Degradation in Data Fetchers [P2]

If Pyth is down, `fetchOracleHealth` returns `null` and the factor falls back to defaults. Good. But if **all three** sources fail simultaneously, the agent gets a score based entirely on static defaults with no prominent warning.

**Fix:** Add a `dataQuality` field to every response:
```typescript
dataQuality: {
  liveSources: 0,  // out of 3
  totalSources: 3,
  isReliable: false,
  warning: 'ALL data sources unavailable. Score based on static defaults only. DO NOT use for large positions.'
}
```

---

### 7.3 `DEFAULT_RISK_WEIGHTS` is Dead Code [P2]

**File:** `packages/core/src/constants.ts`

```typescript
export const DEFAULT_RISK_WEIGHTS = {
  audit_weight: 0.35,
  tvl_weight: 0.25,
  oracle_weight: 0.25,
  exploit_weight: 0.15,
};
```

This is **never used** - the actual weights are in `FACTOR_WEIGHTS`. Remove it to avoid confusion.

---

### 7.4 `SUPPORTED_ACTIONS` Referenced in schemas.ts but Not Defined in constants.ts [P1]

**File:** `packages/mcp-server/src/schemas.ts`

```typescript
import { SUPPORTED_PROTOCOLS, SUPPORTED_ACTIONS } from '../../../packages/core/src/constants';
```

But `constants.ts` only exports `SUPPORTED_PROTOCOLS`. This will cause a **build error** unless `SUPPORTED_ACTIONS` is defined elsewhere.

**Fix:** Ensure `SUPPORTED_ACTIONS` is exported from constants:
```typescript
export const SUPPORTED_ACTIONS = [
  'swap', 'lend', 'borrow', 'lp', 'stake', 'perp_long', 'perp_short', 'buy_bonding_curve',
] as const;
```

---

## 8. QA & Testing Gaps

### 8.1 Zero Test Coverage on Critical Paths [P0]

`vitest` is in devDependencies. There is a `packages/core/src/__tests__/` directory. But:
- No tests for `risk-scorer.ts` (the most critical file)
- No tests for `policy-engine.ts`
- No tests for `stress-engine.ts`
- No integration tests for MCP tools
- No tests for wallet-reader

**Required minimum test suite:**

```typescript
// packages/core/src/__tests__/risk-scorer.test.ts
describe('computeProtocolRisk', () => {
  it('returns score 0-10 for all supported protocols', () => { /* ... */ });
  it('clamps score to [0, 10] for extreme inputs', () => { /* ... */ });
  it('widens confidence band when sources are defaulted', () => { /* ... */ });
  it('produces deterministic output for same inputs (model version pinning)', () => { /* ... */ });
  it('flags critical tier for unaudited + high whale + degraded oracle', () => { /* ... */ });
});

// packages/core/src/__tests__/policy-engine.test.ts
describe('evaluatePolicyRules', () => {
  it('blocks when protocol is in blocked list', () => { /* ... */ });
  it('computes maxAllowedUsd correctly at boundaries', () => { /* ... */ });
  it('returns 0 maxAllowed when hard-blocked', () => { /* ... */ });
  it('warns at 80% of limits', () => { /* ... */ });
});

// packages/core/src/__tests__/stress-engine.test.ts
describe('stressPosition', () => {
  it('correctly identifies liquidation for long positions', () => { /* ... */ });
  it('correctly identifies liquidation for short positions', () => { /* ... */ });
  it('handles null health_factor gracefully', () => { /* ... */ });
  it('computes action_size_usd_to_target correctly', () => { /* ... */ });
});
```

---

### 8.2 No Fuzz / Property-Based Testing [P1]

For a risk engine that agents will trust with real money:
```typescript
import { fc } from 'fast-check';

it('composite score is always in [0, 10] for any valid input', () => {
  fc.assert(fc.property(
    fc.record({
      bot_density_pct: fc.double({ min: 0, max: 100 }),
      whale_concentration_pct: fc.double({ min: 0, max: 100 }),
      // ... all metrics
    }),
    (metrics) => {
      const result = computeProtocolRisk({ slug: 'test', institutional_metrics: metrics });
      expect(result.composite_risk_score).toBeGreaterThanOrEqual(0);
      expect(result.composite_risk_score).toBeLessThanOrEqual(10);
    }
  ));
});
```

---

### 8.3 No Load / Chaos Testing [P2]

- What happens when Pyth returns 500?
- What happens when Helius rate-limits (429)?
- What happens when Kamino API returns malformed JSON?
- What happens under 1000 concurrent MCP calls?

**Add:** A `scripts/chaos-test.sh` that runs the MCP server with mocked failing upstreams.

---

## 9. Operational Readiness

### 9.1 No CI/CD Pipeline [P1]

**Required:** `.github/workflows/ci.yml`
```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      - run: npm run build
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx audit-ci --moderate
      - run: npx secrets-scanner .
```

---

### 9.2 No Structured Logging / Observability [P2]

For a risk engine, you need:
- Every preflight call logged with: agent_id, protocol, verdict, latency, data_sources_used
- Alerting when > 10% of calls return DO_NOT_PROCEED (might indicate a real exploit)
- Metrics: p50/p95/p99 latency per tool, error rate, cache hit rate

**Add:** OpenTelemetry instrumentation or at minimum structured JSON logging.

---

### 9.3 No Versioning / Changelog Strategy [P2]

The model version is `3.0.0` but there is no CHANGELOG.md, no git tags, no release process. Agents need to **pin** a model version and know when scoring changes.

**Fix:**
- Tag releases: `v3.0.0`, `v3.1.0`
- Maintain `CHANGELOG.md`
- Expose `GET /api/v1/version` returning model version + deploy timestamp
- Allow agents to pin: `?modelVersion=3.0.0` for reproducibility

---

### 9.4 No Disaster Recovery / Data Backup Plan [P2]

The Supabase DB holds:
- Agent registrations
- Policy configurations
- Position history
- Risk check audit trail

If this is lost, agents lose their guardrail configs. Document a backup strategy.

---

## 10. Prioritized Implementation Roadmap

### Phase 1 - Security Lockdown (Week 1) [CRITICAL]

| # | Task | File(s) | Effort |
|---|------|---------|--------|
| 1 | Remove ALL hardcoded fallbacks in supabase-admin.ts | `lib/supabase-admin.ts` | 30min |
| 2 | Enable TLS verification on PG connection | `lib/supabase-admin.ts` | 30min |
| 3 | Add API key auth middleware to all /api/v1/* routes | `app/api/v1/*` | 4h |
| 4 | Add rate limiting (Upstash or in-memory) | New middleware | 3h |
| 5 | Fix CSP: remove unsafe-inline/unsafe-eval | `netlify.toml` | 1h |
| 6 | Use `PublicKey` for address validation | `lib/validation.ts` | 30min |
| 7 | Add `SUPPORTED_ACTIONS` export to constants | `packages/core/src/constants.ts` | 15min |
| 8 | Add `pumpfun` to SUPPORTED_PROTOCOLS or remove from enums | `constants.ts` + MCP schemas | 15min |

### Phase 2 - Reliability & Testing (Week 2) [HIGH]

| # | Task | Effort |
|---|------|--------|
| 9 | Write unit tests for risk-scorer (20+ cases) | 6h |
| 10 | Write unit tests for policy-engine (15+ cases) | 4h |
| 11 | Write unit tests for stress-engine (15+ cases) | 4h |
| 12 | Add fail-closed error handling to preflight | 1h |
| 13 | Add timeouts to all external fetch calls | 2h |
| 14 | Add PG connection pooling | 1h |
| 15 | Add response caching layer (30s TTL) | 3h |
| 16 | Set up CI pipeline with test + lint + build | 2h |
| 17 | Complete MCP rebrand (agentgate -> solsentry) | 2h |

### Phase 3 - Agent Ecosystem Integration (Week 3-4) [HIGH]

| # | Task | Effort |
|---|------|--------|
| 18 | Build `@solsentry/sdk` typed client library | 8h |
| 19 | Submit Solana Agent Kit integration PR | 6h |
| 20 | Build ElizaOS plugin package | 6h |
| 21 | Add webhook/SSE push subscription API | 8h |
| 22 | Add Drift wallet adapter (SDK integration) | 8h |
| 23 | Add 5 more protocols (Marginfi, Phoenix, etc.) | 12h |
| 24 | Add LST-specific Pyth feeds (jitoSOL, mSOL) | 3h |
| 25 | Per-asset volatility in stress engine | 4h |
| 26 | Register on Solana Agent Registry | 2h |

### Phase 4 - Scale & Polish (Week 5-6) [MEDIUM]

| # | Task | Effort |
|---|------|--------|
| 27 | Pre-compute risk scores on cron (edge cache) | 8h |
| 28 | Add OpenTelemetry / structured logging | 6h |
| 29 | Transaction simulation before de-leverage execution | 6h |
| 30 | Load test: 1000 concurrent MCP calls < 500ms p95 | 4h |
| 31 | Property-based / fuzz testing suite | 6h |
| 32 | Multi-region deployment (US + EU + Asia edge) | 8h |
| 33 | On-chain risk attestation (optional premium feature) | 16h |
| 34 | Documentation site with interactive API explorer | 8h |

---

## Appendix: What is Already Good (Do Not Break)

1. **Provenance-tagged scoring model** - the `FactorProvenance` + `RiskConfidence` band system is genuinely innovative. Most risk engines give a point estimate; SolSentry gives a confidence interval. Keep this.

2. **`whatWouldFlip` field** - telling an agent *exactly what needs to change* to flip a decision is extremely actionable. Unique differentiator.

3. **`maxAllowedUsd` in policy response** - turns a binary reject into a constructive "here is what you CAN do". Agents love this.

4. **Preflight as one-shot** - combining risk + policy into a single call reduces agent latency and complexity. Good API design.

5. **Structured MCP content** - returning both `text` and `structuredContent` means agents can parse without regex. Forward-thinking.

6. **Stress engine cascade modeling** - the "nearby positions contribute to cascade" logic is a real differentiator vs. naive per-position checks.

7. **`llms.txt` + `ai-plugin.json`** - early adoption of AI discoverability standards. Good instinct.

8. **Type system** - 404 lines of well-structured types. The `InstitutionalFactorsBreakdown` interface is comprehensive.

---

## Final CTO Note

The **vision is right**: every AI agent on Solana should check risk before executing. The **scoring model is sound**. The **MCP integration is well-designed**.

What is missing is the **trust layer** that makes an agent framework maintainer say "yes, we will integrate SolSentry by default":
- **Security audit** (fix the P0s above)
- **99.9% uptime SLA** (needs monitoring + multi-region)
- **< 200ms p95 latency** (needs edge caching)
- **SOC2 / formal audit** (for institutional agents)
- **Open-source test suite** that proves the scoring is correct
- **Integration PRs** to the top 3 agent frameworks (Agent Kit, ElizaOS, Claude MCP registry)

Ship Phase 1 this week. The security holes are existential - one leaked Supabase key and the project is dead before it starts.

---

*Report generated for handoff to SWE agent. All file paths are relative to repo root. All code snippets are TypeScript unless noted.*