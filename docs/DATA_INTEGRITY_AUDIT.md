# SolSentry — Data Integrity Audit

**Date:** 2026-07-24
**Scope:** Dashboard, Protocols index, Protocol detail pages, the API routes and data-fetchers behind them, measured against the claims made on the landing page, README, and `llms.txt`.
**Method:** Traced every user-visible number to its source; ran the app; called every endpoint the browser calls; verified each upstream (Pyth, Helius, DeFiLlama, Kamino, Supabase) independently.

---

## Verdict

The engine's *architecture* is honest — `llms.txt` states the standard correctly:

> "Every factor carries its data source, timestamp, and confidence... Where live data is unavailable a factor falls back to a documented model default AND its confidence is lowered."

The *product* does not meet that standard. Three compounding failures:

1. **The live layer never executes in the browser.** Every client-side fetch is rejected 401 by middleware.
2. **The fallbacks are invented numbers, not documented defaults** — bot density, whale concentration, monthly web visits, social sentiment, dev commits, position counts.
3. **The UI labels those invented numbers as live.** The protocol page renders "🟢 Live Pyth, Helius & DeFiLlama Telemetry" directly above seven factors each labeled "BASELINE DEFAULT".

An AI agent calling this engine today gets a confident safety score built mostly from constants.

---

## Evidence: one screen, contradicting itself

`/dashboard/protocols/kamino`, verbatim from the running app:

```
🟢 Live Pyth, Helius & DeFiLlama Telemetry      ← claim
Verdict: proceed                                 ← header verdict
ACTIVE POSITIONS 25,091 / 28 Near Liquidation ($4.90M)

AI RECOMMENDATION: CHANGE_POSITION               ← contradicts header
Confidence Score: 50%
CONFIDENCE BAND 6.9 to 10.0                      ← ±1.7 on a 0–10 scale
7 DAY TREND  Stable                              ← no history exists

Audit & Governance      BASELINE DEFAULT  10.0/10
Liquidation & Rekt Risk BASELINE DEFAULT   8.5/10
MEV / Bot Density       BASELINE DEFAULT   7.8/10
Whale Concentration     BASELINE DEFAULT   7.2/10
Oracle Latency & Depeg  BASELINE DEFAULT  10.0/10
Web & Community Trust   BASELINE DEFAULT   9.3/10
Business Efficiency     BASELINE DEFAULT   6.7/10
```

Seven of seven factors are model defaults. The badge says live. `25,091` is `TVL ÷ 42000`.

---

## CRITICAL

### C0 — The dashboard has never been interactive in development (root cause of C1's symptoms)

Found while verifying the C1 fix. `next.config.js` set:

```
script-src 'self' 'unsafe-inline'
```

with **no `'unsafe-eval'`**. Next.js compiles client modules with `eval-source-map` in
development, so every chunk is wrapped in `eval()`. The browser downloads all
chunks with HTTP 200 and then silently refuses to execute them. React never
hydrates. The entire dashboard renders as inert server HTML: **no button works,
no SWR request is ever issued, no state ever updates.**

Verified on the running app — `Object.keys(button).some(k => k.startsWith('__react'))`
returned `false` on every page, including pages this audit never touched.
Adding `'unsafe-eval'` in development only flipped it to `true`.

A second, independent hydration bug compounded it. Both `app/layout.tsx` and
`app/page.tsx` injected JSON-LD as a child:

```tsx
<script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
```

React HTML-escapes that on the server (`&quot;`) but not on the client (`"`), so
hydration hit `Text content did not match` and **discarded the whole
server-rendered document** to re-render client-side. Fixed with
`dangerouslySetInnerHTML`.

Production builds contain no `eval`, so the shipped CSP is unchanged and the
deployed site was not affected by the first issue — but no contributor could
ever run or test this project locally.

### C1 — Every browser-side live fetch is rejected 401

`middleware.ts` requires an API key on all `/api/*` except a short public list. The dashboard calls
`/api/v1/risk-check`, `/api/v1/positions/read`, `/api/v1/sync`, `/api/v1/stream` from the browser
with **no key**. Verified against the running app:

| Endpoint | Browser result |
|---|---|
| `POST /api/v1/risk-check` | **401** |
| `GET /api/v1/positions/read` | **401** |
| `POST /api/v1/sync` | **401** |
| `GET /api/v1/stream` | **401** |

Consequences:
- `useProtocolRisk` always falls back to `computeProtocolRisk(protocol)` with **no provenance** → every factor is `model_default`. This is the direct cause of the "BASELINE DEFAULT" wall above.
- "↻ Sync Live Data" / "↻ Sync Live Telemetry" buttons swallow the 401 in a bare `catch {}` and show a success-looking spinner. They have never worked.
- The Alerts page SSE connection dies immediately; the "⚡ Live Stream Connected" badge can never turn on.

### C2 — `/api/v1/stream` is a mock generator

`app/api/v1/stream/route.ts` emits `mockEvents` chosen by `Math.random()`:
- `solUsd: 148.5 + (Math.random() * 0.4 - 0.2)` — a hardcoded price, not Pyth.
- A fake `liquidation_warning` for **`marginfi`** — a protocol not even in `SUPPORTED_PROTOCOLS`.
- A fake `risk_score_update` for drift with a constant `7.9`.

The landing page sells this as: *"Server-Sent Events (SSE) streaming live oracle heartbeats, Pyth price feed de-peg alerts, and liquidation warnings directly to AI agents."* That is false as written.

### C3 — Position telemetry is arithmetic on TVL, and it flips the agent's decision

`packages/core/src/risk-scorer.ts:343-345`:

```ts
const calculatedPositions    = Math.round(liveTvl / 42000);
const calculatedNearLiqCount = Math.max(1, Math.round(liveTvl / 38000000));
const calculatedNearLiqUsd   = calculatedNearLiqCount * 175000;
```

`42000`, `38000000`, `175000` are arbitrary. These render as "ACTIVE POSITIONS", "Near Liquidation",
"Imminent Rekts", and the "Liquidation" risk-factor subtitle.

This is not cosmetic. Line 571 gates the decision on the fabricated count:

```ts
if (compositeScore >= 8.5 && posTelemetry.positions_near_liquidation_count < 10)  → TAKE_POSITION
else → CHANGE_POSITION ("De-leveraging advised")
```

Kamino scores 8.6 (→ `proceed`), but the invented count of 28 forces `CHANGE_POSITION`. **A made-up
constant is overriding the risk model.** Every protocol with TVL > $380M is permanently pushed off
`TAKE_POSITION` by division.

### C4 — The "Live" badge is powered by a hardcoded constant

The badge tests `data_freshness_pct > 50`. In `getDefaultMetricsForProtocol` that value is a literal
per protocol (`kamino: 99.2`, `jupiter: 99.8`, …). So a constant asserts liveness while every factor
beside it is a default. Same value is rendered under "Telemetry Source" as a percentage.

### C5 — Invented positions are served as real holdings

`/api/v1/positions/read` with no wallet returns `DEFAULT_SOLANA_POSITIONS` with HTTP 200 — four
fictional positions. The dashboard's "Imminent Rekt Radar" renders one as an actionable alert:
`DRIFT · SOL-PERP · HF 1.12 · $157,250 · Est. time to liq ~5.7h · Add $53,353 to restore`.
Nothing there exists. The Positions page presents the same four under "Real time position telemetry".

### C6 — The "De-leverage" button moves real SOL and does nothing

`components/features/PositionsView.tsx:56-70` — the button builds a `SystemProgram.transfer` of
**0.01 SOL to a hardcoded address**, then reports `"De-leveraging executed! Signature: …"`.

It does not de-leverage anything. It takes the user's funds and claims a risk action was performed.
This is the most serious item in the audit.

### C7 — The Supabase service-role key is invalid; the whole DB layer is silently dead

Verified directly against the REST API:

```
{"message":"Invalid API key","hint":"Double check your Supabase anon or service_role API key."}  (401)
```

Every `try { supabase… } catch {}` swallows this and substitutes static data:

| Surface | Shows | Actually |
|---|---|---|
| Protocol list / TVL | 9 protocols, $6.06B | `DEFAULT_SOLANA_PROTOCOLS` constants |
| "Risk Queries: 1420" | a counter | hardcoded fallback literal |
| "Registered Agents: 4" | a counter | hardcoded fallback literal |
| 7-day trend | "Stable" | no snapshot ever written |
| API key auth | validated | always fails → only the backdoor key works |

---

## HIGH

| # | Finding | Location |
|---|---|---|
| H1 | `Data Freshness · 99.8% · on-chain` is a literal string | `DashboardView.tsx:83` |
| H2 | `recentChecksCount = 1420`, `agentCount = 4` hardcoded fallbacks shown as counts | `app/dashboard/page.tsx:11-12` |
| H3 | ~250 lines of invented per-protocol telemetry; **4 of 7 factors are never grounded by any source, even server-side**: `audit_governance`, `liquidation_rekt`, `mev_bot_density`, `web_community` | `risk-scorer.ts:42-328` |
| H4 | "Monthly Web Visits 420,000 / Domain Trust 95 / Social Sentiment 88 / 142 Commits / 18 Core Devs" — no fetcher exists for any of these | `ProtocolWebTelemetrySection.tsx` |
| H5 | Both detail sub-sections call `computeProtocolRisk(protocol)` themselves instead of using the live `breakdown` prop — they render defaults even if C1 is fixed. Plus an invented `× 2.5` "Category Total" | `ProtocolBusinessRatiosSection.tsx`, `ProtocolWebTelemetrySection.tsx` |
| H6 | `\|\| 25`% market share and `\|\| 5000` positions fallbacks | `ProtocolsView.tsx:94,98` |
| H7 | Trend `direction: 'unknown'` renders as **"Stable"** | `ProtocolDecisionSection.tsx:118` |
| H8 | Epoch fetch failure returns hardcoded `epoch: 642, 65.8%` presented as live | `helius.ts:122-130` |
| H9 | "RPC Latency 1 ms" measures a Next.js fetch-cache hit (`revalidate: 15`), not network latency | `helius.ts:91-102` |
| H10 | Broken DeFiLlama slugs → `business_efficiency` silently degrades for 4 of 9 protocols | `defillama.ts:14-23,54-63` |
| H11 | `data_freshness_pct = live/3` is a coverage ratio over 3 of 7 factors, labelled "freshness" | `grounded-metrics.ts:73` |

### H12 — Six of eight Pyth feed IDs were wrong; oracle grounding was dead

Found while verifying the C2 fix. `PYTH_FEED_IDS` in `packages/core/src/constants.ts`
carried malformed IDs for `SOL_USD`, `USDC_USD`, `USDT_USD`, `JITOSOL_USD`,
`MSOL_USD` and `BSOL_USD`. Every request returned:

```
HTTP 404 — Price ids not found: 0xef0be8735516c9656247329c7d24d315866170d6e609d8429710d7225cb94c87
```

`fetchOracleHealth` treats a non-OK response as "unavailable" and returns null,
so the oracle factor silently degraded to a default on **every scoring call ever
made**. Only BTC and ETH — feeds nothing in the product uses — were correct.
All eight are now verified against `hermes.pyth.network/v2/price_feeds`.

This is the failure mode this whole audit is about: a broken integration that
degrades quietly into a plausible-looking constant is indistinguishable from a
working one, right up until someone checks.

**H10 detail** (verified against `api.llama.fi`):

| Configured slug | Result | Correct |
|---|---|---|
| `marinade-finance` | 404 | `marinade` (78,503) |
| `pumpfun` (fees + TVL) | 404 | `pump.fun` (940,362) |
| `drift-trade` | returns `0` | `drift` |
| `jito` | ok (112,521) | — |

Hardcoded TVLs are also stale by 1–3% vs live (`jupiter` 1.620B stored vs 1.598B live).

---

## MEDIUM / Security

| # | Finding |
|---|---|
| M1 | **Hardcoded auth bypass** `ss_test_key_mock_12345` in `middleware.ts:99` — active in production |
| M2 | `lib/api-key.ts:10` falls back to `Math.random()` for key material and to a 32-bit non-crypto hash |
| M3 | README "build-passing" badge is a static shields.io image, not CI |
| M4 | `lib/default-alerts.ts` invented alerts referencing invented positions |
| M5 | Rate limiter is per-instance in-memory — ineffective on serverless |

---

## Claims vs reality

| Claim | Status |
|---|---|
| "Real-Time SSE Streaming API… live oracle heartbeats, Pyth de-peg alerts" | ❌ `Math.random()` mock (C2) |
| "Every metric is tagged with data source, timestamp, confidence" | ⚠️ Mechanism exists; in the UI all 7 read `model_default` (C1) |
| "Live Pyth, Helius & DeFiLlama Telemetry" | ❌ Driven by a constant (C4) |
| "Institutional-grade quantitative risk engine" | ⚠️ 4 of 7 factors have no data source at all (H3) |
| "Real time position telemetry" | ❌ Fictional positions (C5) or `TVL ÷ 42000` (C3) |
| "Automated de-leveraging transaction generation" | ❌ Sends 0.01 SOL to a fixed address (C6) |
| Transaction simulator (RPC, CU, deltas, drainer scan) | ✅ Genuine |
| On-chain wallet scan (Kamino obligations, real HF) | ✅ Genuine — the best code in the repo |
| Pyth oracle health (confidence bps + staleness) | ✅ Genuine, but never reaches the UI |
| Helius holder concentration | ✅ Genuine, but never reaches the UI |
| Stress engine / policy engine / backtester | ✅ Genuine logic |

---

## Remediation plan

**Principle: an unknown must render as unknown.** No metric ships without a fetcher; anything
without a live source is either removed or explicitly marked unmeasured and excluded from the
composite. A missing number is a feature — a fabricated one is a liability.

### P0 — Stop the harm
1. Delete the fake de-leverage SOL transfer (C6).
2. Replace the mock SSE stream with real Pyth feed data (C2).
3. Stop serving `DEFAULT_SOLANA_POSITIONS` as real positions (C5).
4. Unblock the browser's live path: make read-only endpoints public, rate-limited (C1).

### P1 — Stop the fabrication
5. Delete the `TVL ÷ 42000` position telemetry and its decision gate (C3).
6. Drive the "Live" badge and Data Freshness from real factor provenance (C4, H1, H11).
7. Delete unfetchable metrics: monthly web visits, domain trust, social sentiment (H4).
8. Ground `web_community` in the real GitHub API (commits/contributors, 30d).
9. Mark `mev_bot_density` and `liquidation_rekt` unmeasured; renormalise composite weights over
   measured factors only, and surface the coverage ratio (H3).
10. Fix DeFiLlama slugs (H10).
11. Trend `unknown` → "Not enough history" (H7).
12. Epoch failure → error state, not `epoch 642` (H8); label latency honestly (H9).
13. Real counts or `—`, never `1420` / `4` / `99.8%` (H1, H2, H6).
14. Sub-sections consume the live `breakdown` prop (H5).

### P2 — Security & credentials
15. Remove the `ss_test_key_mock_12345` bypass outside development (M1).
16. Harden `issueApiKey` — fail loudly instead of `Math.random()` (M2).
17. **Rotate the Supabase service-role key** (C7) — requires the operator; the key in `.env.local`
    is rejected with 401. Until then the DB layer should fail visibly, not silently.

---

## Round 2 — findings after the Supabase key was rotated

Restoring the datastore exposed a second layer that a dead database had been hiding.

### R1 — 6 of 11 program IDs did not exist on Solana mainnet

The protocol page renders `program_ids` as clickable Solscan links under "Program Verification".
Checked every one with `getAccountInfo` against mainnet-beta:

| Protocol | Shipped ID | Result | Corrected to |
|---|---|---|---|
| kamino | `6LtLMovXri1…8f65` | **does not exist** | `KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD` |
| drift | `dRifT22bwewy…Y467` | **does not exist** | `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH` |
| orca | `whirL2aR24W1…W5k` | **does not exist** | `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` |
| jito | `Jito4APyf642…u14` | **does not exist** | `SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy` |
| marinade | `MarBGuBtVETK…B6u` | **does not exist** | `MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD` |

An agent verifying that a transaction targets the expected program would have been checking
against an address that holds no program at all. All nine are now verified executable, and
`scripts/seed-protocols.js` refuses to seed if any ID fails that check.

### R2 — Two divergent protocol registries

`lib/default-protocols.ts` and `scripts/seed-protocols.js` each carried their own hardcoded
protocol list, with **different program IDs for the same protocol** (orca, drift, marinade, jito)
and their own hardcoded `risk_score` values — which is where the database's stale scores came
from. Both now read `lib/protocol-registry.json`, which holds identity only: no TVL, no risk
score, no telemetry.

### R3 — The snapshot table never existed, and could not have been created

`scripts/migrate.js` only applied `schema.sql` and `rls-policies.sql`. It never applied
`snapshots.sql` or `push.sql`, so `protocol_metric_snapshots` and `push_subscriptions` were
absent from the database — trend history could never accumulate.

Had it run, it would have failed anyway:

```sql
CREATE UNIQUE INDEX ... ON protocol_metric_snapshots(protocol_slug, date_trunc('hour', captured_at));
```

`date_trunc()` over a `timestamptz` is STABLE, not IMMUTABLE, so Postgres rejects it in an index
expression. And `recordSnapshot` upserted with `onConflict: 'protocol_slug,captured_at'`, which
matched no constraint — so every write would have failed, silently, inside a best-effort
`try/catch`. Replaced with an explicit `captured_hour` column and a real unique constraint;
verified idempotent by running sync twice in the same hour (9 rows, not 18).

### R4 — A 20-minute-old snapshot was reported as a 7-day trend

With snapshots finally writing, the first risk-check returned:

```json
{"composite_7d_delta": 0.9, "direction": "improving", "snapshots_available": 1}
```

from a single snapshot taken 20 minutes earlier. `nearest()` picked the closest row at *any*
distance, so one fresh row stood in for both the 7-day and 30-day reference and the UI rendered
"Improving". Reference snapshots must now fall within ±2 days (7d) or ±7 days (30d) of the
requested age, or the delta is null and the direction is `unknown`.

---

## Round 3 — grounding Market Integrity with the Jupiter Token API

A Jupiter Portal key was supplied, which unlocked the Token API v2. That API classifies each
trade as organic or non-organic (bot, arbitrage, market-maker, wash) and publishes a calibrated
0–100 `organicScore` per token — a real measurement of the signal this engine originally faked
as a hardcoded `bot_density_pct`.

**Independent validation of an existing fetcher.** Jupiter's `audit.topHoldersPercentage` for
Kamino reads 54.4%; the Helius `getTokenLargestAccounts` path independently computes 54.4%. Two
unrelated sources agreeing to the decimal is good evidence the whale-concentration factor is
correct. Jupiter is now a fallback for it when the RPC is unavailable — which it already is for
Jupiter's and Raydium's own tokens.

**Why the obvious formula was rejected.** The tempting mapping is
`bot_density = 100 − organic_volume_%`, fed to the existing `10 − pct/10` curve. Measured across
the tracked protocols, organic volume runs **2.5% (Meteora) to 37% (Marinade)** — so that formula
scores every protocol between 0.3 and 3.7 out of 10. On any liquid token most volume genuinely
is market-maker and arbitrage flow; reporting the market norm as near-total risk would be a
fabrication in the opposite direction, and a factor that says "everything is terrible" carries no
decision value. Jupiter's calibrated score is used instead and spreads 5.8–9.7 across the same set.

**Scope is stated everywhere it appears.** The factor measures the *governance token's* market,
not the protocol's transaction flow. It is labelled "Market Integrity", its rationale line ends
with "Measures the governance token market, not swap-level sandwich risk", and `llms.txt` tells
agents explicitly not to read it as sandwich risk. The `mev_bot_density` key is retained for API
compatibility.

Also newly surfaced as real warnings: `mintAuthorityDisabled` and `freezeAuthorityDisabled`. A
live freeze authority means the issuer can freeze holder balances. All nine currently report
disabled, and a `null` (Jupiter did not report it) is kept distinct from `false` rather than
defaulting to safe.

**Coverage: 4/7 → 6/7 factors (55% → 80% of model weight)** for 8 of 9 protocols, measured while
GitHub had request budget. Pump.fun rose to 5/7 after its PUMP mint (`pumpCmXq…9Dfn`, verified
on-chain: 847B supply, 126k holders) was added to the token map.

**GitHub is now the binding constraint, and it is a hard one.** A later run of the same endpoint
returned 5/7 and 4/7 across the index. The cause was not a regression: `sourcesUnavailable` named
`github:commits` on every single protocol, and `api.github.com/rate_limit` confirmed
`{"limit": 60, "remaining": 0}`. Scoring the index costs ~36 unauthenticated requests, so two
scorings inside an hour exhaust the budget. **Set `GITHUB_TOKEN`** (5,000/hr) or Developer
Activity will keep dropping in and out of the composite. This is exactly the diagnosis the
`sourcesUnavailable` field exists to make possible — before this audit the same failure would
have silently produced a confident score built on a constant.

---

## Outcome

All items above are implemented. `tsc --noEmit` clean, `next build` clean, 31/31 tests passing
(the risk-scorer suite was rewritten — it previously asserted that the invented constants existed).

### Before / after, same protocol, same page

| | Before | After |
|---|---|---|
| Kamino safety score | **10.0 / 10** | **7.7 / 10** |
| Factors backing it | 0 live (all "BASELINE DEFAULT") | 4 live, 3 marked unmeasured |
| Header badge | "🟢 Live Pyth, Helius & DeFiLlama Telemetry" | "4/7 factors live (65% of model weight) via pyth:oracle, helius:holders, defillama:tvl+fees" |
| Whale concentration | 28.5% (constant) | 54.4% (Helius, top-10 holders of KMNO) |
| Developer activity | "142 commits, 18 devs" (constant) | read live from `github.com/Kamino-Finance` |
| Active positions | 25,091 (`TVL ÷ 42000`) | "—", linked to the real wallet scan |
| 7-day trend | "Stable" | "Not enough history" |
| Verdict vs recommendation | `proceed` in the header, `CHANGE_POSITION` below | consistent |

Dashboard tiles that were `1420`, `4` and `99.8%` now read `—`, `—` and a real
`54% (34/63 factors grounded)`, with an explicit "Datastore unavailable (Invalid API key)"
banner instead of silent substitution.

### Design decision: the coverage floor

Renormalising weight across measured factors has a sharp failure mode. When only the
audit factor resolved, it inherited 100% of the weight and an audited protocol scored a
confident **10.0/10 on a single data point** — arguably worse than the original bug.

The engine now withholds a directional recommendation below 50% weight coverage:
it returns `HOLD`, reports the indicative score with its band, and names what is missing.
Pump.fun currently sits at 2/7 coverage and correctly returns `HOLD` rather than the
9.0/10 "safe" reading the raw arithmetic produces.

### Known limitations (documented, not hidden)

1. **`liquidation_rekt` is unmeasured for every protocol** — protocol-wide near-liquidation
   ratios need per-obligation indexing. Shown greyed out with the reason, excluded from the
   composite, and listed in `factor_coverage.unmeasured`. Real liquidation risk is available
   per-wallet through the on-chain position scan.
   `mev_bot_density` was grounded in round 3 (see below) and relabelled **Market Integrity**;
   its scope is the governance token's market, not swap-level sandwich risk.
2. **Category market share mixes parent and child scope.** The numerator is a protocol's
   DeFiLlama *parent* TVL, which for Jupiter aggregates Lend, Perps and Staked SOL; the
   denominator is one category's Solana total. Jupiter therefore reads 89.2% of "Solana DEX
   TVL", which overstates it. Impossible values (>100%) are now suppressed rather than
   displayed, but a like-for-like per-category numerator is the correct fix.
3. **GitHub is rate-limited without a token.** 60 req/hr unauthenticated; scoring the index
   costs ~36. Results cache for 6h and a partial sample is discarded rather than
   under-reported, but `GITHUB_TOKEN` should be set. Documented in `.env.example`.
4. **The audit registry is unverified.** `audit_status`, `auditors` and `audit_date` in
   `lib/default-protocols.ts` are maintained by hand and the dates are from 2023–2024.
   They are tagged `protocol_docs` (confidence 0.7), not presented as live measurements,
   but they should be re-verified and given source URLs.
5. **Datastore is live.** The service-role key was rotated by the operator; migrations applied,
   9 protocols seeded with verified program IDs, and snapshots now write hourly. Trend will read
   `unknown` until ~7 days of history accumulate, which is the correct answer until then.
6. **`agent-autonomy` does not build transactions.** Its `executeDeleveraging` carries a
   `// In production, this would build and send actual transactions` comment and returns an
   estimate. README and landing copy now describe it as sizing-and-policy, not execution.
