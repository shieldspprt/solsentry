import { computeProtocolRisk } from '../../../core/src/risk-scorer';
import { buildGroundedMetrics } from '../../../core/src/data-fetchers/grounded-metrics';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { ProtocolRecord } from '../../../../lib/types';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';
import { computeTrend, recordSnapshot } from '../../../../lib/snapshots';
import { getCached, setCached } from '../../../../lib/cache';
import { CheckProtocolRiskSchema } from '../schemas';

export async function handleCheckProtocolRisk(args: unknown) {
  const parseResult = CheckProtocolRiskSchema.safeParse(args);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return {
      isError: true,
      error: `Protocol Risk Check Failed — ${issue.message}`,
    };
  }

  const { protocolSlug } = parseResult.data;

  let protocolRecord: ProtocolRecord | null = DEFAULT_SOLANA_PROTOCOLS.find((p) => p.slug === protocolSlug) || null;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('protocols')
      .select('*')
      .eq('slug', protocolSlug)
      .maybeSingle();

    if (data) {
      protocolRecord = data as unknown as ProtocolRecord;
    }
  } catch {
    // Fallback
  }

  if (!protocolRecord) {
    return {
      isError: true,
      error: `Protocol Check Failed — Protocol '${protocolSlug}' not found in registry — Use agentgate_get_protocol_list to see active protocols — Valid examples: kamino, drift, jupiter, pumpfun`,
    };
  }

  // Ground the driving metrics in live sources (Pyth oracle, Helius holders,
  // DeFiLlama fees) with per-factor provenance, then score.
  let tvlUsd: number | null = protocolRecord.tvl_usd;
  let breakdown;
  const cacheKey = `grounded:${protocolSlug}`;

  try {
    let grounded = getCached<any>(cacheKey);
    if (!grounded) {
      grounded = await buildGroundedMetrics(protocolRecord);
      setCached(cacheKey, grounded, 5 * 60 * 1000); // 5 min TTL
    }
    tvlUsd = grounded.tvl_usd ?? protocolRecord.tvl_usd;
    breakdown = computeProtocolRisk(
      { ...protocolRecord, institutional_metrics: grounded.metrics },
      { provenance: grounded.provenance }
    );
  } catch {
    breakdown = computeProtocolRisk(protocolRecord);
  }

  // Trend from stored snapshots, then persist this observation (best-effort).
  const factorScores = Object.fromEntries((breakdown.factors || []).map((f) => [f.key, f.score]));
  const trend = await computeTrend(protocolSlug, breakdown.composite_risk_score, factorScores);
  breakdown.trend = trend;
  void recordSnapshot(protocolSlug, breakdown, tvlUsd);

  return {
    isError: false,
    protocol: protocolRecord.name,
    slug: protocolRecord.slug,
    category: protocolRecord.category,
    // Explicit direction to remove ambiguity for agents.
    safetyScore: breakdown.composite_risk_score,
    scoreDirection: 'higher_is_safer',
    compositeRiskScore: breakdown.composite_risk_score,
    riskTier: breakdown.risk_tier,
    actionRecommendation: breakdown.action_recommendation,
    confidence: breakdown.confidence,
    agentDecision: breakdown.agent_decision,
    factors: breakdown.factors,
    topDrivers: breakdown.top_drivers,
    whatWouldFlip: breakdown.what_would_flip,
    trend: {
      composite7dDelta: trend.composite_7d_delta,
      composite30dDelta: trend.composite_30d_delta,
      direction: trend.direction,
      snapshotsAvailable: trend.snapshots_available,
    },
    institutionalBreakdown: {
      auditGovernanceScore: breakdown.audit_governance_score,
      liquidationRektScore: breakdown.liquidation_rekt_score,
      mevBotDensityScore: breakdown.mev_bot_density_score,
      whaleConcentrationScore: breakdown.whale_concentration_score,
      oracleDepegScore: breakdown.oracle_depeg_score,
    },
    quantMetrics: breakdown.quant_metrics,
    criticalWarnings: breakdown.critical_warnings,
    tvlUsd,
    auditStatus: protocolRecord.audit_status,
    modelVersion: breakdown.model_version,
    dataAsOf: breakdown.data_as_of,
  };
}
