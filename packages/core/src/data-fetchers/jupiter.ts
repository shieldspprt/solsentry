import { safeFetchWithRetry } from '../../../../lib/safe-fetch';
import { PROTOCOL_TOKEN_MINTS } from './helius';

// Live market-integrity telemetry from the Jupiter Token API v2.
//
// Jupiter classifies each trade as organic or non-organic (bot, arbitrage,
// market-maker and wash flow) and publishes a calibrated 0-100 organicScore per
// token. That is a real, independently-produced measurement of how much of a
// token's market is genuine — the signal this engine previously reported as a
// hardcoded "bot_density_pct".
//
// Scope matters and is stated wherever this is surfaced: it describes the
// protocol's GOVERNANCE TOKEN market, not the protocol's own transaction flow.
// It is a proxy for manipulation and dump risk around the token, not a direct
// measure of sandwich risk on a swap through the protocol.

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { data: JupiterTokenIntegrity; at: number }>();

export interface JupiterTokenIntegrity {
  mint: string;
  /** Jupiter's calibrated 0-100 organic-activity score. */
  organic_score: number | null;
  organic_score_label: string | null;
  /** Share of 24h volume Jupiter classified as organic (0-100). */
  organic_volume_pct_24h: number | null;
  /** Top-10 holder share of supply, per Jupiter's own audit block. */
  top_holders_pct: number | null;
  holder_count: number | null;
  liquidity_usd: number | null;
  /** null when Jupiter does not report the flag. */
  mint_authority_disabled: boolean | null;
  freeze_authority_disabled: boolean | null;
  is_verified: boolean | null;
  as_of: string;
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function fetchTokenMarketIntegrity(
  protocolSlug: string
): Promise<JupiterTokenIntegrity | null> {
  const mint = PROTOCOL_TOKEN_MINTS[protocolSlug];
  if (!mint) return null;

  const cached = cache.get(mint);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const apiKey = process.env.JUPITER_DEV_KEY || process.env.JUPITER_API_KEY;
  // The lite host serves the same shape without a key, at a lower rate limit.
  const host = apiKey ? 'https://api.jup.ag' : 'https://lite-api.jup.ag';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  try {
    const res = await safeFetchWithRetry(`${host}/tokens/v2/search?query=${mint}`, {
      headers,
      timeoutMs: 6000,
    });
    if (!res || !res.ok) return null;

    const json = await res.json();
    const token = Array.isArray(json) ? json.find((t: any) => t?.id === mint) : null;
    if (!token) return null;

    const s = token.stats24h || {};
    const totalVol = (num(s.buyVolume) || 0) + (num(s.sellVolume) || 0);
    const organicVol = (num(s.buyOrganicVolume) || 0) + (num(s.sellOrganicVolume) || 0);

    const data: JupiterTokenIntegrity = {
      mint,
      organic_score: num(token.organicScore) != null ? Math.round(num(token.organicScore)! * 10) / 10 : null,
      organic_score_label: typeof token.organicScoreLabel === 'string' ? token.organicScoreLabel : null,
      organic_volume_pct_24h: totalVol > 0 ? Math.round((organicVol / totalVol) * 1000) / 10 : null,
      top_holders_pct:
        num(token.audit?.topHoldersPercentage) != null
          ? Math.round(num(token.audit.topHoldersPercentage)! * 10) / 10
          : null,
      holder_count: num(token.holderCount),
      liquidity_usd: num(token.liquidity),
      // Jupiter omits these flags for some tokens; absent is not the same as
      // disabled, so it stays null rather than defaulting to "safe".
      mint_authority_disabled:
        typeof token.audit?.mintAuthorityDisabled === 'boolean' ? token.audit.mintAuthorityDisabled : null,
      freeze_authority_disabled:
        typeof token.audit?.freezeAuthorityDisabled === 'boolean' ? token.audit.freezeAuthorityDisabled : null,
      is_verified: typeof token.isVerified === 'boolean' ? token.isVerified : null,
      as_of: new Date().toISOString(),
    };

    cache.set(mint, { data, at: Date.now() });
    return data;
  } catch {
    return null;
  }
}
