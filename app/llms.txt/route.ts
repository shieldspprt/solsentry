import { NextResponse } from 'next/server';
import { APP_VERSION } from '../../lib/version';

export async function GET() {
  const content = `# SolSentry AI Agent DeFi Risk Engine for Solana

SolSentry is an open source safety middleware, quantitative risk engine, and policy engine for AI agents interacting with Solana DeFi protocols. Before executing any swap, lend, borrow, stake, or perp transaction, agents query SolSentry for a provenance-tagged safety score (with a confidence band), position health, stress-test exposure, and policy guardrail decisions.

## Scoring model (v${APP_VERSION}): grounded and honest

Every factor carries its data source, timestamp, and confidence. Live signals are pulled from Pyth (oracle confidence interval + publish staleness), Helius (on-chain token holder concentration), DeFiLlama (TVL, fee series, category share), the GitHub API (commits and contributors, 30d), and the Jupiter Token API (organic-activity score, organic vs bot/arbitrage volume split, token mint/freeze authority status).

Where a factor has no live source it is returned as measured: false, score: null, source: "unmeasured". It contributes NOTHING to the composite and its weight is redistributed across the factors that do have data. SolSentry does not substitute a default value for a missing measurement.

Read factor_coverage before trusting the score:
- measured_factors / total_factors — how many of the eight factors resolved
- weight_covered_pct — share of nominal model weight actually backed by data
- unmeasured — which factors are missing and why (each factor's rationale explains it)

Below 50% weight coverage the engine returns agentDecision.action = "HOLD" and withholds a directional recommendation rather than inferring one from too little evidence. Typical live coverage is 80-90% of model weight per protocol when GITHUB_TOKEN is configured.

A factor that does not apply to a protocol (for example borrow liquidation on a DEX with no borrow book) is marked not applicable and excluded from that protocol's coverage denominator, rather than counted as a gap.

The liquidation_rekt factor is measured for lending markets from Kamino market utilization (borrowed over supplied liquidity). For wallet-specific liquidation risk, call solsentry_get_position_health with a walletAddress — that path reads actual on-chain positions.

The exploit_incidents factor (25% weight, DeFiLlama hacks dataset) can override the composite on its own: a realized loss of $10M or more within 180 days forces verdict "block", and $1M or more within 180 days caps the verdict at "avoid". Older incidents decay toward roughly 10% of their weight over three years.

Scope note on the mev_bot_density factor (labelled "Market Integrity"): it scores Jupiter's organic-activity score for the protocol's GOVERNANCE TOKEN market — how much of that token's volume is genuine rather than bot, arbitrage or wash flow, plus whether mint and freeze authority are disabled. It is a proxy for token manipulation and dump risk. It is NOT a measure of sandwich or MEV risk on a swap routed through the protocol. Do not read it as one.

Direction is explicit: safetyScore is 0..10 where HIGHER = SAFER. Treat the confidence band, not the point score, as the decision input.

## Positions are never simulated

solsentry_get_position_health, solsentry_stress_test and POST /api/v1/positions/read operate ONLY on real on-chain data read for a wallet address (Kamino lending obligations today; Drift pending). Called without a wallet they return an empty position set with dataSource: "none" — they do not return sample or example positions. An empty result means "nothing read", not "nothing at risk".

## Model Context Protocol (MCP) Standard Server

SolSentry operates a standard MCP server for Claude, ElizaOS, GPT, Solana Agent Kit, and custom AI agents. Responses include structured content, a model version, and a data-as-of timestamp for reproducibility.

### MCP Tools Available:

0. solsentry_guard_transaction(transaction, [protocolSlug, action, amountUsd]) — THE ONE CALL BEFORE SIGNING
Give it a serialized transaction and it simulates the actual bytes against mainnet (no broadcast), scans for wallet-drainer patterns, and — if you also pass protocolSlug/action/amountUsd — folds in the protocol risk gate and policy guardrails. Returns a single verdict, SIGN or DO_NOT_SIGN, with blockingReasons. A drainer pattern, a failed simulation, a blocked protocol, or a policy violation each force DO_NOT_SIGN. This is the only tool that inspects the transaction you are about to sign. Also over REST: POST /api/v1/guard.

0b. solsentry_simulate_transaction(transaction, [encoding]) — the raw simulator underneath the guard
The single highest-value call here. Executes a serialized transaction against a mainnet RPC WITHOUT broadcasting it, and returns the exact tokens leaving and entering the wallet, compute units, raw logs, parsed SPL Token and Token-2022 inner CPI transfers, address-lookup-table resolution, native payer balance analysis, and a drainer verdict. The drainer scan flags Approve or SetAuthority followed by an immediate Transfer/CloseAccount, and sweeps of >90% of an account balance. Routine CPI token transfers and swap sweeps that are compensated by an inbound balance for the same owner are returned in drainerScan.observations with ZERO penalty — they escalate to a drainer signal only when corroborated by an authority mutation or an uncompensated balance sweep, so ordinary swap, lending and staking flows do not false-positive. A transaction can look routine and still drain a wallet — this is the only tool that inspects the bytes you are about to sign. If drainerScan.isDrainerPattern is true, DO NOT SIGN. Read-only, needs no key material, broadcasts nothing.

1. solsentry_preflight(action, protocolSlug, amountUsd, [portfolio state])
FIRST call before any transaction. Combines risk + policy into a single PROCEED / DO_NOT_PROCEED verdict with reasons, maxAllowedUsd (largest amount that would pass), top risk drivers, trend, and safer alternatives.

2. solsentry_check_protocol_risk(protocolSlug)
Provenance-tagged safety score (0..10, higher = safer) with a confidence band, per-factor breakdown and sources, top drivers, what-would-flip conditions, 7d/30d trend, and an automated agent decision.

3. solsentry_evaluate_policy(action, protocolSlug, amountUsd, [currentDailyVolumeUsd, currentDrawdownPct, openPositionsCount])
Checks single-tx caps, daily volume, drawdown, position count, and risk floor. Returns maxAllowedUsd and same-category alternatives when blocked. Pass portfolio state so volume/drawdown/position limits bind.

4. solsentry_stress_test(priceShockPct?, walletAddress?, agentId?, protocolSlug?)
Simulates an adverse price move (default suite -10/-20/-35). Pass walletAddress to stress REAL on-chain positions. Reports which positions liquidate, capital at risk, cascade exposure, projected portfolio health, time-to-liquidation estimates, and the collateral needed to restore a safe health factor.

5. solsentry_get_position_health(walletAddress?, agentId?, protocolSlug?)
Pass walletAddress to read REAL on-chain positions with LIVE health factors (Kamino lending obligations today; Drift pending). Returns per-position health factor, imminent-liquidation flags, and recommended actions. Without a wallet it reads only stored positions for a registered agent, and returns an empty set with safetyRecommendation "NO_POSITION_DATA" if there are none. Also available over REST: POST /api/v1/positions/read {"walletAddress"}.

6. solsentry_get_protocol_list() / solsentry_get_business_ratios(protocolSlug)
Protocol registry with ratings, and per-protocol TVL, category market share (against summed Solana category TVL), annualised fee capture and fee/TVL ratio from DeFiLlama, plus 30-day GitHub developer activity. Any field the upstream did not report is returned as null.

## Live monitoring between calls: oracle anomaly stream

A guard call answers a question at the instant you ask it. GET /api/v1/stream is a Server-Sent Events feed that keeps watching between calls. It emits two event families:

- event: telemetry — raw Pyth Hermes readings for SOL, USDC and USDT: price, confidence interval, publish staleness, health score.
- event: anomaly — scored, explainable anomaly events from a per-feed online detector.

The detector maintains an independent baseline per feed (rolling median with median absolute deviation, plus EWMA mean and variance) and scores five features against it: price_return_bps (move relative to the feed's own normal volatility), confidence_expansion_bps (publishers disagreeing more than usual — the earliest warning of oracle-driven liquidation risk), oracle_staleness_ms (the feed stopped updating), slot_lag_ms (the oracle is falling behind the chain), and stablecoin_depeg_bps (distance from $1 on a feed that should hold it).

Every anomaly event carries severity, a 0-100 score, feature_contributions naming which features drove it and by how much, and baseline_window counts so an agent can distinguish a warmed-up baseline from a cold one. Hardcoded guardrail thresholds fire immediately on dangerous absolute readings even before a baseline has warmed up, so a de-peg during the first minute of uptime still alerts.

Delivery: all SSE clients in one process share a single upstream poller. Detector state persists across cold starts and deterministic event IDs are claimed in Postgres BEFORE any side effect, so two serverless instances observing the same feed cannot deliver the same webhook twice. Sampling buckets derive from Pyth's own asOf timestamp and can never precede the data they contain.

Register a callback with POST /api/v1/webhooks/subscribe {"url","events":["oracle_anomaly"]} using an X-SolSentry-API-Key header. Subscriptions are attributed to the API key that created them; GET the same endpoint with that key to list them. Callback URLs are validated and HTTPS is enforced in production.

## Supported Solana DeFi Protocols & Launchpads
Kamino Finance (lending), Drift Protocol (perps), Jupiter (dex), Orca (dex), Raydium (dex), Meteora (dex), Marinade Finance (staking), Jito (staking), Pumpfun (launchpad).
`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
