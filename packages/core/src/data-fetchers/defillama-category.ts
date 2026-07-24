import { safeFetchWithRetry } from '../../../../lib/safe-fetch';
import { ProtocolCategory } from '../../../../lib/types';

// Real Solana category TVL, summed from DeFiLlama's protocol registry. This is
// what makes "category market share" an actual measurement: previously the
// share percentage was a per-protocol constant, and the category total was the
// protocol's own TVL multiplied by 2.5.

export interface CategoryTvlData {
  category: ProtocolCategory;
  llama_categories: string[];
  total_tvl_usd: number;
  protocols_counted: number;
  as_of: string;
}

// Our internal category → the DeFiLlama categories that compose it.
const CATEGORY_MAP: Record<ProtocolCategory, string[]> = {
  lending: ['Lending', 'CDP'],
  dex: ['Dexs'],
  perps: ['Derivatives', 'Basis Trading'],
  staking: ['Liquid Staking', 'Staking Pool'],
  yield: ['Yield', 'Yield Aggregator'],
  bridge: ['Bridge'],
  launchpad: ['Launchpad'],
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { data: CategoryTvlData; at: number }>();

// /protocols is an ~11MB document. Scoring the index asks for several
// categories concurrently, and without coalescing every one of them would miss
// the not-yet-populated cache and pull the payload again. One in-flight fetch
// is shared by all callers; it is also too large for Next's fetch cache, so
// this module-level cache is the only thing preventing repeat downloads.
let inFlight: Promise<unknown[] | null> | null = null;

async function fetchAllProtocols(): Promise<unknown[] | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await safeFetchWithRetry('https://api.llama.fi/protocols', {
        timeoutMs: 20000,
        cache: 'no-store',
      });
      if (!res || !res.ok) return null;
      const all = await res.json();
      return Array.isArray(all) ? all : null;
    } catch {
      return null;
    } finally {
      // Release on the next tick so concurrent callers all share this result.
      setTimeout(() => {
        inFlight = null;
      }, 0);
    }
  })();
  return inFlight;
}

export async function fetchCategoryTvl(category: ProtocolCategory): Promise<CategoryTvlData | null> {
  const llamaCategories = CATEGORY_MAP[category];
  if (!llamaCategories) return null;

  const cached = cache.get(category);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  try {
    const all = await fetchAllProtocols();
    if (!all) return null;

    const wanted = new Set(llamaCategories);
    let total = 0;
    let counted = 0;

    for (const entry of all) {
      const p = entry as { category?: string; chainTvls?: Record<string, number> };
      if (!p?.category || !wanted.has(p.category)) continue;
      // Solana-only slice of a protocol's TVL, so multi-chain protocols do not
      // inflate the Solana category total.
      const solanaTvl = Number(p?.chainTvls?.Solana);
      if (!Number.isFinite(solanaTvl) || solanaTvl <= 0) continue;
      total += solanaTvl;
      counted++;
    }

    if (counted === 0) return null;

    const data: CategoryTvlData = {
      category,
      llama_categories: llamaCategories,
      total_tvl_usd: Math.round(total),
      protocols_counted: counted,
      as_of: new Date().toISOString(),
    };
    cache.set(category, { data, at: Date.now() });
    return data;
  } catch {
    return null;
  }
}
