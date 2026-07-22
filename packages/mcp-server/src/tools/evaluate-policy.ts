import { evaluatePolicyRules } from '../../../../packages/core/src/policy-engine';
import { computeProtocolRisk } from '../../../../packages/core/src/risk-scorer';
import { buildGroundedMetrics } from '../../../../packages/core/src/data-fetchers/grounded-metrics';
import { DEFAULT_POLICY_RULES } from '../../../../packages/core/src/constants';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { ActionType, ProtocolRecord } from '../../../../lib/types';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';
import { EvaluatePolicySchema } from '../schemas';

async function resolveProtocol(protocolSlug: string): Promise<ProtocolRecord | null> {
  let record: ProtocolRecord | null = DEFAULT_SOLANA_PROTOCOLS.find((p) => p.slug === protocolSlug) || null;
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('protocols').select('*').eq('slug', protocolSlug).maybeSingle();
    if (data) record = data as unknown as ProtocolRecord;
  } catch {
    // fallback to default
  }
  return record;
}

// Same-category protocols that score higher and would pass the size guardrail —
// so a blocked agent gets a redirect, not just a refusal.
function findAlternatives(target: ProtocolRecord, amountUsd: number) {
  return DEFAULT_SOLANA_PROTOCOLS.filter((p) => p.slug !== target.slug && p.category === target.category)
    .map((p) => ({ p, breakdown: computeProtocolRisk(p) }))
    .filter(({ breakdown }) => breakdown.composite_risk_score >= DEFAULT_POLICY_RULES.min_risk_score && amountUsd <= DEFAULT_POLICY_RULES.max_single_tx_usd)
    .sort((a, b) => b.breakdown.composite_risk_score - a.breakdown.composite_risk_score)
    .slice(0, 2)
    .map(({ p, breakdown }) => ({
      slug: p.slug,
      name: p.name,
      safetyScore: breakdown.composite_risk_score,
      recommendation: breakdown.action_recommendation,
    }));
}

export async function handleEvaluatePolicy(args: unknown) {
  const parseResult = EvaluatePolicySchema.safeParse(args);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return { isError: true, error: `Policy Evaluation Failed — ${issue.message}` };
  }

  const { action, protocolSlug, amountUsd, currentDailyVolumeUsd, currentDrawdownPct, openPositionsCount } = parseResult.data;

  const targetProtocol = await resolveProtocol(protocolSlug);

  let riskBreakdown = null;
  if (targetProtocol) {
    try {
      const grounded = await buildGroundedMetrics(targetProtocol);
      riskBreakdown = computeProtocolRisk({ ...targetProtocol, institutional_metrics: grounded.metrics }, { provenance: grounded.provenance });
    } catch {
      riskBreakdown = computeProtocolRisk(targetProtocol);
    }
  }

  const protocolRiskScore = riskBreakdown ? riskBreakdown.composite_risk_score : 9.0;

  const result = evaluatePolicyRules(DEFAULT_POLICY_RULES, {
    action: action as ActionType,
    protocolSlug,
    amountUsd,
    currentDailyVolumeUsd,
    currentDrawdownPct,
    openPositionsCount,
    protocolRiskScore,
    isProtocolAudited: targetProtocol?.audit_status === 'audited',
    isOracleHealthy: (riskBreakdown?.oracle_depeg_score ?? 10) >= 6,
  });

  const failClosedOverride = Boolean(riskBreakdown && riskBreakdown.composite_risk_score < 5.0);
  const allowed = result.allowed && !failClosedOverride;

  return {
    isError: false,
    allowed,
    decision: failClosedOverride ? 'block' : result.decision,
    ruleViolations: result.violations,
    warnings: result.warnings,
    failClosedTriggered: failClosedOverride,
    // The single most useful field for an agent: right-size instead of retrying.
    maxAllowedUsd: result.maxAllowedUsd,
    rationale: failClosedOverride
      ? 'Protocol safety score below critical threshold (5.0 / 10). Transaction blocked by AgentGate fail-closed engine.'
      : allowed
      ? 'Transaction complies with all active guardrails (size, daily volume, drawdown, risk floor).'
      : 'Transaction violates one or more active policy guardrails. See ruleViolations.',
    protocolSafetyScore: protocolRiskScore,
    scoreDirection: 'higher_is_safer',
    confidence: riskBreakdown?.confidence ?? null,
    agentRecommendation: riskBreakdown ? riskBreakdown.agent_decision : null,
    alternatives: !allowed && targetProtocol ? findAlternatives(targetProtocol, amountUsd) : [],
    modelVersion: riskBreakdown?.model_version,
    dataAsOf: riskBreakdown?.data_as_of,
  };
}
