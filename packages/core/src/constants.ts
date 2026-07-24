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
// Weights reflect how much each factor has to say about losing money.
//
// exploit_incidents leads because it is the only factor describing what has
// actually happened to a protocol rather than how it looks. oracle_depeg rose
// once it became per-protocol (it was previously the same SOL/USD reading for
// every protocol, contributing nothing). web_community and business_efficiency
// fell to 5%: commit counts and fee/TVL are weak, noisy proxies for solvency
// and were carrying more weight than their signal justifies.
export const FACTOR_WEIGHTS = {
  exploit_incidents: 0.25,
  audit_governance: 0.15,
  liquidation_rekt: 0.15,
  oracle_depeg: 0.15,
  whale_concentration: 0.1,
  mev_bot_density: 0.1,
  web_community: 0.05,
  business_efficiency: 0.05,
} as const;

// Confidence assigned to a factor by the provenance of its driving metric.
export const SOURCE_CONFIDENCE: Record<string, number> = {
  pyth: 0.95,
  helius: 0.9,
  onchain: 0.9,
  defillama: 0.85,
  github: 0.85,
  jito: 0.85,
  // Jupiter's organicScore is a derived index rather than a raw reading, so it
  // is trusted slightly below a direct measurement of an observable quantity.
  jupiter: 0.85,
  // Published governance parameters: accurate when read, but a static document
  // rather than a live measurement, so trusted less than an API reading.
  protocol_docs: 0.7,
  derived: 0.6,
  unmeasured: 0,
};

// The price feeds a protocol's solvency actually depends on.
//
// Every protocol previously scored against a single hardcoded SOL/USD reading,
// so the oracle factor returned an identical value across the whole index and
// could not differentiate anything despite carrying real weight. A lending
// market's risk lies in its collateral AND its stablecoin quote assets; a
// liquid-staking protocol's lies in its LST tracking SOL.
export const PROTOCOL_ORACLE_FEEDS: Record<string, Array<keyof typeof PYTH_FEED_IDS>> = {
  kamino: ['SOL_USD', 'USDC_USD', 'USDT_USD', 'JITOSOL_USD', 'MSOL_USD'],
  drift: ['SOL_USD', 'USDC_USD', 'BTC_USD', 'ETH_USD'],
  jupiter: ['SOL_USD', 'USDC_USD', 'USDT_USD'],
  raydium: ['SOL_USD', 'USDC_USD'],
  orca: ['SOL_USD', 'USDC_USD'],
  meteora: ['SOL_USD', 'USDC_USD'],
  marinade: ['SOL_USD', 'MSOL_USD'],
  jito: ['SOL_USD', 'JITOSOL_USD'],
  pumpfun: ['SOL_USD'],
};

/** Feeds that are supposed to hold a dollar peg, so deviation is meaningful. */
export const STABLECOIN_FEEDS: Array<keyof typeof PYTH_FEED_IDS> = ['USDC_USD', 'USDT_USD'];

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
