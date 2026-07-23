# Changelog

All notable changes to the SolSentry project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-07-23

### Added
- **Solana Transaction Pre-Execution Simulator**: Deserializes raw base58/base64 Solana payloads, replaces recent blockhashes, executes RPC simulation with `sigVerify: false`, tracks Compute Units (CU), and computes incoming vs. outgoing SOL/SPL token balance deltas.
- **Wallet Drainer Pattern Detector**: Scans instruction logs for malicious sequences (`Approve` or `SetAuthority` followed by immediate `Transfer` / `CloseAccount`, or >90% single-tx account balance drains).
- **Official Agent TypeScript SDK (`@solsentry/sdk`)**: Standalone TypeScript package for Solana AI trading bots providing `checkProtocolRisk()`, `evaluatePolicy()`, `preflight()`, and `simulateTransaction()`.
- **Official ElizaOS Agent Plugin (`@solsentry/eliza-plugin`)**: Standalone plugin enabling ElizaOS (ai16z) AI agents to seamlessly run SolSentry risk actions.
- **RugCheck API Integration**: Dynamic token security report fetcher inspecting mint/freeze authority, LP lock status, and token risk scores with 15-minute TTL caching.
- **Data Quality Indicator**: Explicit `data_quality` metrics (`live_sources_count`, `is_reliable`, `warning`) attached to composite risk outputs.
- **Asset-Tiered Volatility in Stress Engine**: Differentiates 1-sigma daily volatility by asset class (Stablecoins 0.5%, Majors 6.0%, Mid-caps 15.0%, Memecoins 40.0%).
- **Pyth LST Oracle Feeds**: Added `JITOSOL_USD`, `MSOL_USD`, `BSOL_USD`, and `USDT_USD` Pyth price feeds for liquid staking de-peg monitoring.
- **Webhook API (`POST /api/v1/webhooks/subscribe`)**: Real-time event subscription endpoint for AI trading agents to receive HTTPS liquidation alerts.
- **Interactive Transaction Simulator Dashboard View**: Interactive UI on `/dashboard/simulator` rendering net balance deltas, CU consumption meters, and drainer warnings.

### Changed
- **MCP Server Tool Definitions**: Rebranded all canonical tools to `solsentry_*` (e.g. `solsentry_preflight`, `solsentry_simulate_transaction`).
- **Middleware Authentication**: Enforced strict `ss_` API key verification against the `users` table across all environments.
- **Content Security Policy (CSP)**: Removed `'unsafe-eval'` from Content-Security-Policy headers in `netlify.toml` and `next.config.js`.

### Security
- Redacted historical API keys and project references from repository.
- Enforced 1MB request body size limits (`413 Payload Too Large`).
- Implemented API Key Rotation endpoint `POST /api/v1/auth/rotate-key`.
- Fixed CORS wildcard fallback to match exact request origins against `NEXT_PUBLIC_APP_URL`.
