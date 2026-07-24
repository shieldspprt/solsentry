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
  FactorCoverage,
  RiskConfidence,
  ScoreDriver,
  WhatWouldFlip,
  MetricTrend,
} from '../../../lib/types';
import { FACTOR_WEIGHTS, RISK_MODEL_VERSION, SOURCE_CONFIDENCE, PROTOCOL_GOVERNANCE } from './constants';

// Clamp a score into the valid 0..10 band.
function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Tier boundaries on the 0..10 safety scale (higher = safer).
const TIER_BOUNDARIES = { critical: 5.0, high: 7.0, medium: 8.5 };

// Minimum share of nominal model weight that must be grounded before the engine
// will issue a directional recommendation.
//
// Renormalising over measured factors has a sharp failure mode: if only the
// audit factor resolves, it inherits 100% of the weight and an audited protocol
// scores a confident 10/10 on one data point. Below this floor the score is
// still reported — with its (wide) band — but the recommendation is withheld
// rather than asserted from too little evidence.
const MIN_COVERAGE_FOR_RECOMMENDATION_PCT = 50;

export interface RiskScoreOptions {
  // Per-factor provenance supplied by the grounding layer. A factor with no
  // provenance and no driving metric is reported as unmeasured.
  provenance?: Partial<Record<FactorKey, FactorProvenance>>;
  trend?: MetricTrend | null;
  now?: string; // deterministic timestamp injection for tests
}

// Baseline metrics carry no invented telemetry. Governance facts (timelock
// hours) come from published protocol documentation and are tagged as such;
// everything SolSentry cannot currently observe is explicitly null.
export function getBaselineMetricsForProtocol(slug: string): InstitutionalRiskMetrics {
  const governance = PROTOCOL_GOVERNANCE[slug.toLowerCase()];
  return {
    bot_density_pct: null,
    near_liquidation_ratio_pct: null,
    whale_concentration_pct: null,
    oracle_slot_lag_ms: null,
    upgradeability_timelock_hours: governance?.timelock_hours ?? null,
    web_community: {
      developer_commits_30d: null,
      active_devs_count: null,
      github_org: null,
      repos_sampled: null,
      as_of: null,
    },
    business_ratios: {
      category_market_share_pct: null,
      category_tvl_usd: null,
      protocol_tvl_usd: null,
      annualized_fee_usd: null,
      annualized_basis: null,
      fee_to_tvl_ratio_pct: null,
    },
    live_factor_coverage_pct: 0,
  };
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
  const baseline = getBaselineMetricsForProtocol(protocol.slug || '');
  const supplied = protocol.institutional_metrics;

  const metrics: InstitutionalRiskMetrics = {
    ...baseline,
    ...(supplied || {}),
    business_ratios: { ...baseline.business_ratios, ...(supplied?.business_ratios || {}) },
    web_community: { ...baseline.web_community, ...(supplied?.web_community || {}) },
  } as InstitutionalRiskMetrics;

  const nowIso = opts.now || metrics.last_synced_at || new Date().toISOString();
  const warnings: string[] = [];

  const factors: FactorScore[] = [];

  // Record a factor backed by real data.
  const addMeasured = (
    key: FactorKey,
    label: string,
    score: number,
    value: number | null,
    unit: string,
    rationale: string,
    fallbackSource: FactorProvenance['source']
  ) => {
    const p = opts.provenance?.[key];
    const source = p?.source ?? fallbackSource;
    factors.push({
      key,
      label,
      measured: true,
      score: round1(clampScore(score)),
      nominal_weight: FACTOR_WEIGHTS[key],
      weight: 0, // renormalised below
      contribution: 0,
      confidence: p?.confidence ?? SOURCE_CONFIDENCE[source] ?? 0.6,
      source,
      as_of: p?.as_of ?? nowIso,
      value,
      unit,
      rationale,
    });
  };

  // Record a factor with no data source. It scores nothing and its weight is
  // redistributed — the alternative (scoring it off a constant) is what made
  // earlier versions of this model report confident, invented numbers.
  const addUnmeasured = (key: FactorKey, label: string, unit: string, rationale: string) => {
    factors.push({
      key,
      label,
      measured: false,
      score: null,
      nominal_weight: FACTOR_WEIGHTS[key],
      weight: 0,
      contribution: 0,
      confidence: 0,
      source: 'unmeasured',
      as_of: null,
      value: null,
      unit,
      rationale,
    });
  };

  // --- Audit & Governance ---
  // Audit status and auditor list are registry facts. The timelock modifier only
  // applies when governance data is actually available for the protocol.
  if (protocol.audit_status && protocol.audit_status !== 'unknown') {
    let auditGovScore = protocol.audit_status === 'audited' ? 9.5 : 4.0;
    if (protocol.auditors && protocol.auditors.length > 1) auditGovScore = 10.0;
    let auditRationale =
      protocol.audit_status === 'audited'
        ? `Audited${protocol.auditors && protocol.auditors.length > 1 ? ` by ${protocol.auditors.length} firms` : ''}.`
        : 'Not fully audited — elevated governance risk.';

    const timelock = metrics.upgradeability_timelock_hours;
    if (timelock != null && timelock < 24) {
      auditGovScore -= 2.0;
      auditRationale += ` Timelock ${timelock}h (<24h) allows fast upgrades.`;
      warnings.push('Timelock under 24 hours (upgradeability risk)');
    } else if (timelock != null) {
      auditRationale += ` ${timelock}h upgrade timelock (per protocol docs).`;
    } else {
      auditRationale += ' Upgrade timelock not published.';
    }
    addMeasured('audit_governance', 'Audit & Governance', auditGovScore, timelock, 'hours', auditRationale, 'protocol_docs');
  } else {
    addUnmeasured('audit_governance', 'Audit & Governance', 'hours', 'No audit record on file for this protocol.');
  }

  // --- Liquidation / Rekt cascade ---
  const nlr = metrics.near_liquidation_ratio_pct;
  if (nlr != null) {
    let liquidationScore = 10.0;
    if (nlr > 10.0) {
      liquidationScore = 3.0;
      warnings.push(`High liquidation cascade vulnerability (${nlr}% near liquidation)`);
    } else if (nlr > 5.0) liquidationScore = 6.5;
    else if (nlr > 2.5) liquidationScore = 8.5;
    addMeasured(
      'liquidation_rekt',
      'Liquidation & Rekt Risk',
      liquidationScore,
      nlr,
      '%',
      `${nlr}% of open value sits near its liquidation threshold.`,
      'derived'
    );
  } else {
    addUnmeasured(
      'liquidation_rekt',
      'Liquidation & Rekt Risk',
      '%',
      'Protocol-wide near-liquidation ratio requires indexing every obligation account; no public feed is wired up yet. Use the wallet scan for real position-level liquidation risk.'
    );
  }

  // --- MEV / bot density ---
  const botPct = metrics.bot_density_pct;
  if (botPct != null) {
    if (botPct > 50.0) warnings.push(`High bot density (${botPct}% bot volume ratio, sandwich attack risk)`);
    addMeasured(
      'mev_bot_density',
      'MEV / Bot Density',
      10.0 - botPct / 10,
      botPct,
      '%',
      `${botPct}% of volume is bot-driven — sandwich/MEV exposure.`,
      'jito'
    );
  } else {
    addUnmeasured(
      'mev_bot_density',
      'MEV / Bot Density',
      '%',
      'Bot-share of volume requires per-transaction classification against a MEV dataset; not currently measured.'
    );
  }

  // --- Whale concentration (Helius top-10 holders) ---
  const whalePct = metrics.whale_concentration_pct;
  if (whalePct != null) {
    if (whalePct > 40.0) warnings.push(`High whale concentration (${whalePct}% of token supply held by top 10 accounts)`);
    addMeasured(
      'whale_concentration',
      'Whale Concentration',
      10.0 - whalePct / 10,
      whalePct,
      '%',
      `Top 10 accounts hold ${whalePct}% of token supply — exit/dump risk.`,
      'helius'
    );
  } else {
    addUnmeasured('whale_concentration', 'Whale Concentration', '%', 'No governance token mint mapped, or holder data unavailable.');
  }

  // --- Oracle latency & depeg (Pyth publish staleness + confidence width) ---
  const lag = metrics.oracle_slot_lag_ms;
  if (lag != null) {
    let oracleDepegScore = 10.0;
    if (lag > 30000) {
      oracleDepegScore -= 4.0;
      warnings.push(`Oracle publish stale by ${Math.round(lag / 1000)}s`);
    } else if (lag > 10000) oracleDepegScore -= 2.0;
    else if (lag > 4000) oracleDepegScore -= 0.8;
    addMeasured(
      'oracle_depeg',
      'Oracle Latency & Depeg',
      oracleDepegScore,
      lag,
      'ms',
      `Pyth publish staleness ${lag}ms.`,
      'pyth'
    );
  } else {
    addUnmeasured('oracle_depeg', 'Oracle Latency & Depeg', 'ms', 'Pyth Hermes did not return a price update.');
  }

  // --- Developer activity (GitHub) ---
  const web = metrics.web_community;
  const commits = web?.developer_commits_30d ?? null;
  const devs = web?.active_devs_count ?? null;
  if (commits != null && devs != null) {
    // An actively maintained protocol shows sustained commit flow across a
    // meaningful contributor set. Both saturate — more commits past the cap is
    // not more safety.
    const commitComp = Math.min(commits / 60, 1) * 6.0; // 0..6
    const devComp = Math.min(devs / 8, 1) * 4.0; // 0..4
    const devScore = clampScore(commitComp + devComp);
    if (commits === 0) warnings.push('No public commits in the last 30 days');
    addMeasured(
      'web_community',
      'Developer Activity',
      devScore,
      commits,
      'commits/30d',
      `${commits} commits by ${devs} contributor(s) across ${web?.repos_sampled ?? 0} repo(s) in github.com/${web?.github_org}.`,
      'github'
    );
  } else {
    addUnmeasured('web_community', 'Developer Activity', 'commits/30d', 'No public GitHub organisation mapped, or the API was unreachable.');
  }

  // --- Business efficiency (DeFiLlama TVL + fees) ---
  const biz = metrics.business_ratios;
  const share = biz?.category_market_share_pct ?? null;
  const feeRatio = biz?.fee_to_tvl_ratio_pct ?? null;
  if (share != null || feeRatio != null) {
    // 2.0 floor (an operating protocol) plus credit for category dominance and
    // fee capture. Missing components simply contribute nothing.
    const shareComp = share != null ? Math.min(share / 40, 1) * 4.0 : 0;
    const feeComp = feeRatio != null ? Math.min(feeRatio / 12, 1) * 4.0 : 0;
    const bizScore = clampScore(2.0 + shareComp + feeComp);
    const parts = [
      share != null ? `category share ${share}%` : null,
      feeRatio != null ? `fee/TVL ${feeRatio}%${biz?.annualized_basis ? ` (annualised from ${biz.annualized_basis})` : ''}` : null,
    ].filter(Boolean);
    addMeasured('business_efficiency', 'Business Efficiency', bizScore, share, '%', parts.join(', ') + '.', 'defillama');
  } else {
    addUnmeasured('business_efficiency', 'Business Efficiency', '%', 'DeFiLlama did not report TVL or fee data for this protocol.');
  }

  // --- Renormalise weights over measured factors only ---
  const measured = factors.filter((f) => f.measured);
  const measuredWeight = measured.reduce((s, f) => s + f.nominal_weight, 0);
  const totalNominalWeight = factors.reduce((s, f) => s + f.nominal_weight, 0);

  for (const f of factors) {
    f.weight = f.measured && measuredWeight > 0 ? f.nominal_weight / measuredWeight : 0;
    f.contribution = f.score != null ? round1(f.score * f.weight) : 0;
  }

  const coverage: FactorCoverage = {
    measured_factors: measured.length,
    total_factors: factors.length,
    weight_covered_pct: totalNominalWeight > 0 ? Math.round((measuredWeight / totalNominalWeight) * 1000) / 10 : 0,
    unmeasured: factors.filter((f) => !f.measured).map((f) => f.key),
  };

  // With nothing measured there is no score to give. Report the floor with a
  // zero-confidence band rather than a number that looks like an assessment.
  const compositeRaw = measured.reduce((sum, f) => sum + (f.score as number) * f.weight, 0);
  const compositeScore = measured.length > 0 ? round1(compositeRaw) : 0;

  // --- Confidence & uncertainty band ---
  // Coverage is part of confidence: a score built on two of seven factors is
  // not as trustworthy as the same score built on all seven.
  const dataConfidence = measured.length > 0 ? measured.reduce((sum, f) => sum + f.confidence * f.weight, 0) : 0;
  const coverageFactor = totalNominalWeight > 0 ? measuredWeight / totalNominalWeight : 0;
  const overallConfidence = Math.round(dataConfidence * coverageFactor * 100) / 100;

  const variance = measured.reduce((s, f) => s + f.weight * Math.pow((f.score as number) - compositeRaw, 2), 0);
  const dispersion = Math.sqrt(variance);
  const spread = measured.length > 0 ? round1((1 - overallConfidence) * 2.2 + dispersion * 0.12) : 10;

  const confidence: RiskConfidence = {
    overall: overallConfidence,
    score_band_low: Math.max(0, round1(compositeScore - spread)),
    score_band_high: Math.min(10, round1(compositeScore + spread)),
    stale_factors: coverage.unmeasured,
    note:
      measured.length === 0
        ? 'No factor could be grounded in live data. This is not an assessment — do not use it as one.'
        : coverage.unmeasured.length > 0
        ? `${coverage.unmeasured.length} of ${factors.length} factors are unmeasured (${coverage.weight_covered_pct}% of model weight covered). Treat the band, not the point score, as the decision input.`
        : 'All factors grounded in observed data.',
  };

  const hasEnoughCoverage = coverage.weight_covered_pct >= MIN_COVERAGE_FOR_RECOMMENDATION_PCT;
  const scored = recommendationForScore(compositeScore);
  // Too little evidence to take a side: report the score, withhold the verdict.
  const risk_tier: RiskLevel = hasEnoughCoverage ? scored.tier : 'high';
  const action_recommendation: RecommendationType = hasEnoughCoverage ? scored.rec : 'proceed_with_caution';

  // --- Top drivers: distance from the neutral 7.0 baseline, weighted ---
  const top_drivers: ScoreDriver[] = measured
    .map((f) => ({
      key: f.key,
      label: f.label,
      impact: ((f.score as number) >= 7 ? 'positive' : 'negative') as 'positive' | 'negative',
      contribution_delta: round1(((f.score as number) - 7.0) * f.weight),
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
  const worstFactors = [...measured].sort((a, b) => (a.score as number) - (b.score as number));
  const flipConditions: string[] = [];
  if (worstFactors.length > 0) {
    if (upgradeTarget !== null) {
      const gap = round1(upgradeTarget - compositeScore);
      flipConditions.push(
        `Composite must rise +${gap} to ${upgradeTarget} to upgrade. Biggest lever: ${worstFactors[0].label} (currently ${worstFactors[0].score}/10 — ${worstFactors[0].rationale}).`
      );
    }
    if (downgradeTarget !== null) {
      const gap = round1(compositeScore - downgradeTarget);
      flipConditions.push(
        `A drop of -${gap} to below ${downgradeTarget} downgrades the call — watch ${worstFactors[0].label}${worstFactors[1] ? ` and ${worstFactors[1].label}` : ''}.`
      );
    }
  }
  if (coverage.unmeasured.length > 0) {
    flipConditions.push(
      `Grounding the ${coverage.unmeasured.length} unmeasured factor(s) (${coverage.unmeasured.join(', ')}) could move this score in either direction — ${round1(100 - coverage.weight_covered_pct)}% of model weight is currently unobserved.`
    );
  }
  const what_would_flip: WhatWouldFlip = {
    current_recommendation: action_recommendation,
    upgrade_to: upgradeTarget !== null ? recommendationForScore(upgradeTarget + 0.01).rec : null,
    downgrade_to: downgradeTarget !== null ? recommendationForScore(downgradeTarget - 0.01).rec : null,
    conditions: flipConditions,
  };

  // --- Agent decision, derived only from the score and its confidence ---
  // Note: this deliberately does NOT gate on a protocol-wide position count.
  // An earlier version divided TVL by a constant to synthesise one, which
  // silently overrode the model's own verdict for every large protocol.
  const nearestBoundary = [TIER_BOUNDARIES.critical, TIER_BOUNDARIES.high, TIER_BOUNDARIES.medium]
    .map((b) => Math.abs(compositeScore - b))
    .reduce((min, d) => Math.min(min, d), Infinity);
  const tierMargin = Math.min(nearestBoundary / 1.5, 1); // 0 near a boundary, 1 deep in a tier
  const rawConf = 0.55 * tierMargin + 0.45 * overallConfidence;
  const derivedConfidence = Math.max(0, Math.min(99, Math.round(rawConf * 99)));

  const leadDriver = top_drivers[0];
  const bandNote = `Safety ${compositeScore}/10 (band ${confidence.score_band_low}–${confidence.score_band_high}, ${coverage.weight_covered_pct}% of model weight measured)`;

  let agent_decision: AgentDecision;
  if (measured.length === 0) {
    agent_decision = {
      action: 'HOLD',
      confidence_score: 0,
      primary_reason: 'No factor could be grounded in live data — SolSentry has no basis for a recommendation on this protocol.',
      suggested_strategy: 'hold',
    };
  } else if (!hasEnoughCoverage) {
    // A high score built on one or two factors is not a safety signal.
    agent_decision = {
      action: 'HOLD',
      confidence_score: derivedConfidence,
      primary_reason: `Only ${coverage.weight_covered_pct}% of model weight is grounded (${measured.length}/${factors.length} factors), below the ${MIN_COVERAGE_FOR_RECOMMENDATION_PCT}% floor required for a directional call. Indicative score ${compositeScore}/10 (band ${confidence.score_band_low}–${confidence.score_band_high}). Unmeasured: ${coverage.unmeasured.join(', ')}.`,
      suggested_strategy: 'hold',
    };
  } else if (compositeScore >= TIER_BOUNDARIES.medium) {
    agent_decision = {
      action: 'TAKE_POSITION',
      confidence_score: derivedConfidence,
      primary_reason: `${bandNote}. Lead strength: ${leadDriver.label}. ${leadDriver.detail}`,
      suggested_strategy: 'enter_safely',
    };
  } else if (compositeScore >= TIER_BOUNDARIES.critical) {
    agent_decision = {
      action: 'CHANGE_POSITION',
      confidence_score: derivedConfidence,
      primary_reason: `${bandNote}. Main drag: ${leadDriver.label}. ${leadDriver.detail} De-leveraging advised.`,
      suggested_strategy: 'deleverage',
    };
  } else {
    agent_decision = {
      action: 'SELL_POSITION',
      confidence_score: derivedConfidence,
      primary_reason: `${bandNote}, below the critical floor of ${TIER_BOUNDARIES.critical}. Driver: ${leadDriver.label}. ${leadDriver.detail} Exit to preserve capital.`,
      suggested_strategy: 'exit_protocol',
    };
  }

  metrics.live_factor_coverage_pct = coverage.weight_covered_pct;

  const dataQuality = {
    live_sources_count: measured.length,
    total_sources_count: factors.length,
    is_reliable: coverage.weight_covered_pct >= 60,
    warning:
      coverage.weight_covered_pct < 60
        ? `Only ${coverage.weight_covered_pct}% of model weight is grounded in live data. Use caution for large positions.`
        : undefined,
  };

  const byKey = (k: FactorKey) => factors.find((f) => f.key === k)?.score ?? null;

  return {
    audit_governance_score: byKey('audit_governance'),
    liquidation_rekt_score: byKey('liquidation_rekt'),
    mev_bot_density_score: byKey('mev_bot_density'),
    whale_concentration_score: byKey('whale_concentration'),
    oracle_depeg_score: byKey('oracle_depeg'),
    web_community_score: byKey('web_community'),
    business_efficiency_score: byKey('business_efficiency'),
    composite_risk_score: compositeScore,
    factor_coverage: coverage,
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
