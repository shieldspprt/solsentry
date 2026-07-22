import { ActionType, PolicyRules } from '../../../lib/types';

export const SUPPORTED_PROTOCOLS = [
  'kamino',
  'drift',
  'jupiter',
  'orca',
  'raydium',
  'meteora',
  'marinade',
  'jito',
] as const;

export const DEFAULT_RISK_WEIGHTS = {
  audit_weight: 0.35,
  tvl_weight: 0.25,
  oracle_weight: 0.25,
  exploit_weight: 0.15,
};

// Semantic version of the scoring model. Exposed on every risk response so
// agents can reproduce or pin decisions and detect model changes.
export const RISK_MODEL_VERSION = '3.0.0';

// Composite weights per factor (sum = 1.0). Single source of truth used by
// both the scorer and the documentation/UI so weights never drift apart.
export const FACTOR_WEIGHTS = {
  audit_governance: 0.2,
  liquidation_rekt: 0.2,
  mev_bot_density: 0.15,
  whale_concentration: 0.15,
  oracle_depeg: 0.1,
  web_community: 0.1,
  business_efficiency: 0.1,
} as const;

// Confidence assigned to a factor by the provenance of its driving metric.
export const SOURCE_CONFIDENCE: Record<string, number> = {
  pyth: 0.95,
  helius: 0.9,
  onchain: 0.9,
  defillama: 0.85,
  jito: 0.85,
  derived: 0.6,
  model_default: 0.3,
};

export const PYTH_FEED_IDS = {
  SOL_USD: 'ef0be8735516c9656247329c7d24d315866170d6e609d8429710d7225cb94c87',
  USDC_USD: 'eaa02011d748f773182c9f3d84a90075d5027a6100e3fe13eed7e96b70d9a64e',
  BTC_USD: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH_USD: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
};

export const DEFAULT_POLICY_RULES: PolicyRules = {
  max_single_tx_usd: 1000,
  max_daily_volume_usd: 10000,
  max_position_size_usd: 5000,
  max_drawdown_pct: 15,
  allowed_protocols: [...SUPPORTED_PROTOCOLS] as unknown as string[],
  blocked_protocols: [],
  allowed_actions: ['lend', 'borrow', 'swap', 'lp', 'stake'] as ActionType[],
  blocked_actions: [],
  min_risk_score: 5.0,
  auto_deleverage_health_factor: 1.2,
  cooldown_after_loss_hours: 24,
  max_open_positions: 10,
  require_oracle_healthy: true,
  require_audited: false,
};
