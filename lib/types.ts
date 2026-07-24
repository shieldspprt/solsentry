export type PlanType = 'free' | 'pro' | 'enterprise';

export type AgentType = 'eliza' | 'solana_agent_kit' | 'custom' | 'claude' | 'gpt';

export type ProtocolCategory = 'lending' | 'dex' | 'perps' | 'staking' | 'yield' | 'bridge' | 'launchpad';

export type AuditStatus = 'audited' | 'partial' | 'unaudited' | 'unknown';

export type OracleProvider = 'pyth' | 'switchboard' | 'chainlink';

export type OracleHealth = 'healthy' | 'degraded' | 'down' | 'unknown';

export type ActionType = 'lend' | 'borrow' | 'swap' | 'lp' | 'stake' | 'perp_long' | 'perp_short' | 'buy_bonding_curve';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type RecommendationType = 'proceed' | 'proceed_with_caution' | 'avoid' | 'block';

export type PositionType = 'lend' | 'borrow' | 'lp' | 'stake' | 'perp' | 'bonding_curve';

export type PositionStatus = 'open' | 'closed' | 'liquidated';

export type ViolationSeverity = 'warning' | 'blocked' | 'circuit_breaker';

export type AlertType = 'liquidation_risk' | 'health_factor_low' | 'depeg' | 'protocol_exploit' | 'oracle_down' | 'drawdown_limit' | 'bonding_curve_dump';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed';

export interface UserRecord {
  id: string;
  email: string;
  api_key: string;
  plan: PlanType;
  x402_wallet: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  agent_type: AgentType;
  wallet_address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExploitHistoryItem {
  date: string;
  amount_usd: number;
  description: string;
}

// Developer activity, read from the protocol's public GitHub organisation.
// Web-traffic, domain-trust and "social sentiment" fields used to live here;
// nothing in the codebase ever fetched them, so they were constants presented
// as telemetry and have been removed rather than left unsourced.
export interface WebCommunityStats {
  developer_commits_30d: number | null;
  active_devs_count: number | null;
  github_org: string | null;
  repos_sampled: number | null;
  as_of: string | null;
}

// Economics derived from DeFiLlama TVL + fee series. `null` means the upstream
// did not report it — never a stand-in constant.
export interface BusinessRatios {
  category_market_share_pct: number | null;
  category_tvl_usd: number | null;
  protocol_tvl_usd: number | null;
  annualized_fee_usd: number | null;
  annualized_basis: '30d' | '7d' | '24h' | null;
  fee_to_tvl_ratio_pct: number | null;
}

export type AgentDecisionAction = 'TAKE_POSITION' | 'CHANGE_POSITION' | 'SELL_POSITION' | 'HOLD';

export interface AgentDecision {
  action: AgentDecisionAction;
  confidence_score: number;
  primary_reason: string;
  suggested_strategy: 'increase_collateral' | 'deleverage' | 'exit_protocol' | 'enter_safely' | 'hold';
}

// Every field is nullable by design. `null` is the honest representation of a
// metric SolSentry cannot currently observe, and the scorer excludes null-driven
// factors from the composite instead of scoring them off a constant.
// Market integrity of a protocol's governance token, from Jupiter's Token API.
// Scope: the TOKEN's market, not the protocol's own transaction flow.
export interface TokenMarketIntegrity {
  /** Jupiter's calibrated 0-100 organic-activity score. */
  organic_score: number | null;
  organic_score_label: string | null;
  /** Share of 24h token volume classified as organic rather than bot/arb flow. */
  organic_volume_pct_24h: number | null;
  holder_count: number | null;
  liquidity_usd: number | null;
  /** null means Jupiter did not report the flag — not that it is disabled. */
  mint_authority_disabled: boolean | null;
  freeze_authority_disabled: boolean | null;
  as_of: string | null;
}

export interface InstitutionalRiskMetrics {
  /** Deprecated: never had a source. Superseded by token_market_integrity. */
  bot_density_pct: number | null;
  token_market_integrity?: TokenMarketIntegrity;
  /** % of open value near its liquidation threshold. No public source yet. */
  near_liquidation_ratio_pct: number | null;
  /** Top-10 holder share of token supply (Helius). */
  whale_concentration_pct: number | null;
  /** Pyth publish staleness, used as a slot-lag proxy. */
  oracle_slot_lag_ms: number | null;
  /** Governance upgrade timelock. Sourced from protocol docs, not measured. */
  upgradeability_timelock_hours: number | null;
  web_community?: WebCommunityStats;
  business_ratios?: BusinessRatios;
  /** Share of scored factors grounded in a live source (0..100). */
  live_factor_coverage_pct?: number;
  last_synced_at?: string;
}

export interface ProtocolRecord {
  id: string;
  slug: string;
  name: string;
  category: ProtocolCategory;
  program_ids: string[];
  tvl_usd: number | null;
  tvl_change_24h: number | null;
  audit_status: AuditStatus;
  auditors: string[];
  audit_date: string | null;
  exploit_history: ExploitHistoryItem[];
  oracle_provider: OracleProvider | null;
  oracle_health: OracleHealth;
  risk_score: number | null;
  institutional_metrics?: InstitutionalRiskMetrics;
  last_updated: string;
  created_at: string;
}

// ============================================
// Decision-grade analysis primitives
// ============================================

// Where a driving metric actually came from. Enables provenance-aware trust.
export type DataSource =
  | 'defillama'
  | 'pyth'
  | 'helius'
  | 'github'
  | 'jupiter'
  | 'onchain'
  | 'jito'
  | 'derived'
  | 'protocol_docs'
  | 'unmeasured';

export type FactorKey =
  | 'audit_governance'
  | 'liquidation_rekt'
  | 'mev_bot_density'
  | 'whale_concentration'
  | 'oracle_depeg'
  | 'web_community'
  | 'business_efficiency';

// Provenance + confidence attached to a single driving metric.
export interface FactorProvenance {
  source: DataSource;
  as_of: string; // ISO timestamp of the underlying observation
  confidence: number; // 0..1 — how much we trust this input
}

// A single scored factor with its evidence. Higher score = safer.
// An unmeasured factor carries score === null and contributes nothing: its
// nominal weight is redistributed across the factors that do have data.
export interface FactorScore {
  key: FactorKey;
  label: string;
  measured: boolean;
  score: number | null; // 0..10 (higher = safer); null when unmeasured
  nominal_weight: number; // 0..1 — the factor's weight in a fully-grounded score
  weight: number; // 0..1 — effective weight after renormalisation
  contribution: number; // score * weight — points toward composite
  confidence: number; // 0..1 confidence in the underlying data
  source: DataSource;
  as_of: string | null;
  value: number | null; // raw driving metric (e.g. whale %, oracle ms)
  unit: string; // '%', 'ms', 'usd', 'score', 'ratio', 'hours'
  rationale: string; // one-line explanation of the score, or why it is unmeasured
}

// How much of the model is actually grounded right now.
export interface FactorCoverage {
  measured_factors: number;
  total_factors: number;
  /** Share of nominal weight backed by real data (0..100). */
  weight_covered_pct: number;
  unmeasured: FactorKey[];
}

// Uncertainty envelope around the composite.
export interface RiskConfidence {
  overall: number; // 0..1 weighted data confidence
  score_band_low: number; // composite lower bound
  score_band_high: number; // composite upper bound
  stale_factors: FactorKey[]; // factors whose data is weak/stale/defaulted
  note: string;
}

// The factors most responsible for the current score.
export interface ScoreDriver {
  key: FactorKey;
  label: string;
  impact: 'positive' | 'negative';
  contribution_delta: number; // points above/below the neutral 7.0 baseline
  detail: string;
}

// The concrete conditions that would move the recommendation.
export interface WhatWouldFlip {
  current_recommendation: RecommendationType;
  upgrade_to: RecommendationType | null;
  downgrade_to: RecommendationType | null;
  conditions: string[];
}

// Time-series movement, derived from metric snapshots.
export interface MetricTrend {
  composite_7d_delta: number | null;
  composite_30d_delta: number | null;
  direction: 'improving' | 'deteriorating' | 'stable' | 'unknown';
  factor_deltas: Partial<Record<FactorKey, number>>; // 7d deltas per factor
  snapshots_available: number;
}

export interface DataQualityIndicator {
  live_sources_count: number;
  total_sources_count: number;
  is_reliable: boolean;
  warning?: string;
}

export interface InstitutionalFactorsBreakdown {
  audit_governance_score: number | null;
  liquidation_rekt_score: number | null;
  mev_bot_density_score: number | null;
  whale_concentration_score: number | null;
  oracle_depeg_score: number | null;
  web_community_score: number | null;
  business_efficiency_score: number | null;
  composite_risk_score: number;
  factor_coverage: FactorCoverage;
  risk_tier: RiskLevel;
  action_recommendation: RecommendationType;
  agent_decision: AgentDecision;
  critical_warnings: string[];
  quant_metrics: InstitutionalRiskMetrics;

  // --- Decision-grade additions (optional for backward compatibility) ---
  safety_score?: number;
  score_direction?: 'higher_is_safer';
  factors?: FactorScore[];
  confidence?: RiskConfidence;
  top_drivers?: ScoreDriver[];
  what_would_flip?: WhatWouldFlip;
  trend?: MetricTrend | null;
  model_version?: string;
  data_as_of?: string;
  data_quality?: DataQualityIndicator;
}

export interface RiskCheckRecord {
  id: string;
  agent_id: string | null;
  user_id: string | null;
  protocol_slug: string;
  action: ActionType;
  asset: string | null;
  amount_usd: number | null;
  risk_score: number;
  risk_level: RiskLevel;
  risk_factors: InstitutionalFactorsBreakdown;
  recommendation: RecommendationType;
  response_time_ms: number | null;
  x402_paid: boolean;
  x402_amount: number | null;
  created_at: string;
}

export interface PositionRecord {
  id: string;
  agent_id: string;
  user_id: string;
  protocol_slug: string;
  position_type: PositionType;
  asset: string;
  amount: number;
  amount_usd: number | null;
  entry_price: number | null;
  current_price: number | null;
  health_factor: number | null;
  liquidation_price: number | null;
  pnl_usd: number | null;
  status: PositionStatus;
  last_checked: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyRules {
  max_single_tx_usd: number;
  max_daily_volume_usd: number;
  max_position_size_usd: number;
  max_drawdown_pct: number;
  allowed_protocols: string[];
  blocked_protocols: string[];
  allowed_actions: ActionType[];
  blocked_actions: ActionType[];
  min_risk_score: number;
  auto_deleverage_health_factor: number;
  cooldown_after_loss_hours: number;
  max_open_positions: number;
  require_oracle_healthy: boolean;
  require_audited: boolean;
}

export interface PolicyRecord {
  id: string;
  agent_id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  rules: PolicyRules;
  created_at: string;
  updated_at: string;
}

export interface PolicyViolationRecord {
  id: string;
  agent_id: string;
  policy_id: string;
  rule_violated: string;
  action_attempted: string;
  details: Record<string, unknown>;
  severity: ViolationSeverity;
  created_at: string;
}

export interface AlertRecord {
  id: string;
  agent_id: string | null;
  user_id: string | null;
  position_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface X402PaymentRecord {
  id: string;
  user_id: string | null;
  agent_id: string | null;
  endpoint: string;
  amount_usdc: number;
  tx_signature: string | null;
  status: PaymentStatus;
  created_at: string;
}

// ============================================
// Stress / scenario analysis
// ============================================

export interface StressScenario {
  label: string;
  price_shock_pct: number; // e.g. -20 for a 20% adverse move
}

export interface PositionStressResult {
  position_id: string;
  protocol_slug: string;
  asset: string;
  amount_usd: number | null;
  base_health_factor: number | null;
  stressed_health_factor: number | null;
  base_liquidation_price: number | null;
  current_price: number | null;
  price_buffer_pct: number | null; // distance to liquidation, %
  hours_to_liquidation_est: number | null; // null if not estimable
  liquidates_in_scenario: boolean;
  recommended_action: AgentDecisionAction;
  action_size_usd_to_target: number | null; // collateral/deleverage to restore target HF
}

export interface StressScenarioResult {
  scenario: StressScenario;
  positions_liquidated: number;
  capital_at_risk_usd: number;
  cascade_liquidation_usd: number;
  portfolio_health_after: number | null;
  positions: PositionStressResult[];
}

// ============================================
// Portfolio-aware policy evaluation
// ============================================

export interface PortfolioContext {
  current_daily_volume_usd?: number;
  current_drawdown_pct?: number;
  open_positions_count?: number;
  open_positions_usd?: number;
}

// Time-series snapshot of a protocol's computed risk (for trend analysis).
export interface ProtocolMetricSnapshot {
  id: string;
  protocol_slug: string;
  composite_score: number;
  audit_governance_score: number;
  liquidation_rekt_score: number;
  mev_bot_density_score: number;
  whale_concentration_score: number;
  oracle_depeg_score: number;
  web_community_score: number;
  business_efficiency_score: number;
  tvl_usd: number | null;
  confidence: number | null;
  captured_at: string;
}
