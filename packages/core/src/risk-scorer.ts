import {
  ProtocolRecord,
  InstitutionalFactorsBreakdown,
  InstitutionalRiskMetrics,
  RiskLevel,
  RecommendationType,
  AgentDecision,
  FactorScore,
  FactorKey,
  FactorProvenance,
  DataSource,
  RiskConfidence,
  ScoreDriver,
  WhatWouldFlip,
  MetricTrend,
} from '../../../lib/types';
import { FACTOR_WEIGHTS, RISK_MODEL_VERSION, SOURCE_CONFIDENCE } from './constants';

// Clamp a score into the valid 0..10 band. Prevents the old bug where
// `10 - pct/10` could go negative for out-of-range inputs.
function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Tier boundaries on the 0..10 safety scale (higher = safer).
const TIER_BOUNDARIES = { critical: 5.0, high: 7.0, medium: 8.5 };

export interface RiskScoreOptions {
  // Per-factor provenance. When omitted, provenance is inferred: metrics that
  // arrived via institutional_metrics are treated as 'derived', otherwise
  // 'model_default' (low confidence).
  provenance?: Partial<Record<FactorKey, FactorProvenance>>;
  trend?: MetricTrend | null;
  now?: string; // deterministic timestamp injection for tests
}

export function getDefaultMetricsForProtocol(slug: string): InstitutionalRiskMetrics {
  const protocolMetrics: Record<string, InstitutionalRiskMetrics> = {
    pumpfun: {
      bot_density_pct: 78.4,
      mev_sandwich_risk_score: 7.8,
      whale_concentration_pct: 48.2,
      liquidation_cascade_risk_usd: 0,
      near_liquidation_ratio_pct: 0,
      oracle_slot_lag_ms: 120,
      lst_depeg_deviation_pct: 0,
      upgradeability_timelock_hours: 48,
      has_pause_circuit_breaker: true,
      unique_active_wallets_24h: 248000,
      liquidated_usd_24h: 0,
      web_community: {
        monthly_web_visits: 4800000,
        domain_trust_score: 94,
        social_sentiment_score: 91,
        developer_commits_30d: 210,
        active_devs_count: 28,
      },
      business_ratios: {
        category_market_share_pct: 88.5,
        total_category_lend_usd: 0,
        protocol_lend_usd: 0,
        total_category_borrow_usd: 0,
        protocol_borrow_usd: 0,
        capital_efficiency_ratio: 12.4,
        annualized_fee_usd: 124000000,
        fee_to_tvl_ratio_pct: 25.5,
        utilization_rate_pct: 0,
      },
      position_telemetry: {
        total_open_positions: 84200,
        positions_near_liquidation_count: 0,
        positions_near_liquidation_usd: 0,
        average_health_factor: 2.5,
        liquidated_positions_24h: 0,
      },
      data_freshness_pct: 99.9,
      last_synced_at: new Date().toISOString(),
    },
    kamino: {
      bot_density_pct: 22.4,
      mev_sandwich_risk_score: 2.1,
      whale_concentration_pct: 28.5,
      liquidation_cascade_risk_usd: 1450000,
      near_liquidation_ratio_pct: 3.2,
      oracle_slot_lag_ms: 180,
      lst_depeg_deviation_pct: 0.12,
      upgradeability_timelock_hours: 48,
      has_pause_circuit_breaker: true,
      unique_active_wallets_24h: 14280,
      liquidated_usd_24h: 42300,
      web_community: {
        monthly_web_visits: 420000,
        domain_trust_score: 95,
        social_sentiment_score: 88,
        developer_commits_30d: 142,
        active_devs_count: 18,
      },
      business_ratios: {
        category_market_share_pct: 42.5,
        total_category_lend_usd: 1850000000,
        protocol_lend_usd: 786250000,
        total_category_borrow_usd: 950000000,
        protocol_borrow_usd: 412000000,
        capital_efficiency_ratio: 0.85,
        annualized_fee_usd: 28400000,
        fee_to_tvl_ratio_pct: 3.6,
        utilization_rate_pct: 52.4,
      },
      position_telemetry: {
        total_open_positions: 14250,
        positions_near_liquidation_count: 18,
        positions_near_liquidation_usd: 320000,
        average_health_factor: 1.68,
        liquidated_positions_24h: 5,
      },
      data_freshness_pct: 99.2,
      last_synced_at: new Date().toISOString(),
    },
    drift: {
      bot_density_pct: 48.2,
      mev_sandwich_risk_score: 4.8,
      whale_concentration_pct: 34.1,
      liquidation_cascade_risk_usd: 3820000,
      near_liquidation_ratio_pct: 6.8,
      oracle_slot_lag_ms: 220,
      lst_depeg_deviation_pct: 0.18,
      upgradeability_timelock_hours: 24,
      has_pause_circuit_breaker: true,
      unique_active_wallets_24h: 9150,
      liquidated_usd_24h: 189400,
      web_community: {
        monthly_web_visits: 310000,
        domain_trust_score: 92,
        social_sentiment_score: 84,
        developer_commits_30d: 198,
        active_devs_count: 22,
      },
      business_ratios: {
        category_market_share_pct: 35.8,
        total_category_lend_usd: 620000000,
        protocol_lend_usd: 221960000,
        total_category_borrow_usd: 310000000,
        protocol_borrow_usd: 115000000,
        capital_efficiency_ratio: 3.42,
        annualized_fee_usd: 41200000,
        fee_to_tvl_ratio_pct: 18.5,
        utilization_rate_pct: 51.8,
      },
      position_telemetry: {
        total_open_positions: 8900,
        positions_near_liquidation_count: 42,
        positions_near_liquidation_usd: 1450000,
        average_health_factor: 1.45,
        liquidated_positions_24h: 14,
      },
      data_freshness_pct: 98.8,
      last_synced_at: new Date().toISOString(),
    },
    jupiter: {
      bot_density_pct: 38.6,
      mev_sandwich_risk_score: 3.5,
      whale_concentration_pct: 18.2,
      liquidation_cascade_risk_usd: 850000,
      near_liquidation_ratio_pct: 1.5,
      oracle_slot_lag_ms: 150,
      lst_depeg_deviation_pct: 0.08,
      upgradeability_timelock_hours: 72,
      has_pause_circuit_breaker: true,
      unique_active_wallets_24h: 185400,
      liquidated_usd_24h: 12000,
      web_community: {
        monthly_web_visits: 2100000,
        domain_trust_score: 98,
        social_sentiment_score: 94,
        developer_commits_30d: 310,
        active_devs_count: 35,
      },
      business_ratios: {
        category_market_share_pct: 68.2,
        total_category_lend_usd: 0,
        protocol_lend_usd: 0,
        total_category_borrow_usd: 0,
        protocol_borrow_usd: 0,
        capital_efficiency_ratio: 8.9,
        annualized_fee_usd: 85000000,
        fee_to_tvl_ratio_pct: 14.2,
        utilization_rate_pct: 0,
      },
      position_telemetry: {
        total_open_positions: 45000,
        positions_near_liquidation_count: 2,
        positions_near_liquidation_usd: 45000,
        average_health_factor: 2.1,
        liquidated_positions_24h: 0,
      },
      data_freshness_pct: 99.8,
      last_synced_at: new Date().toISOString(),
    },
    orca: {
      bot_density_pct: 31.0,
      mev_sandwich_risk_score: 3.2,
      whale_concentration_pct: 22.8,
      liquidation_cascade_risk_usd: 420000,
      near_liquidation_ratio_pct: 0.8,
      oracle_slot_lag_ms: 140,
      lst_depeg_deviation_pct: 0.05,
      upgradeability_timelock_hours: 48,
      has_pause_circuit_breaker: true,
      unique_active_wallets_24h: 28400,
      liquidated_usd_24h: 0,
      web_community: {
        monthly_web_visits: 380000,
        domain_trust_score: 96,
        social_sentiment_score: 90,
        developer_commits_30d: 88,
        active_devs_count: 14,
      },
      business_ratios: {
        category_market_share_pct: 22.4,
        total_category_lend_usd: 0,
        protocol_lend_usd: 0,
        total_category_borrow_usd: 0,
        protocol_borrow_usd: 0,
        capital_efficiency_ratio: 4.15,
        annualized_fee_usd: 19500000,
        fee_to_tvl_ratio_pct: 9.8,
        utilization_rate_pct: 0,
      },
      position_telemetry: {
        total_open_positions: 11200,
        positions_near_liquidation_count: 0,
        positions_near_liquidation_usd: 0,
        average_health_factor: 2.45,
        liquidated_positions_24h: 0,
      },
      data_freshness_pct: 99.1,
      last_synced_at: new Date().toISOString(),
    },
    raydium: {
      bot_density_pct: 54.3,
      mev_sandwich_risk_score: 6.2,
      whale_concentration_pct: 42.6,
      liquidation_cascade_risk_usd: 1200000,
      near_liquidation_ratio_pct: 2.1,
      oracle_slot_lag_ms: 290,
      lst_depeg_deviation_pct: 0.35,
      upgradeability_timelock_hours: 24,
      has_pause_circuit_breaker: false,
      unique_active_wallets_24h: 46200,
      liquidated_usd_24h: 0,
      web_community: {
        monthly_web_visits: 950000,
        domain_trust_score: 89,
        social_sentiment_score: 79,
        developer_commits_30d: 64,
        active_devs_count: 11,
      },
      business_ratios: {
        category_market_share_pct: 34.5,
        total_category_lend_usd: 0,
        protocol_lend_usd: 0,
        total_category_borrow_usd: 0,
        protocol_borrow_usd: 0,
        capital_efficiency_ratio: 5.2,
        annualized_fee_usd: 34000000,
        fee_to_tvl_ratio_pct: 11.4,
        utilization_rate_pct: 0,
      },
      position_telemetry: {
        total_open_positions: 28400,
        positions_near_liquidation_count: 0,
        positions_near_liquidation_usd: 0,
        average_health_factor: 2.2,
        liquidated_positions_24h: 0,
      },
      data_freshness_pct: 98.4,
      last_synced_at: new Date().toISOString(),
    },
  };

  return (
    protocolMetrics[slug.toLowerCase()] || {
      bot_density_pct: 35.0,
      mev_sandwich_risk_score: 4.0,
      whale_concentration_pct: 35.0,
      liquidation_cascade_risk_usd: 1000000,
      near_liquidation_ratio_pct: 4.0,
      oracle_slot_lag_ms: 250,
      lst_depeg_deviation_pct: 0.2,
      upgradeability_timelock_hours: 24,
      has_pause_circuit_breaker: true,
      unique_active_wallets_24h: 15000,
      liquidated_usd_24h: 25000,
      web_community: {
        monthly_web_visits: 250000,
        domain_trust_score: 90,
        social_sentiment_score: 82,
        developer_commits_30d: 90,
        active_devs_count: 12,
      },
      business_ratios: {
        category_market_share_pct: 25.0,
        total_category_lend_usd: 500000000,
        protocol_lend_usd: 125000000,
        total_category_borrow_usd: 250000000,
        protocol_borrow_usd: 62500000,
        capital_efficiency_ratio: 2.0,
        annualized_fee_usd: 12000000,
        fee_to_tvl_ratio_pct: 6.0,
        utilization_rate_pct: 50.0,
      },
      position_telemetry: {
        total_open_positions: 5000,
        positions_near_liquidation_count: 5,
        positions_near_liquidation_usd: 100000,
        average_health_factor: 1.8,
        liquidated_positions_24h: 2,
      },
      data_freshness_pct: 98.0,
      last_synced_at: new Date().toISOString(),
    }
  );
}

function recommendationForScore(score: number): { tier: RiskLevel; rec: RecommendationType } {
  if (score < TIER_BOUNDARIES.critical) return { tier: 'critical', rec: 'block' };
  if (score < TIER_BOUNDARIES.high) return { tier: 'high', rec: 'avoid' };
  if (score < TIER_BOUNDARIES.medium) return { tier: 'medium', rec: 'proceed_with_caution' };
  return { tier: 'low', rec: 'proceed' };
}

export function computeProtocolRisk(
  protocol: Partial<ProtocolRecord>,
  opts: RiskScoreOptions = {}
): InstitutionalFactorsBreakdown {
  const defaultMetrics = getDefaultMetricsForProtocol(protocol.slug || '');
  const liveTvl = protocol.tvl_usd || defaultMetrics.business_ratios?.protocol_lend_usd || 500000000;
  const calculatedPositions = Math.round(liveTvl / 42000);
  const calculatedNearLiqCount = Math.max(1, Math.round(liveTvl / 38000000));
  const calculatedNearLiqUsd = calculatedNearLiqCount * 175000;

  const metrics: InstitutionalRiskMetrics = {
    ...defaultMetrics,
    ...(protocol.institutional_metrics || {}),
    business_ratios: {
      ...defaultMetrics.business_ratios,
      ...(protocol.institutional_metrics?.business_ratios || {}),
    } as any,
    position_telemetry: {
      total_open_positions: calculatedPositions,
      positions_near_liquidation_count: calculatedNearLiqCount,
      positions_near_liquidation_usd: calculatedNearLiqUsd,
      average_health_factor: defaultMetrics.position_telemetry?.average_health_factor || 1.65,
      liquidated_positions_24h: Math.max(0, Math.round(calculatedNearLiqCount * 0.25)),
      ...(protocol.institutional_metrics?.position_telemetry || {}),
    } as any,
    web_community: {
      ...defaultMetrics.web_community,
      ...(protocol.institutional_metrics?.web_community || {}),
    } as any,
  };

  const nowIso = opts.now || metrics.last_synced_at || new Date().toISOString();
  const warnings: string[] = [];

  // Default provenance: metrics coming from a stored/derived source are trusted
  // more than the static model fallback. Callers grounding factors in live data
  // override this per-factor via opts.provenance.
  const inferredSource: DataSource = protocol.institutional_metrics ? 'derived' : 'model_default';
  const prov = (key: FactorKey): FactorProvenance => {
    const explicit = opts.provenance?.[key];
    if (explicit) return explicit;
    return { source: inferredSource, as_of: nowIso, confidence: SOURCE_CONFIDENCE[inferredSource] };
  };

  const factors: FactorScore[] = [];
  const addFactor = (
    key: FactorKey,
    label: string,
    score: number,
    value: number | null,
    unit: string,
    rationale: string
  ) => {
    const p = prov(key);
    const weight = FACTOR_WEIGHTS[key];
    const s = clampScore(score);
    factors.push({
      key,
      label,
      score: round1(s),
      weight,
      contribution: round1(s * weight),
      confidence: p.confidence,
      source: p.source,
      as_of: p.as_of,
      value,
      unit,
      rationale,
    });
    return s;
  };

  // --- Audit & Governance ---
  let auditGovScore = protocol.audit_status === 'audited' ? 9.5 : 4.0;
  if (protocol.auditors && protocol.auditors.length > 1) auditGovScore = 10.0;
  let auditRationale =
    protocol.audit_status === 'audited'
      ? `Audited${protocol.auditors && protocol.auditors.length > 1 ? ` by ${protocol.auditors.length} firms` : ''}.`
      : 'Not fully audited — elevated governance risk.';
  if (metrics.upgradeability_timelock_hours < 24) {
    auditGovScore -= 2.0;
    auditRationale += ` Timelock ${metrics.upgradeability_timelock_hours}h (<24h) allows fast upgrades.`;
    warnings.push('Timelock under 24 hours (upgradeability risk)');
  }
  addFactor('audit_governance', 'Audit & Governance', auditGovScore, metrics.upgradeability_timelock_hours, 'hours', auditRationale);

  // --- Liquidation / Rekt cascade ---
  let liquidationScore = 10.0;
  const nlr = metrics.near_liquidation_ratio_pct;
  if (nlr > 10.0) {
    liquidationScore = 3.0;
    warnings.push(`High liquidation cascade vulnerability (${nlr}% near liquidation)`);
  } else if (nlr > 5.0) {
    liquidationScore = 6.5;
  } else if (nlr > 2.5) {
    liquidationScore = 8.5;
  }
  addFactor('liquidation_rekt', 'Liquidation & Rekt Risk', liquidationScore, nlr, '%', `${nlr}% of open value sits near its liquidation threshold.`);

  // --- MEV / bot density ---
  const botPct = metrics.bot_density_pct;
  const mevBotScore = 10.0 - botPct / 10;
  if (botPct > 50.0) {
    warnings.push(`High bot density (${botPct}% bot volume ratio, sandwich attack risk)`);
  }
  addFactor('mev_bot_density', 'MEV / Bot Density', mevBotScore, botPct, '%', `${botPct}% of volume is bot-driven — sandwich/MEV exposure.`);

  // --- Whale concentration ---
  const whalePct = metrics.whale_concentration_pct;
  const whaleScore = 10.0 - whalePct / 10;
  if (whalePct > 40.0) {
    warnings.push(`High whale concentration (${whalePct}% TVL held by top 10 wallets)`);
  }
  addFactor('whale_concentration', 'Whale Concentration', whaleScore, whalePct, '%', `Top wallets control ${whalePct}% of value — exit/dump risk.`);

  // --- Oracle latency & depeg ---
  let oracleDepegScore = 10.0;
  const lag = metrics.oracle_slot_lag_ms;
  const depeg = metrics.lst_depeg_deviation_pct;
  if (lag > 500) {
    oracleDepegScore -= 3.0;
    warnings.push(`High oracle latency (${lag}ms slot lag)`);
  } else if (lag > 300) {
    oracleDepegScore -= 1.5;
  }
  if (depeg > 0.5) {
    oracleDepegScore -= 2.0;
    warnings.push(`LST/oracle price deviation ${depeg}% (depeg watch)`);
  } else if (depeg > 0.25) {
    oracleDepegScore -= 0.8;
  }
  addFactor('oracle_depeg', 'Oracle Latency & Depeg', oracleDepegScore, lag, 'ms', `Oracle lag ${lag}ms, price deviation ${depeg}%.`);

  // --- Web & community trust ---
  const webStats = metrics.web_community || { social_sentiment_score: 80, domain_trust_score: 90, developer_commits_30d: 50 };
  const webCommunityScore = clampScore(
    (webStats.social_sentiment_score * 0.4 + webStats.domain_trust_score * 0.4 + Math.min(webStats.developer_commits_30d / 3, 20)) / 10
  );
  addFactor('web_community', 'Web & Community Trust', webCommunityScore, webStats.domain_trust_score, 'score', `Sentiment ${webStats.social_sentiment_score}, domain trust ${webStats.domain_trust_score}, ${webStats.developer_commits_30d} commits/30d.`);

  // --- Business efficiency (now genuinely varies across the input surface) ---
  const biz = metrics.business_ratios || { category_market_share_pct: 20, utilization_rate_pct: 50, fee_to_tvl_ratio_pct: 6, capital_efficiency_ratio: 2 };
  // 2.0 floor (an operating protocol) plus rewards for dominance, fee capture,
  // and capital efficiency. A blue-chip lands ~7-9; a marginal protocol ~3-5.
  const shareComp = Math.min(biz.category_market_share_pct / 40, 1) * 3.5; // 0..3.5
  const feeComp = Math.min((biz.fee_to_tvl_ratio_pct || 0) / 12, 1) * 2.5; // 0..2.5
  const effComp = Math.min((biz.capital_efficiency_ratio || 0) / 4, 1) * 2.0; // 0..2
  const bizEfficiencyScore = clampScore(2.0 + shareComp + feeComp + effComp);
  addFactor('business_efficiency', 'Business Efficiency', bizEfficiencyScore, biz.category_market_share_pct, '%', `Market share ${biz.category_market_share_pct}%, fee/TVL ${biz.fee_to_tvl_ratio_pct || 0}%, capital efficiency ${biz.capital_efficiency_ratio || 0}x.`);

  // --- Composite (weighted; weights sum to 1.0) ---
  const compositeRaw = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const compositeScore = round1(compositeRaw);

  // --- Confidence & uncertainty band ---
  const overallConfidence =
    factors.reduce((sum, f) => sum + f.confidence * f.weight, 0) /
    factors.reduce((sum, f) => sum + f.weight, 0);
  const mean = compositeRaw;
  const variance = factors.reduce((s, f) => s + f.weight * Math.pow(f.score - mean, 2), 0);
  const dispersion = Math.sqrt(variance);
  // Band widens as data confidence drops and as factors disagree.
  const spread = round1((1 - overallConfidence) * 2.2 + dispersion * 0.12);
  const staleFactors = factors.filter((f) => f.confidence < 0.5).map((f) => f.key);
  const confidence: RiskConfidence = {
    overall: Math.round(overallConfidence * 100) / 100,
    score_band_low: Math.max(0, round1(compositeScore - spread)),
    score_band_high: Math.min(10, round1(compositeScore + spread)),
    stale_factors: staleFactors,
    note:
      staleFactors.length > 0
        ? `${staleFactors.length} factor(s) rely on model defaults, not live data. Treat the band, not the point score, as the decision input.`
        : 'All factors grounded in observed data.',
  };

  const { tier: risk_tier, rec: action_recommendation } = recommendationForScore(compositeScore);

  // --- Top drivers: distance from the neutral 7.0 baseline, weighted ---
  const top_drivers: ScoreDriver[] = factors
    .map((f) => ({
      key: f.key,
      label: f.label,
      impact: (f.score >= 7 ? 'positive' : 'negative') as 'positive' | 'negative',
      contribution_delta: round1((f.score - 7.0) * f.weight),
      detail: f.rationale,
    }))
    .sort((a, b) => Math.abs(b.contribution_delta) - Math.abs(a.contribution_delta))
    .slice(0, 3);

  // --- What would flip the recommendation ---
  const upgradeTarget =
    compositeScore < TIER_BOUNDARIES.critical
      ? TIER_BOUNDARIES.critical
      : compositeScore < TIER_BOUNDARIES.high
      ? TIER_BOUNDARIES.high
      : compositeScore < TIER_BOUNDARIES.medium
      ? TIER_BOUNDARIES.medium
      : null;
  const downgradeTarget =
    compositeScore >= TIER_BOUNDARIES.medium
      ? TIER_BOUNDARIES.medium
      : compositeScore >= TIER_BOUNDARIES.high
      ? TIER_BOUNDARIES.high
      : compositeScore >= TIER_BOUNDARIES.critical
      ? TIER_BOUNDARIES.critical
      : null;
  const worstFactors = [...factors].sort((a, b) => a.score - b.score).slice(0, 2);
  const flipConditions: string[] = [];
  if (upgradeTarget !== null) {
    const gap = round1(upgradeTarget - compositeScore);
    flipConditions.push(`Composite must rise +${gap} to ${upgradeTarget} to upgrade. Biggest lever: ${worstFactors[0].label} (currently ${worstFactors[0].score}/10 — ${worstFactors[0].rationale}).`);
  }
  if (downgradeTarget !== null) {
    const gap = round1(compositeScore - downgradeTarget);
    flipConditions.push(`A drop of -${gap} to below ${downgradeTarget} downgrades the call — watch ${worstFactors[0].label} and ${worstFactors[1]?.label || 'liquidation risk'}.`);
  }
  const what_would_flip: WhatWouldFlip = {
    current_recommendation: action_recommendation,
    upgrade_to: upgradeTarget !== null ? recommendationForScore(upgradeTarget + 0.01).rec : null,
    downgrade_to: downgradeTarget !== null ? recommendationForScore(downgradeTarget - 0.01).rec : null,
    conditions: flipConditions,
  };

  // --- Agent decision with DATA-DERIVED confidence ---
  const posTelemetry = metrics.position_telemetry || { positions_near_liquidation_count: 0 };
  const nearestBoundary = [TIER_BOUNDARIES.critical, TIER_BOUNDARIES.high, TIER_BOUNDARIES.medium]
    .map((b) => Math.abs(compositeScore - b))
    .reduce((min, d) => Math.min(min, d), Infinity);
  const tierMargin = Math.min(nearestBoundary / 1.5, 1); // 0 near a boundary, 1 deep in a tier
  const rawConf = 0.55 * tierMargin + 0.45 * overallConfidence;
  const derivedConfidence = Math.max(40, Math.min(99, Math.round(40 + rawConf * 59)));

  const leadDriver = top_drivers[0];
  let agent_decision: AgentDecision;
  if (compositeScore >= TIER_BOUNDARIES.medium && posTelemetry.positions_near_liquidation_count < 10) {
    agent_decision = {
      action: 'TAKE_POSITION',
      confidence_score: derivedConfidence,
      primary_reason: `Safety ${compositeScore}/10 (band ${confidence.score_band_low}–${confidence.score_band_high}). Lead strength: ${leadDriver.label}. ${leadDriver.detail}`,
      suggested_strategy: 'enter_safely',
    };
  } else if (compositeScore >= TIER_BOUNDARIES.critical) {
    agent_decision = {
      action: 'CHANGE_POSITION',
      confidence_score: derivedConfidence,
      primary_reason: `Safety ${compositeScore}/10 (band ${confidence.score_band_low}–${confidence.score_band_high}). Main drag: ${leadDriver.label}. ${leadDriver.detail} De-leveraging advised.`,
      suggested_strategy: 'deleverage',
    };
  } else {
    agent_decision = {
      action: 'SELL_POSITION',
      confidence_score: derivedConfidence,
      primary_reason: `Safety ${compositeScore}/10 below critical floor (${TIER_BOUNDARIES.critical}). Driver: ${leadDriver.label}. ${leadDriver.detail} Exit to preserve capital.`,
      suggested_strategy: 'exit_protocol',
    };
  }

  const liveSourcesCount = factors.filter((f) => f.source !== 'model_default').length;
  const totalSourcesCount = factors.length;
  const isReliable = liveSourcesCount >= 3;
  const dataQuality = {
    live_sources_count: liveSourcesCount,
    total_sources_count: totalSourcesCount,
    is_reliable: isReliable,
    warning: !isReliable
      ? 'Low live data coverage: score is partially derived from static model defaults. Use caution for large positions.'
      : undefined,
  };

  const byKey = (k: FactorKey) => factors.find((f) => f.key === k)!.score;

  return {
    audit_governance_score: byKey('audit_governance'),
    liquidation_rekt_score: byKey('liquidation_rekt'),
    mev_bot_density_score: byKey('mev_bot_density'),
    whale_concentration_score: byKey('whale_concentration'),
    oracle_depeg_score: byKey('oracle_depeg'),
    web_community_score: byKey('web_community'),
    business_efficiency_score: byKey('business_efficiency'),
    composite_risk_score: compositeScore,
    risk_tier,
    action_recommendation,
    agent_decision,
    critical_warnings: warnings,
    quant_metrics: metrics,
    // decision-grade additions
    safety_score: compositeScore,
    score_direction: 'higher_is_safer',
    factors,
    confidence,
    top_drivers,
    what_would_flip,
    trend: opts.trend ?? null,
    model_version: RISK_MODEL_VERSION,
    data_as_of: nowIso,
    data_quality: dataQuality,
  };
}
