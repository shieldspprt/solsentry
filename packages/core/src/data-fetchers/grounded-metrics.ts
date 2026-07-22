import { InstitutionalRiskMetrics, ProtocolRecord, FactorKey, FactorProvenance } from '../../../../lib/types';
import { getDefaultMetricsForProtocol } from '../risk-scorer';
import { fetchOracleHealth } from './pyth';
import { fetchTokenHolderConcentration } from './helius';
import { fetchProtocolFees, fetchProtocolTvl } from './defillama';

export interface GroundedMetricsResult {
  metrics: InstitutionalRiskMetrics;
  provenance: Partial<Record<FactorKey, FactorProvenance>>;
  tvl_usd: number | null;
  sources_live: string[];
  sources_defaulted: FactorKey[];
}

// Assemble a protocol's institutional metrics from live sources where possible,
// overlaying them on the static defaults and recording where each driving value
// actually came from. This is what turns "constants dressed as telemetry" into
// provenance-tagged, confidence-weighted inputs for the scorer.
export async function buildGroundedMetrics(
  protocol: Partial<ProtocolRecord>
): Promise<GroundedMetricsResult> {
  const slug = (protocol.slug || '').toLowerCase();
  const base: InstitutionalRiskMetrics = {
    ...getDefaultMetricsForProtocol(slug),
    ...(protocol.institutional_metrics || {}),
  };

  const provenance: Partial<Record<FactorKey, FactorProvenance>> = {};
  const sourcesLive: string[] = [];
  const sourcesDefaulted: FactorKey[] = [];

  const [oracle, holders, fees, tvl] = await Promise.all([
    fetchOracleHealth('SOL_USD'),
    fetchTokenHolderConcentration(slug),
    fetchProtocolFees(slug),
    fetchProtocolTvl(slug),
  ]);

  // --- Oracle health (Pyth) ---
  if (oracle) {
    base.oracle_slot_lag_ms = oracle.slot_lag_ms;
    provenance.oracle_depeg = { source: 'pyth', as_of: oracle.as_of, confidence: 0.95 };
    sourcesLive.push('pyth:oracle');
  } else {
    sourcesDefaulted.push('oracle_depeg');
  }

  // --- Whale concentration (Helius token holders) ---
  if (holders) {
    base.whale_concentration_pct = holders.top10_pct;
    provenance.whale_concentration = { source: 'helius', as_of: holders.as_of, confidence: 0.9 };
    sourcesLive.push('helius:holders');
  } else {
    sourcesDefaulted.push('whale_concentration');
  }

  // --- Business efficiency (DeFiLlama fees + TVL) ---
  const liveTvl = tvl?.tvl_usd ?? protocol.tvl_usd ?? null;
  if (fees && fees.annualized_fee_usd && liveTvl && liveTvl > 0) {
    base.business_ratios = {
      ...(base.business_ratios || ({} as InstitutionalRiskMetrics['business_ratios'])),
      annualized_fee_usd: fees.annualized_fee_usd,
      fee_to_tvl_ratio_pct: Math.round((fees.annualized_fee_usd / liveTvl) * 1000) / 10,
    } as InstitutionalRiskMetrics['business_ratios'];
    provenance.business_efficiency = { source: 'defillama', as_of: fees.as_of, confidence: 0.85 };
    sourcesLive.push('defillama:fees');
  } else {
    sourcesDefaulted.push('business_efficiency');
  }

  base.last_synced_at = new Date().toISOString();
  const grounded = sourcesLive.length;
  base.data_freshness_pct = Math.round((grounded / 3) * 1000) / 10;

  return {
    metrics: base,
    provenance,
    tvl_usd: liveTvl,
    sources_live: sourcesLive,
    sources_defaulted: sourcesDefaulted,
  };
}
