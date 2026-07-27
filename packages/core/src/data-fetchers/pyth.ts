import { PYTH_FEED_IDS } from '../constants';
import { safeFetchWithRetry } from '../../../../lib/safe-fetch';

const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;

export interface PythPriceData {
  symbol: string;
  price: number;
  confidence: number;
  lastUpdated: number;
}

export async function fetchPythPrice(symbol: keyof typeof PYTH_FEED_IDS): Promise<PythPriceData | null> {
  const feedId = PYTH_FEED_IDS[symbol];
  if (!feedId) return null;

  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      symbol,
      price: cached.price,
      confidence: 0.001,
      lastUpdated: cached.timestamp,
    };
  }

  try {
    const response = await safeFetchWithRetry(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}`, { timeoutMs: 2000 });
    if (!response || !response.ok) return null;

    const json = await response.json();
    const parsedData = json?.parsed?.[0];
    if (!parsedData) return null;

    const rawPrice = Number(parsedData.price.price);
    const exponent = Number(parsedData.price.expo);
    const actualPrice = rawPrice * Math.pow(10, exponent);

    priceCache.set(symbol, { price: actualPrice, timestamp: Date.now() });

    return {
      symbol,
      price: actualPrice,
      confidence: Number(parsedData.price.conf) * Math.pow(10, exponent),
      lastUpdated: Date.now(),
    };
  } catch {
    return null;
  }
}

export interface OracleHealthSignal {
  symbol: string;
  price: number;
  // Confidence interval as a fraction of price. A widening interval is a real,
  // live early-warning of oracle stress / thin liquidity / impending depeg.
  confidence_bps: number; // basis points of price (conf / price * 10000)
  staleness_ms: number; // how old the latest publish is
  // Derived slot-lag proxy and a 0..10 oracle health score (higher = healthier).
  slot_lag_ms: number;
  health_score: number;
  as_of: string;
}

export interface ProtocolOracleHealth {
  /** Health of the weakest feed the protocol depends on — risk is worst-case. */
  worst: OracleHealthSignal;
  feeds: OracleHealthSignal[];
  /** Largest deviation from $1.00 across the protocol's stablecoin feeds, in bps. */
  max_stablecoin_depeg_bps: number | null;
  as_of: string;
}

// Oracle health across every feed a protocol's solvency depends on, scored on
// the weakest link. A lending market is only as safe as its shakiest collateral
// or quote feed, so averaging would hide exactly the case that matters.
export async function fetchProtocolOracleHealth(
  symbols: Array<keyof typeof PYTH_FEED_IDS>,
  stablecoins: Array<keyof typeof PYTH_FEED_IDS> = []
): Promise<ProtocolOracleHealth | null> {
  if (!symbols.length) return null;

  const results = (await Promise.all(symbols.map((s) => fetchOracleHealth(s)))).filter(
    (r): r is OracleHealthSignal => r !== null
  );
  if (results.length === 0) return null;

  const worst = results.reduce((w, r) => (r.health_score < w.health_score ? r : w), results[0]);

  // A stablecoin drifting off its peg is a direct, readable solvency signal for
  // any market that quotes or collateralises in it.
  const stableSet = new Set<string>(stablecoins as string[]);
  const depegs = results
    .filter((r) => stableSet.has(r.symbol))
    .map((r) => Math.abs(r.price - 1) * 10000);
  const maxDepegBps = depegs.length > 0 ? Math.round(Math.max(...depegs) * 10) / 10 : null;

  return {
    worst,
    feeds: results,
    max_stablecoin_depeg_bps: maxDepegBps,
    as_of: new Date().toISOString(),
  };
}

// Pull the live oracle health for a feed: confidence interval width + publish
// staleness are the two signals that actually predict oracle-driven liquidations.
export async function fetchOracleHealth(
  symbol: keyof typeof PYTH_FEED_IDS = 'SOL_USD'
): Promise<OracleHealthSignal | null> {
  const feedId = PYTH_FEED_IDS[symbol];
  if (!feedId) return null;

  try {
    const response = await safeFetchWithRetry(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}`, { timeoutMs: 2000 });
    if (!response || !response.ok) return null;
    const json = await response.json();
    const parsed = json?.parsed?.[0];
    if (!parsed) return null;

    const expo = Number(parsed.price.expo);
    const price = Number(parsed.price.price) * Math.pow(10, expo);
    const conf = Number(parsed.price.conf) * Math.pow(10, expo);
    const publishTimeMs = Number(parsed.price.publish_time) * 1000;
    const staleness = Math.max(0, Date.now() - publishTimeMs);
    const confBps = price > 0 ? (conf / price) * 10000 : 0;

    // Health: penalise wide confidence intervals and stale publishes.
    // >50 bps confidence or >10s staleness is meaningfully degraded.
    let health = 10;
    if (confBps > 50) health -= 4;
    else if (confBps > 20) health -= 2;
    else if (confBps > 8) health -= 0.8;
    if (staleness > 30000) health -= 4;
    else if (staleness > 10000) health -= 2;
    else if (staleness > 4000) health -= 0.8;
    health = Math.max(0, Math.min(10, health));

    return {
      symbol,
      price,
      confidence_bps: Math.round(confBps * 10) / 10,
      staleness_ms: staleness,
      // slot-lag proxy: ~400ms/slot; map staleness to an ms lag figure the
      // rest of the model already understands.
      slot_lag_ms: Math.round(staleness),
      health_score: Math.round(health * 10) / 10,
      // Pyth publish time, not request time. This preserves provenance and lets
      // distributed monitors recognize repeated reads of the same update.
      as_of: new Date(publishTimeMs).toISOString(),
    };
  } catch {
    return null;
  }
}
