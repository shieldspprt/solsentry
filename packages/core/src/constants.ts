import { ActionType, PolicyRules } from '../../../lib/types';
import { RISK_MODEL_VERSION as VERSION_FROM_LIB } from '../../../lib/version';

export const SUPPORTED_PROTOCOLS = [
  'kamino',
  'drift',
  'jupiter',
  'orca',
  'raydium',
  'meteora',
  'marinade',
  'jito',
  'pumpfun',
] as const;
export type SupportedProtocol = typeof SUPPORTED_PROTOCOLS[number];

export const SUPPORTED_ACTIONS = [
  'swap',
  'lend',
  'borrow',
  'lp',
  'stake',
  'perp_long',
  'perp_short',
  'buy_bonding_curve',
] as const;
export type SupportedAction = typeof SUPPORTED_ACTIONS[number];

export const RISK_MODEL_VERSION = VERSION_FROM_LIB;

// Composite weights per factor (sum = 1.0). Single source of truth used by
// both the scorer and the documentation/UI so weights never drift apart.
export const FACTOR_WEIGHTS = {
  audit_governance: 0.15,
  liquidation_rekt: 0.15,
  mev_bot_density: 0.12,
  whale_concentration: 0.12,
  oracle_depeg: 0.1,
  web_community: 0.08,
  business_efficiency: 0.08,
  smart_money_flows: 0.1,
  social_sentiment_velocity: 0.05,
  validator_concentration: 0.05,
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
  JITOSOL_USD: '67be9f519b95cf24338801051f9a808eff0a57f23b3c38096245d65c3453b3b4',
  MSOL_USD: 'c2574245143e16c3b6ae3164906109fe16a75a7c36a445d4c82c21950e304b50',
  BSOL_USD: '06085a8501257470ec08d0a79a6156f7091924559c5d0ef4ef83c3ec5bfb7eb0',
  USDT_USD: '2b89b9dc8fdf9f34709a5b106b272f08f39c258a6daf355d2993630739090484',
};

export const DEFAULT_POLICY_RULES: PolicyRules = {
  max_single_tx_usd: 10000,
  max_daily_volume_usd: 50000,
  max_position_size_usd: 25000,
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
