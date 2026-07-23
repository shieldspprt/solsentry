import {
  PositionRecord,
  StressScenario,
  StressScenarioResult,
  PositionStressResult,
  AgentDecisionAction,
} from '../../../lib/types';

// Standard adverse scenarios. Agents can also pass custom shocks.
export const DEFAULT_SCENARIOS: StressScenario[] = [
  { label: 'Mild drawdown (-10%)', price_shock_pct: -10 },
  { label: 'Sharp correction (-20%)', price_shock_pct: -20 },
  { label: 'Black swan (-35%)', price_shock_pct: -35 },
];

export function getAssetDailyVolPct(assetSymbol?: string): number {
  if (!assetSymbol) return 6.0;
  const sym = assetSymbol.toUpperCase();
  if (sym.includes('USDC') || sym.includes('USDT') || sym.includes('USD')) return 0.5;
  if (sym.includes('SOL') || sym.includes('BTC') || sym.includes('ETH')) return 6.0;
  if (sym.includes('KMNO') || sym.includes('DRIFT') || sym.includes('JUP') || sym.includes('ORCA') || sym.includes('RAY')) return 15.0;
  return 40.0;
}

const TARGET_HEALTH_FACTOR = 1.5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Infer directionality from the relationship between price and liquidation
// price: liq below current => long (rekt on downside); liq above => short.
function isLong(current: number, liq: number): boolean {
  return liq < current;
}

export function stressPosition(position: PositionRecord, shockPct: number): PositionStressResult {
  const { id, protocol_slug, asset, amount_usd, current_price, liquidation_price, health_factor, position_type } = position;

  const applicable = position_type === 'borrow' || position_type === 'perp';
  const shockFactor = 1 + shockPct / 100;

  let stressedHf: number | null = null;
  let priceBufferPct: number | null = null;
  let hoursToLiq: number | null = null;
  let liquidates = false;
  let action: AgentDecisionAction = 'HOLD';
  let actionSize: number | null = null;

  // HF-only path: positions with a health factor but no single mark price
  // (e.g. multi-collateral lending obligations). A downside collateral shock
  // scales the health factor directly: HF *= (1 + shock/100).
  if (applicable && health_factor != null && !(current_price && liquidation_price)) {
    stressedHf = round2(Math.max(0, health_factor * shockFactor));
    liquidates = stressedHf <= 1.0;
    if (health_factor <= 1.1 || liquidates) action = 'SELL_POSITION';
    else if (health_factor < TARGET_HEALTH_FACTOR) action = 'CHANGE_POSITION';
    else action = 'HOLD';
    if (health_factor < TARGET_HEALTH_FACTOR && amount_usd) {
      actionSize = Math.round(amount_usd * (TARGET_HEALTH_FACTOR / health_factor - 1));
    }
    return {
      position_id: id,
      protocol_slug,
      asset,
      amount_usd: amount_usd ?? null,
      base_health_factor: health_factor,
      stressed_health_factor: stressedHf,
      base_liquidation_price: null,
      current_price: null,
      price_buffer_pct: null,
      hours_to_liquidation_est: null,
      liquidates_in_scenario: liquidates,
      recommended_action: action,
      action_size_usd_to_target: actionSize,
    };
  }

  if (applicable && current_price && liquidation_price) {
    const long = isLong(current_price, liquidation_price);
    const stressedPrice = current_price * shockFactor;

    // Distance from current price to liquidation, as a % of current price.
    priceBufferPct = round2(Math.abs((current_price - liquidation_price) / current_price) * 100);

    // Health factor scales ~linearly with collateral/mark price in the adverse
    // direction. For a long, downside erodes HF; for a short, upside erodes it.
    if (health_factor != null) {
      const erosion = long ? shockFactor : 2 - shockFactor;
      stressedHf = round2(Math.max(0, health_factor * erosion));
    }

    // Does the shocked price cross the liquidation threshold?
    liquidates = long ? stressedPrice <= liquidation_price : stressedPrice >= liquidation_price;
    if (stressedHf != null && stressedHf <= 1.0) liquidates = true;

    // Time-to-liquidation under asset-specific volatility tier
    const dailyVolPct = getAssetDailyVolPct(asset);
    const hourlySigma = dailyVolPct / Math.sqrt(24);
    if (priceBufferPct != null && hourlySigma > 0) {
      hoursToLiq = Math.round((priceBufferPct / hourlySigma) * 10) / 10;
    }

    // Recommended action + the capital needed to restore a safe HF.
    if (health_factor != null) {
      if (health_factor <= 1.1 || liquidates) {
        action = 'SELL_POSITION';
      } else if (health_factor < TARGET_HEALTH_FACTOR) {
        action = 'CHANGE_POSITION';
      } else {
        action = 'HOLD';
      }
      if (health_factor < TARGET_HEALTH_FACTOR && amount_usd) {
        // Collateral to add (or debt to repay) to lift HF to target.
        actionSize = Math.round(amount_usd * (TARGET_HEALTH_FACTOR / health_factor - 1));
      }
    }
  }

  return {
    position_id: id,
    protocol_slug,
    asset,
    amount_usd: amount_usd ?? null,
    base_health_factor: health_factor ?? null,
    stressed_health_factor: stressedHf,
    base_liquidation_price: liquidation_price ?? null,
    current_price: current_price ?? null,
    price_buffer_pct: priceBufferPct,
    hours_to_liquidation_est: hoursToLiq,
    liquidates_in_scenario: liquidates,
    recommended_action: action,
    action_size_usd_to_target: actionSize,
  };
}

export function runStressScenario(positions: PositionRecord[], scenario: StressScenario): StressScenarioResult {
  const results = positions.map((p) => stressPosition(p, scenario.price_shock_pct));
  const liquidated = results.filter((r) => r.liquidates_in_scenario);
  const capitalAtRisk = liquidated.reduce((sum, r) => sum + (r.amount_usd || 0), 0);

  // Cascade proxy: liquidations beget liquidations. Weight nearby positions
  // (small buffer) as contributing to a cascade beyond the directly-liquidated.
  const cascade = results
    .filter((r) => !r.liquidates_in_scenario && r.price_buffer_pct != null && r.price_buffer_pct < 8)
    .reduce((sum, r) => sum + (r.amount_usd || 0), 0);

  const stressedHfs = results.map((r) => r.stressed_health_factor).filter((h): h is number => h != null);
  const portfolioHealthAfter = stressedHfs.length
    ? Math.round((stressedHfs.reduce((s, h) => s + h, 0) / stressedHfs.length) * 100) / 100
    : null;

  return {
    scenario,
    positions_liquidated: liquidated.length,
    capital_at_risk_usd: Math.round(capitalAtRisk),
    cascade_liquidation_usd: Math.round(capitalAtRisk + cascade),
    portfolio_health_after: portfolioHealthAfter,
    positions: results,
  };
}

export function runStandardStressSuite(positions: PositionRecord[]): StressScenarioResult[] {
  return DEFAULT_SCENARIOS.map((s) => runStressScenario(positions, s));
}
