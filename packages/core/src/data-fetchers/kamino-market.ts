import { safeFetchWithRetry } from '../../../../lib/safe-fetch';

// Protocol-wide liquidity & liquidation-cascade risk for Kamino lending markets.
//
// This grounds the liquidation_rekt factor, which was the model's last
// permanently-unmeasured input. Per-obligation health is a per-WALLET concern
// (already covered by the on-chain wallet reader); the protocol-level risk is
// UTILIZATION — the share of supplied liquidity that is currently borrowed.
//
// Near-full utilization is a genuine cascade signal: depositors cannot withdraw,
// liquidators cannot source liquidity to close underwater loans, and a single
// adverse price move can spiral. It is read straight from the market's reserve
// metrics (totalBorrowUsd / totalSupplyUsd), aggregated across every reserve.
//
// It applies only to lending markets. A DEX LP or a liquid-staking token has no
// borrow-driven liquidation cascade, so for those protocols the factor is
// reported as not-applicable rather than as a failed fetch.

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: MarketUtilization; at: number }>();

// Kamino lending markets. The main market dominates TVL; the isolated markets
// come and go, so it is required and the rest are best-effort (an isolated
// market returning 404 must not sink the whole reading).
const KAMINO_MAIN_MARKET = '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF';
const KAMINO_MARKETS = [
  KAMINO_MAIN_MARKET, // Main
  'DxXdAyu3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek', // JLP
  'ByYiZxp8QrdN9qbdtaAiePN8AAr3qvTPppNJDpf5DVJ5', // Altcoin
];

// Which of our protocol slugs are lending markets this fetcher can measure.
const LENDING_MARKETS: Record<string, string[]> = {
  kamino: KAMINO_MARKETS,
};

export interface MarketUtilization {
  slug: string;
  total_supply_usd: number;
  total_borrow_usd: number;
  /** Borrowed / supplied, 0..1. Higher = tighter liquidity, harder to exit. */
  utilization: number;
  reserves_counted: number;
  as_of: string;
}

interface ReserveMetric {
  totalSupplyUsd?: string | number;
  totalBorrowUsd?: string | number;
}

export function isLendingProtocol(slug: string): boolean {
  return slug in LENDING_MARKETS;
}

export async function fetchMarketUtilization(slug: string): Promise<MarketUtilization | null> {
  const markets = LENDING_MARKETS[slug];
  if (!markets) return null; // not a lending market — caller treats as N/A

  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  try {
    const perMarket = await Promise.all(
      markets.map(async (market) => {
        const res = await safeFetchWithRetry(
          `https://api.kamino.finance/kamino-market/${market}/reserves/metrics`,
          { timeoutMs: 6000 }
        );
        if (!res || !res.ok) return { market, ok: false, supply: 0, borrow: 0, counted: 0 };
        const reserves = (await res.json()) as ReserveMetric[];
        if (!Array.isArray(reserves)) return { market, ok: false, supply: 0, borrow: 0, counted: 0 };
        let supply = 0;
        let borrow = 0;
        let counted = 0;
        for (const r of reserves) {
          const s = Number(r.totalSupplyUsd);
          const b = Number(r.totalBorrowUsd);
          if (Number.isFinite(s) && s > 0) {
            supply += s;
            borrow += Number.isFinite(b) && b > 0 ? b : 0;
            counted++;
          }
        }
        return { market, ok: true, supply, borrow, counted };
      })
    );

    // The main market must be readable — it holds the great majority of TVL and
    // is what "Kamino utilization" primarily means. Isolated markets are folded
    // in when available and skipped when not, rather than sinking the reading.
    const mainOk = perMarket.find((m) => m.market === KAMINO_MAIN_MARKET)?.ok;
    if (!mainOk) return null;

    const totalSupply = perMarket.reduce((a, m) => a + m.supply, 0);
    const totalBorrow = perMarket.reduce((a, m) => a + m.borrow, 0);
    const reservesCounted = perMarket.reduce((a, m) => a + m.counted, 0);
    if (totalSupply <= 0) return null;

    const data: MarketUtilization = {
      slug,
      total_supply_usd: Math.round(totalSupply),
      total_borrow_usd: Math.round(totalBorrow),
      utilization: Math.round((totalBorrow / totalSupply) * 1000) / 1000,
      reserves_counted: reservesCounted,
      as_of: new Date().toISOString(),
    };
    cache.set(slug, { data, at: Date.now() });
    return data;
  } catch {
    return null;
  }
}

// Utilization → a 0..10 safety score (higher = safer). Below ~70% a lending
// market has comfortable exit liquidity; past 90% withdrawals and liquidations
// start to jam, which is the cascade risk this factor exists to flag.
export function scoreUtilization(util: number): { score: number; warning: string | null } {
  const pct = Math.round(util * 1000) / 10;
  if (util >= 0.95) return { score: 2, warning: `Market utilization ${pct}% — exit liquidity is nearly exhausted` };
  if (util >= 0.9) return { score: 4, warning: `Market utilization ${pct}% — thin exit liquidity, cascade risk elevated` };
  if (util >= 0.8) return { score: 6.5, warning: null };
  if (util >= 0.65) return { score: 8.5, warning: null };
  return { score: 10, warning: null };
}
