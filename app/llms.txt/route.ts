import { NextResponse } from 'next/server';

export async function GET() {
  const content = `# SolSentry AI Agent DeFi Risk Engine for Solana

SolSentry is an open source safety middleware, quantitative risk engine, and policy engine for AI agents interacting with Solana DeFi protocols. Before executing any swap, lend, borrow, stake, or perp transaction, agents query SolSentry for a provenance-tagged safety score (with a confidence band), position health, stress-test exposure, and policy guardrail decisions.

## Scoring model (v3): grounded and honest

Every factor carries its data source, timestamp, and confidence. Live signals are pulled from Pyth (oracle confidence interval + publish staleness), Helius (on-chain token holder concentration), DeFiLlama (TVL, fee series, category share), the GitHub API (commits and contributors, 30d), and the Jupiter Token API (organic-activity score, organic vs bot/arbitrage volume split, token mint/freeze authority status).

Where a factor has no live source it is returned as measured: false, score: null, source: "unmeasured". It contributes NOTHING to the composite and its weight is redistributed across the factors that do have data. SolSentry does not substitute a default value for a missing measurement.

Read factor_coverage before trusting the score:
- measured_factors / total_factors — how many of the seven factors resolved
- weight_covered_pct — share of nominal model weight actually backed by data
- unmeasured — which factors are missing and why (each factor's rationale explains it)

Below 50% weight coverage the engine returns agentDecision.action = "HOLD" and withholds a directional recommendation rather than inferring one from too little evidence. Typical live coverage is 60-70%.

Currently unmeasured for all protocols: liquidation_rekt (protocol-wide near-liquidation ratios need per-obligation indexing). For real liquidation risk, call solsentry_get_position_health with a walletAddress — that path reads actual on-chain positions.

Scope note on the mev_bot_density factor (labelled "Market Integrity"): it scores Jupiter's organic-activity score for the protocol's GOVERNANCE TOKEN market — how much of that token's volume is genuine rather than bot, arbitrage or wash flow, plus whether mint and freeze authority are disabled. It is a proxy for token manipulation and dump risk. It is NOT a measure of sandwich or MEV risk on a swap routed through the protocol. Do not read it as one.

Direction is explicit: safetyScore is 0..10 where HIGHER = SAFER. Treat the confidence band, not the point score, as the decision input.

## Positions are never simulated

solsentry_get_position_health, solsentry_stress_test and POST /api/v1/positions/read operate ONLY on real on-chain data read for a wallet address (Kamino lending obligations today; Drift pending). Called without a wallet they return an empty position set with dataSource: "none" — they do not return sample or example positions. An empty result means "nothing read", not "nothing at risk".

## Model Context Protocol (MCP) Standard Server

SolSentry operates a standard MCP server for Claude, ElizaOS, GPT, Solana Agent Kit, and custom AI agents. Responses include structured content, a model version, and a data-as-of timestamp for reproducibility.

### MCP Tools Available:

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
