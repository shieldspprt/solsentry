import { handleCheckProtocolRisk } from './check-protocol-risk';
import { handleEvaluatePolicy } from './evaluate-policy';
import { PreflightSchema } from '../schemas';

// One-shot pre-trade safety verdict: protocol risk + policy evaluation combined
// into a single allow/deny an agent can act on without chaining calls.
export async function handlePreflight(args: unknown) {
  const parseResult = PreflightSchema.safeParse(args);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return { isError: true, error: `Preflight Check Failed — ${issue.message}` };
  }

  const { action, protocolSlug, amountUsd, currentDailyVolumeUsd, currentDrawdownPct, openPositionsCount } = parseResult.data;

  const [risk, policy] = await Promise.all([
    handleCheckProtocolRisk({ protocolSlug }),
    handleEvaluatePolicy({ action, protocolSlug, amountUsd, currentDailyVolumeUsd, currentDrawdownPct, openPositionsCount }),
  ]);

  if ((risk as { isError?: boolean }).isError) return risk;
  if ((policy as { isError?: boolean }).isError) return policy;

  const r = risk as Record<string, unknown>;
  const p = policy as Record<string, unknown>;

  const proceed = Boolean(p.allowed) && !p.failClosedTriggered && (r.actionRecommendation !== 'block');

  return {
    isError: false,
    verdict: proceed ? 'PROCEED' : 'DO_NOT_PROCEED',
    proceed,
    action,
    protocolSlug,
    amountUsd,
    // Why — collapsed to the fields an agent needs to decide/adjust.
    safetyScore: r.safetyScore,
    scoreDirection: 'higher_is_safer',
    riskTier: r.riskTier,
    actionRecommendation: r.actionRecommendation,
    confidence: r.confidence,
    policyAllowed: p.allowed,
    failClosedTriggered: p.failClosedTriggered,
    ruleViolations: p.ruleViolations,
    warnings: p.warnings,
    maxAllowedUsd: p.maxAllowedUsd,
    topDrivers: r.topDrivers,
    whatWouldFlip: r.whatWouldFlip,
    trend: r.trend,
    alternatives: p.alternatives,
    nextStep: proceed
      ? 'All checks pass. Proceed with the transaction.'
      : Number(p.maxAllowedUsd) > 0
      ? `Blocked at $${amountUsd}. Resize to <= $${p.maxAllowedUsd} or consider a listed alternative.`
      : 'Blocked. Do not execute — see ruleViolations and alternatives.',
    modelVersion: r.modelVersion,
    dataAsOf: r.dataAsOf,
  };
}
