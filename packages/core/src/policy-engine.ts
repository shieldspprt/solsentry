import { ActionType, PolicyRules, RecommendationType } from '../../../lib/types';

export interface PolicyEvaluationParams {
  action: ActionType;
  protocolSlug: string;
  amountUsd?: number;
  currentDailyVolumeUsd?: number;
  currentDrawdownPct?: number;
  openPositionsCount?: number;
  protocolRiskScore?: number;
  isProtocolAudited?: boolean;
  isOracleHealthy?: boolean;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  decision: RecommendationType;
  violations: string[];
  warnings: string[];
  maxAllowedUsd: number;
}

// The largest amount that would pass every size/volume guardrail given the
// agent's current state. Returns 0 when a non-size rule (blocked protocol,
// blocked action, drawdown breach, risk floor, position cap) makes any amount
// impossible. Turns a rejection loop into one-shot right-sizing for agents.
export function computeMaxAllowedUsd(rules: PolicyRules, params: PolicyEvaluationParams): number {
  const {
    action,
    protocolSlug,
    currentDailyVolumeUsd = 0,
    currentDrawdownPct = 0,
    openPositionsCount = 0,
    protocolRiskScore = 10,
    isProtocolAudited = true,
    isOracleHealthy = true,
  } = params;

  const hardBlocked =
    rules.blocked_protocols.includes(protocolSlug) ||
    (rules.allowed_protocols.length > 0 && !rules.allowed_protocols.includes(protocolSlug)) ||
    rules.blocked_actions.includes(action) ||
    (rules.allowed_actions.length > 0 && !rules.allowed_actions.includes(action)) ||
    currentDrawdownPct > rules.max_drawdown_pct ||
    protocolRiskScore < rules.min_risk_score ||
    (rules.require_audited && !isProtocolAudited) ||
    (rules.require_oracle_healthy && !isOracleHealthy) ||
    openPositionsCount >= rules.max_open_positions;

  if (hardBlocked) return 0;

  const remainingDaily = Math.max(0, rules.max_daily_volume_usd - currentDailyVolumeUsd);
  return Math.max(0, Math.min(rules.max_single_tx_usd, rules.max_position_size_usd, remainingDaily));
}

export function evaluatePolicyRules(
  rules: PolicyRules,
  params: PolicyEvaluationParams
): PolicyEvaluationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  const {
    action,
    protocolSlug,
    amountUsd = 0,
    currentDailyVolumeUsd = 0,
    currentDrawdownPct = 0,
    openPositionsCount = 0,
    protocolRiskScore = 10,
    isProtocolAudited = true,
    isOracleHealthy = true,
  } = params;

  if (rules.blocked_protocols.includes(protocolSlug)) {
    violations.push(`Protocol '${protocolSlug}' is explicitly blocked by policy`);
  }

  if (rules.allowed_protocols.length > 0 && !rules.allowed_protocols.includes(protocolSlug)) {
    violations.push(`Protocol '${protocolSlug}' is not in the allowed protocols list`);
  }

  if (rules.blocked_actions.includes(action)) {
    violations.push(`Action '${action}' is explicitly blocked by policy`);
  }

  if (rules.allowed_actions.length > 0 && !rules.allowed_actions.includes(action)) {
    violations.push(`Action '${action}' is not in the allowed actions list`);
  }

  if (amountUsd > rules.max_single_tx_usd) {
    violations.push(`Transaction amount $${amountUsd} exceeds max single transaction limit of $${rules.max_single_tx_usd}`);
  }

  if (currentDailyVolumeUsd + amountUsd > rules.max_daily_volume_usd) {
    violations.push(`Cumulative volume $${currentDailyVolumeUsd + amountUsd} exceeds max daily volume limit of $${rules.max_daily_volume_usd}`);
  }

  if (currentDrawdownPct > rules.max_drawdown_pct) {
    violations.push(`Current drawdown ${currentDrawdownPct}% exceeds max allowed drawdown of ${rules.max_drawdown_pct}%`);
  }

  if (protocolRiskScore < rules.min_risk_score) {
    violations.push(`Protocol risk score ${protocolRiskScore} is lower than required minimum score of ${rules.min_risk_score}`);
  }

  if (rules.require_audited && !isProtocolAudited) {
    violations.push(`Policy requires audited protocols, but '${protocolSlug}' is not audited`);
  }

  if (rules.require_oracle_healthy && !isOracleHealthy) {
    violations.push(`Policy requires healthy oracle feeds, but '${protocolSlug}' oracle is degraded or offline`);
  }

  if (openPositionsCount >= rules.max_open_positions) {
    violations.push(`Open positions (${openPositionsCount}) at or above the max of ${rules.max_open_positions}`);
  }

  // Soft warnings: within policy but approaching a limit — actionable for agents.
  if (amountUsd > rules.max_single_tx_usd * 0.8 && amountUsd <= rules.max_single_tx_usd) {
    warnings.push(`Transaction is ${Math.round((amountUsd / rules.max_single_tx_usd) * 100)}% of the single-tx cap`);
  }
  if (currentDailyVolumeUsd + amountUsd > rules.max_daily_volume_usd * 0.8 && currentDailyVolumeUsd + amountUsd <= rules.max_daily_volume_usd) {
    warnings.push(`Daily volume would reach ${Math.round(((currentDailyVolumeUsd + amountUsd) / rules.max_daily_volume_usd) * 100)}% of the limit`);
  }
  if (protocolRiskScore < rules.min_risk_score + 1 && protocolRiskScore >= rules.min_risk_score) {
    warnings.push(`Protocol safety score ${protocolRiskScore} is close to the ${rules.min_risk_score} floor`);
  }

  const allowed = violations.length === 0;
  const decision: RecommendationType = allowed
    ? warnings.length > 0 ? 'proceed_with_caution' : 'proceed'
    : 'block';

  return {
    allowed,
    decision,
    violations,
    warnings,
    maxAllowedUsd: computeMaxAllowedUsd(rules, params),
  };
}
