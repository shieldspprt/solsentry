import { InstitutionalRiskMetrics, ProtocolRecord, FactorKey, FactorProvenance } from '../../../../lib/types';
import { getBaselineMetricsForProtocol } from '../risk-scorer';
import { fetchOracleHealth } from './pyth';
import { fetchTokenHolderConcentration } from './helius';
import { fetchProtocolFees, fetchProtocolTvl } from './defillama';
import { fetchDeveloperActivity } from './github';
import { fetchCategoryTvl } from './defillama-category';
import { fetchTokenMarketIntegrity } from './jupiter';

export interface GroundedMetricsResult {
  metrics: InstitutionalRiskMetrics;
  provenance: Partial<Record<FactorKey, FactorProvenance>>;
  tvl_usd: number | null;
  sources_live: string[];
  sources_unavailable: string[];
}

// Assemble a protocol's institutional metrics from live sources. Anything a
// source does not return stays null, and the scorer drops the corresponding
// factor from the composite rather than substituting a constant.
export async function buildGroundedMetrics(
  protocol: Partial<ProtocolRecord>
): Promise<GroundedMetricsResult> {
  const slug = (protocol.slug || '').toLowerCase();
  const base = getBaselineMetricsForProtocol(slug);

  const provenance: Partial<Record<FactorKey, FactorProvenance>> = {};
  const sourcesLive: string[] = [];
  const sourcesUnavailable: string[] = [];

  const [oracle, holders, fees, tvl, devActivity, categoryTvl, integrity] = await Promise.all([
    fetchOracleHealth('SOL_USD'),
    fetchTokenHolderConcentration(slug),
    fetchProtocolFees(slug),
    fetchProtocolTvl(slug),
    fetchDeveloperActivity(slug),
    protocol.category ? fetchCategoryTvl(protocol.category) : Promise.resolve(null),
    fetchTokenMarketIntegrity(slug),
  ]);

  // --- Oracle health (Pyth) ---
  if (oracle) {
    base.oracle_slot_lag_ms = oracle.slot_lag_ms;
    provenance.oracle_depeg = { source: 'pyth', as_of: oracle.as_of, confidence: 0.95 };
    sourcesLive.push('pyth:oracle');
  } else {
    sourcesUnavailable.push('pyth:oracle');
  }

  // --- Whale concentration ---
  // Preferred: a direct on-chain read (getTokenLargestAccounts). Jupiter
  // publishes the same figure in its audit block and the two agree closely
  // (Kamino: 54.4% from both), so it serves as a fallback when the RPC is
  // unavailable rather than dropping the factor entirely.
  if (holders) {
    base.whale_concentration_pct = holders.top10_pct;
    provenance.whale_concentration = { source: 'helius', as_of: holders.as_of, confidence: 0.9 };
    sourcesLive.push('helius:holders');
  } else if (integrity?.top_holders_pct != null) {
    base.whale_concentration_pct = integrity.top_holders_pct;
    provenance.whale_concentration = { source: 'jupiter', as_of: integrity.as_of, confidence: 0.8 };
    sourcesLive.push('jupiter:holders');
  } else {
    sourcesUnavailable.push('helius:holders');
  }

  // --- Market integrity (Jupiter organic-activity score) ---
  if (integrity?.organic_score != null) {
    base.token_market_integrity = {
      organic_score: integrity.organic_score,
      organic_score_label: integrity.organic_score_label,
      organic_volume_pct_24h: integrity.organic_volume_pct_24h,
      holder_count: integrity.holder_count,
      liquidity_usd: integrity.liquidity_usd,
      mint_authority_disabled: integrity.mint_authority_disabled,
      freeze_authority_disabled: integrity.freeze_authority_disabled,
      as_of: integrity.as_of,
    };
    provenance.mev_bot_density = { source: 'jupiter', as_of: integrity.as_of, confidence: 0.85 };
    sourcesLive.push('jupiter:market-integrity');
  } else {
    sourcesUnavailable.push('jupiter:market-integrity');
  }

  // --- Developer activity (GitHub) ---
  if (devActivity) {
    base.web_community = devActivity;
    provenance.web_community = { source: 'github', as_of: devActivity.as_of || new Date().toISOString(), confidence: 0.85 };
    sourcesLive.push('github:commits');
  } else {
    sourcesUnavailable.push('github:commits');
  }

  // --- Business efficiency (DeFiLlama fees, TVL, category share) ---
  // Ratios are computed ONLY from the live DeFiLlama TVL, never from the
  // bundled registry value. Mixing a stale constant numerator with a live
  // denominator produced nonsense — Pump.fun, which DeFiLlama reports no TVL
  // for, showed a 20,053% "category market share".
  const llamaTvl = tvl?.tvl_usd ?? null;
  const liveTvl = llamaTvl ?? protocol.tvl_usd ?? null;
  const annualFee = fees?.annualized_fee_usd ?? null;

  const feeRatio =
    annualFee != null && llamaTvl && llamaTvl > 0 ? Math.round((annualFee / llamaTvl) * 1000) / 10 : null;

  // This protocol's Solana TVL over the summed Solana TVL of every DeFiLlama
  // protocol in the same category — both sides from the same source and scope.
  let share: number | null = null;
  if (llamaTvl && llamaTvl > 0 && categoryTvl && categoryTvl.total_tvl_usd > 0) {
    const pct = Math.round((llamaTvl / categoryTvl.total_tvl_usd) * 1000) / 10;
    // A protocol cannot hold more than the category it belongs to. If it does,
    // the two sides disagree (category mapping drift upstream) and the number
    // is not trustworthy — report nothing rather than an impossible figure.
    share = pct <= 100 ? pct : null;
  }

  base.business_ratios = {
    category_market_share_pct: share,
    category_tvl_usd: categoryTvl?.total_tvl_usd ?? null,
    protocol_tvl_usd: llamaTvl,
    annualized_fee_usd: annualFee,
    annualized_basis: fees?.annualized_basis ?? null,
    fee_to_tvl_ratio_pct: feeRatio,
  };

  if (share != null || feeRatio != null) {
    provenance.business_efficiency = {
      source: 'defillama',
      as_of: fees?.as_of || tvl?.as_of || new Date().toISOString(),
      confidence: 0.85,
    };
    sourcesLive.push('defillama:tvl+fees');
  } else {
    sourcesUnavailable.push('defillama:tvl+fees');
  }

  base.last_synced_at = new Date().toISOString();

  return {
    metrics: base,
    provenance,
    tvl_usd: liveTvl,
    sources_live: sourcesLive,
    sources_unavailable: sourcesUnavailable,
  };
}
