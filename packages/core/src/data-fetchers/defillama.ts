// Live economic telemetry from DeFiLlama public APIs (no key required).

export interface ProtocolFeesData {
  slug: string;
  total_24h: number | null;
  total_30d: number | null;
  annualized_fee_usd: number | null;
  as_of: string;
}

// DeFiLlama fee "slug" differs from our internal slug for a few protocols.
const FEE_SLUGS: Record<string, string> = {
  kamino: 'kamino-lend',
  drift: 'drift-trade',
  jupiter: 'jupiter-aggregator',
  orca: 'orca',
  raydium: 'raydium',
  meteora: 'meteora',
  marinade: 'marinade-finance',
  jito: 'jito',
};

export async function fetchProtocolFees(protocolSlug: string): Promise<ProtocolFeesData | null> {
  const feeSlug = FEE_SLUGS[protocolSlug] || protocolSlug;
  try {
    const res = await fetch(`https://api.llama.fi/summary/fees/${feeSlug}?dataType=dailyFees`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const total24h = Number(data?.total24h ?? data?.totalDataChart?.slice(-1)?.[0]?.[1] ?? NaN);
    const total30d = Number(data?.total30d ?? NaN);
    const annualized = Number.isFinite(total24h) ? Math.round(total24h * 365) : null;

    return {
      slug: protocolSlug,
      total_24h: Number.isFinite(total24h) ? total24h : null,
      total_30d: Number.isFinite(total30d) ? total30d : null,
      annualized_fee_usd: annualized,
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
  const tvlSlug = TVL_SLUGS[protocolSlug] || protocolSlug;
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${tvlSlug}`, { next: { revalidate: 900 } });
    if (!res.ok) return null;
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
