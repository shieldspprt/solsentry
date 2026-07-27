# Changelog

All notable changes to the SolSentry project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [3.1.5] - 2026-07-27

### Changed
- Bumped `@npmsolsentry/sdk`, `@npmsolsentry/cli`, `@npmsolsentry/mcp`, the Smithery manifest, and the application version constants to 3.1.5.

### Fixed
- Corrected the oracle sampling bucket so a bucket timestamp can never precede Pyth's `asOf` timestamp for the sample it contains.

### Removed
- Legacy binary aliases from the CLI and MCP packages.

## [3.1.4] - 2026-07-27

### Added
- **Explainable oracle anomaly detection**: a per-feed online detector using rolling median/MAD baselines plus EWMA variance over price returns, confidence-band expansion, oracle staleness, slot lag, and stablecoin de-peg. Events carry severity, a 0–100 score, per-feature contributions, and baseline-window counts. Guardrail thresholds fire before a baseline has warmed up.
- **`event: anomaly` on the SSE stream** (`GET /api/v1/stream`) alongside the existing `event: telemetry`, surfaced in the alerts dashboard.
- **Resilient Solana WebSocket streaming**: a browser-native `slotSubscribe` network-health stream with jittered exponential backoff, notification validation, and idle-socket teardown, configured via `NEXT_PUBLIC_SOLANA_WS_URL`.
- Durable rolling oracle-anomaly state, deterministic event claiming, persisted webhook subscriptions, and webhook delivery records in Supabase (`sql/anomaly-monitoring.sql`, applied with `npm run migrate`).
- Authenticated webhook subscription listing (`GET /api/v1/webhooks/subscribe`) and callback URL validation.
- Typed SPL Token and Token-2022 inner-instruction parsing, address lookup table resolution, and native payer balance analysis in the transaction simulator, surfaced through the SDK and simulator UI.
- Dedicated inner-instruction, monitor-deduplication, cold-start restoration, and webhook-validation tests. The suite now runs 69 tests across 13 files.

### Changed
- CPI token transfers are now informational unless corroborated by authority mutation or a measured balance sweep, avoiding normal swap/lending false positives.
- Replaced per-client anomaly polling with a shared process monitor using serializable rolling MAD/EWMA state, deterministic sample buckets, and cross-instance event claiming.
- Migrated the Next.js middleware convention to `proxy.ts`.
- Updated Next.js, React, Vitest, MCP, PostCSS, Sharp, and transitive security overrides; all checked package trees now pass `npm audit` with zero findings.
- Aligned the Smithery manifest, package metadata, hosted URL, and CLI/MCP binary aliases at v3.1.4.

### Removed
- Root-level one-off patch scripts and manual transaction probes superseded by deterministic tests.

## [3.0.0] - 2026-07-23

### Added
- **Solana Transaction Pre-Execution Simulator**: Deserializes raw base58/base64 Solana payloads, replaces recent blockhashes, executes RPC simulation with `sigVerify: false`, tracks Compute Units (CU), and computes incoming vs. outgoing SOL/SPL token balance deltas.
- **Wallet Drainer Pattern Detector**: Scans instruction logs for malicious sequences (`Approve` or `SetAuthority` followed by immediate `Transfer` / `CloseAccount`, or >90% single-tx account balance drains).
- **Official Agent TypeScript SDK (`@npmsolsentry/sdk`)**: Standalone TypeScript package for Solana AI trading bots providing `checkProtocolRisk()`, `evaluatePolicy()`, `preflight()`, and `simulateTransaction()`.
- **Official ElizaOS Agent Plugin (`@npmsolsentry/eliza-plugin`)**: Standalone plugin enabling ElizaOS (ai16z) AI agents to seamlessly run SolSentry risk actions.
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
