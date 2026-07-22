# AgentGate: Solana AI Agent Risk Engine

AgentGate is an open source quantitative risk engine, position liquidation monitor, and guardrail policy middleware for Solana AI trading agents.

## Scoring model v3 — grounded, provenance-tagged, honest

Every safety factor carries its **data source, timestamp, and confidence**. Live signals come from **Pyth** (oracle confidence interval + publish staleness), **Helius** (on-chain token holder concentration), and **DeFiLlama** (TVL + fees). When live data is unavailable a factor falls back to a documented default *and* its confidence drops — which **widens the composite confidence band**. Direction is explicit: `safetyScore` is `0..10` where **higher = safer**. Consumers should treat the **band**, not the point score, as the decision input. Every response includes `modelVersion` and `dataAsOf` for reproducibility, plus `topDrivers`, `whatWouldFlip`, and 7d/30d `trend` deltas (from `protocol_metric_snapshots`).

## What AI Agents Can Do

AI trading agents (ElizaOS, Solana Agent Kit, Claude, GPT, custom bots) query AgentGate via Model Context Protocol (MCP) or REST APIs before performing swaps, loans, perp trades, or liquidity provision:

1. Query Protocol Risk Scores: Fetch institutional composite risk ratings (0 to 10 scale) integrating audit history, Pyth oracle health, bot density, and category market share.
2. Evaluate Guardrail Policies: Validate whether a planned transaction passes single transaction caps, daily volume thresholds, drawdown limits, and minimum risk scores.
3. Monitor Position Health Factors: Read real time lending and perp position health factors, liquidation prices, and recommended agent actions (HOLD, TAKE_POSITION, CHANGE_POSITION, SELL_POSITION).
4. Fetch Capital Ratios: Access category market share, capital efficiency ratios, and on-chain telemetry for Solana protocols including Jupiter, Kamino, Raydium, Jito, Marinade, Meteora, Orca, Drift, and Pump.fun.

## What Human Managers Can Do

Human fund managers and delegators use the AgentGate web interface to monitor and protect trading portfolios:

1. Real Time Dashboard: View Solana Mainnet epoch progress, slot height, RPC latency, and imminent liquidation warnings across tracked positions.
2. One Click De-Leveraging: Execute emergency de-leveraging transactions directly on chain via Phantom or Solflare wallet signatures.
3. Guardrail Customization: Set custom financial safety boundaries, drawdown circuit breakers, and oracle dependency rules.
4. Agent Management: Register AI agent profiles and link Solana mainnet wallet addresses.

## MCP Server Integration

AgentGate provides standard Model Context Protocol (MCP) tools (responses include structured content):

- agentgate_preflight — one-shot PROCEED / DO_NOT_PROCEED verdict (risk + policy combined), with `maxAllowedUsd`, drivers, trend, and alternatives. **Call this first.**
- agentgate_check_protocol_risk — provenance-tagged safety score + confidence band, factor breakdown, drivers, what-would-flip, trend
- agentgate_evaluate_policy — portfolio-aware guardrail check returning `maxAllowedUsd` and safer alternatives
- agentgate_stress_test — price-shock simulation: liquidations, capital at risk, cascade, time-to-liquidation, collateral to restore safety
- agentgate_get_position_health — pass `walletAddress` to read **real on-chain positions with live health factors** (Kamino live; Drift pending). Also over REST: `POST /api/v1/positions/read`
- agentgate_get_protocol_list
- agentgate_get_business_ratios

### Database migrations
Run `sql/snapshots.sql` (trend history) and `sql/push.sql` (liquidation-alert subscriptions) in addition to `sql/schema.sql`.

## License

MIT License. Copyright (c) 2026 AgentGate Team.
