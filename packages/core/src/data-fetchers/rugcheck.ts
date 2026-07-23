import { safeFetchWithRetry } from '../../../../lib/safe-fetch';
import { getCached, setCached } from '../../../../lib/cache';
import { logger } from '../../../../lib/logger';

export interface RugCheckRisk {
  name: string;
  value?: string;
  description?: string;
  score: number;
  level: 'info' | 'warn' | 'danger';
}

export interface RugCheckReport {
  mint: string;
  score: number;
  isRugged: boolean;
  tokenName?: string;
  tokenSymbol?: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  risks: RugCheckRisk[];
  totalMarketLiquidityUsd?: number;
  liquidityLockedPct?: number;
  provenance: {
    source: string;
    fetchedAt: string;
  };
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export async function fetchTokenRugCheck(mintAddress: string): Promise<RugCheckReport | null> {
  if (!mintAddress || typeof mintAddress !== 'string') return null;

  const cacheKey = `rugcheck_${mintAddress}`;
  const cached = getCached<RugCheckReport>(cacheKey);
  if (cached) return cached;

  const url = `https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(mintAddress)}/report`;
  try {
    const res = await safeFetchWithRetry(url, { timeoutMs: 3500, retries: 1 });
    if (!res || !res.ok) {
      logger.warn('rugcheck_fetch_failed', { mint: mintAddress, status: res?.status });
      return null;
    }

    const data = await res.json();
    const risks: RugCheckRisk[] = Array.isArray(data?.risks)
      ? data.risks.map((r: any) => ({
          name: String(r?.name || 'Unknown Risk'),
          value: r?.value ? String(r.value) : undefined,
          description: r?.description ? String(r.description) : undefined,
          score: typeof r?.score === 'number' ? r.score : 10,
          level: r?.level === 'danger' ? 'danger' : r?.level === 'warn' ? 'warn' : 'info',
        }))
      : [];

    const report: RugCheckReport = {
      mint: mintAddress,
      score: typeof data?.score === 'number' ? data.score : 0,
      isRugged: Boolean(data?.rugged || false),
      tokenName: data?.fileMeta?.name || data?.tokenMeta?.name,
      tokenSymbol: data?.fileMeta?.symbol || data?.tokenMeta?.symbol,
      mintAuthority: data?.token?.mintAuthority || null,
      freezeAuthority: data?.token?.freezeAuthority || null,
      risks,
      totalMarketLiquidityUsd: typeof data?.totalMarketLiquidity === 'number' ? data.totalMarketLiquidity : undefined,
      liquidityLockedPct: typeof data?.totalLPPercentage === 'number' ? data.totalLPPercentage : undefined,
      provenance: {
        source: 'rugcheck_api',
        fetchedAt: new Date().toISOString(),
      },
    };

    setCached(cacheKey, report, FIFTEEN_MINUTES_MS);
    return report;
  } catch (err: any) {
    logger.error('rugcheck_fetch_error', { mint: mintAddress, error: err.message });
    return null;
  }
}
