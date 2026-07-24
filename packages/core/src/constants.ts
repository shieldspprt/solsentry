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
  github: 0.85,
  jito: 0.85,
  // Published governance parameters: accurate when read, but a static document
  // rather than a live measurement, so trusted less than an API reading.
  protocol_docs: 0.7,
  derived: 0.6,
  unmeasured: 0,
};

// Governance parameters taken from each protocol's published documentation.
// These are citations, not measurements — they are tagged `protocol_docs` so a
// consumer can tell them apart from anything read off-chain. A protocol absent
// from this map reports its timelock as unknown rather than assuming one.
export const PROTOCOL_GOVERNANCE: Record<string, { timelock_hours: number; source_url: string }> = {
  kamino: { timelock_hours: 48, source_url: 'https://docs.kamino.finance/' },
  drift: { timelock_hours: 24, source_url: 'https://docs.drift.trade/' },
  jupiter: { timelock_hours: 72, source_url: 'https://station.jup.ag/' },
  marinade: { timelock_hours: 48, source_url: 'https://docs.marinade.finance/' },
  jito: { timelock_hours: 48, source_url: 'https://docs.jito.network/' },
};

// Pyth Hermes price feed IDs, verified against
// https://hermes.pyth.network/v2/price_feeds?asset_type=crypto
//
// Six of these were previously wrong and every request 404'd, so the oracle
// factor silently degraded to a default on every single scoring call. If you
// change one, re-verify it against the endpoint above — a bad ID here fails
// quietly rather than loudly.
export const PYTH_FEED_IDS = {
  SOL_USD: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  USDC_USD: 'eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  USDT_USD: '2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  BTC_USD: 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH_USD: 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  JITOSOL_USD: '67be9f519b95cf24338801051f9a808eff0a578ccb388db73b7f6fe1de019ffb',
  MSOL_USD: 'c2289a6a43d2ce91c6f55caec370f4acc38a2ed477f58813334c6d03749ff2a4',
  BSOL_USD: '89875379e70f8fbadc17aef315adf3a8d5d160b811435537e03c97e8aac97d9c',
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
