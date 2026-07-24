import { safeFetchWithRetry } from '../../../../lib/safe-fetch';

// Live economic telemetry from DeFiLlama public APIs (no key required).

export interface ProtocolFeesData {
  slug: string;
  total_24h: number | null;
  total_30d: number | null;
  annualized_fee_usd: number | null;
  /** Which window the annualised figure was extrapolated from. */
  annualized_basis: '30d' | '7d' | '24h' | null;
  as_of: string;
}

// DeFiLlama's fee "slug" differs from our internal slug for several protocols.
// Every entry here is verified to return a non-zero fee series — a slug that
// 404s or reports 0 silently degrades business_efficiency to a model default.
const FEE_SLUGS: Record<string, string> = {
  kamino: 'kamino-lend',
  drift: 'drift', // 'drift-trade' reports a flat 0
  jupiter: 'jupiter-aggregator',
  orca: 'orca',
  raydium: 'raydium',
  meteora: 'meteora',
  marinade: 'marinade', // 'marinade-finance' 404s
  jito: 'jito',
  pumpfun: 'pump.fun', // 'pumpfun' 404s
};

export async function fetchProtocolFees(protocolSlug: string): Promise<ProtocolFeesData | null> {
  const feeSlug = FEE_SLUGS[protocolSlug] || protocolSlug;
  try {
    const res = await safeFetchWithRetry(`https://api.llama.fi/summary/fees/${feeSlug}?dataType=dailyFees`, { timeoutMs: 5000 });
    if (!res || !res.ok) return null;
    const data = await res.json();

    const num = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const total24h = num(data?.total24h);
    const total7d = num(data?.total7d);
    const total30d = num(data?.total30d);

    // Annualise from the longest window available. The current UTC day is
    // partial, so total24h × 365 can be off by orders of magnitude — Drift
    // reported $2 today against a real ~$33M/yr run-rate.
    let annualized: number | null = null;
    let basis: ProtocolFeesData['annualized_basis'] = null;
    if (total30d && total30d > 0) {
      annualized = Math.round((total30d * 365) / 30);
      basis = '30d';
    } else if (total7d && total7d > 0) {
      annualized = Math.round((total7d * 365) / 7);
      basis = '7d';
    } else if (total24h && total24h > 0) {
      annualized = Math.round(total24h * 365);
      basis = '24h';
    }

    return {
      slug: protocolSlug,
      total_24h: total24h,
      total_30d: total30d,
      annualized_fee_usd: annualized,
      annualized_basis: basis,
      as_of: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export interface ProtocolTvlData {
  slug: string;
  tvl_usd: number | null;
  as_of: string;
}

// Protocols with no TVL concept on DeFiLlama. Pump.fun is a launchpad — its
// liquidity graduates to PumpSwap — so it has fees but no protocol TVL. We
// return null rather than substituting an unrelated protocol's number.
const NO_TVL_SLUGS = new Set(['pumpfun']);

const TVL_SLUGS: Record<string, string> = {
  kamino: 'kamino-lend',
  drift: 'drift',
  jupiter: 'jupiter',
  orca: 'orca',
  raydium: 'raydium',
  meteora: 'meteora',
  marinade: 'marinade',
  jito: 'jito',
};

export async function fetchProtocolTvl(protocolSlug: string): Promise<ProtocolTvlData | null> {
  if (NO_TVL_SLUGS.has(protocolSlug)) return null;
  const tvlSlug = TVL_SLUGS[protocolSlug] || protocolSlug;
  try {
    const res = await safeFetchWithRetry(`https://api.llama.fi/protocol/${tvlSlug}`, { timeoutMs: 5000 });
    if (!res || !res.ok) return null;
    const data = await res.json();
    const tvl = data?.tvl?.[data.tvl.length - 1]?.totalLiquidityUSD;
    return {
      slug: protocolSlug,
      tvl_usd: Number.isFinite(Number(tvl)) ? Math.round(Number(tvl)) : null,
      as_of: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
