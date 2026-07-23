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
      as_of: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
