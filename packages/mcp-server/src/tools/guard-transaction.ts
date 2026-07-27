import { simulateSolanaTransaction } from '../../../core/src/simulation/tx-simulator';
import { handleCheckProtocolRisk } from './check-protocol-risk';
import { handleEvaluatePolicy } from './evaluate-policy';

export interface GuardTransactionArgs {
  transaction: string;
  encoding?: 'base58' | 'base64';
  // Optional context. When supplied, protocol risk and policy are folded into
  // the same verdict; when omitted, the guard is a pure drainer/simulation gate.
  protocolSlug?: string;
  action?: string;
  amountUsd?: number;
  currentDailyVolumeUsd?: number;
  currentDrawdownPct?: number;
  openPositionsCount?: number;
}

// The one call an agent makes before signing.
//
// Everything else here answers a question ABOUT a protocol. This answers the
// only question that matters at signing time: "is THIS transaction, to THIS
// protocol, safe for THIS wallet, right now?" — and it is the one thing that
// cannot be reproduced from public APIs, because it requires simulating the
// actual bytes.
//
// Three gates, in order of severity:
//   1. Drainer scan on the simulated transaction   → hard stop, always wins
//   2. Protocol exploit/risk gate (block verdict)   → hard stop
//   3. Policy guardrails (caps, drawdown, floors)   → sizing / allow
export async function handleGuardTransaction(args: GuardTransactionArgs) {
  if (!args || typeof args.transaction !== 'string' || !args.transaction.trim()) {
    return { isError: true, error: 'Guard Transaction Failed — a serialized `transaction` string is required' };
  }

  const encoding = args.encoding === 'base64' ? 'base64' : 'base58';

  // Simulation is the non-negotiable step; protocol/policy are best-effort
  // context that must never mask a drainer verdict.
  const sim = await simulateSolanaTransaction(args.transaction.trim(), encoding);

  const risk =
    args.protocolSlug != null ? await handleCheckProtocolRisk({ protocolSlug: args.protocolSlug }) : null;
  const policy =
    args.protocolSlug != null && args.action != null && args.amountUsd != null
      ? await handleEvaluatePolicy({
          action: args.action,
          protocolSlug: args.protocolSlug,
          amountUsd: args.amountUsd,
          currentDailyVolumeUsd: args.currentDailyVolumeUsd,
          currentDrawdownPct: args.currentDrawdownPct,
          openPositionsCount: args.openPositionsCount,
        })
      : null;

  const r = (risk && !(risk as any).isError ? (risk as Record<string, unknown>) : null) || null;
  const p = (policy && !(policy as any).isError ? (policy as Record<string, unknown>) : null) || null;

  // --- Assemble the blocking reasons, most severe first ---
  const blockingReasons: string[] = [];

  // 1. Drainer / simulation. A drainer pattern is an absolute stop.
  if (sim.drainerScan?.isDrainerPattern) {
    blockingReasons.push(
      `WALLET DRAINER PATTERN DETECTED (${sim.drainerScan.riskLevel}): ${sim.drainerScan.warnings.join('; ')}`
    );
  }
  if (sim.status === 'INVALID_TRANSACTION') {
    blockingReasons.push(`Transaction could not be decoded or deserialized: ${sim.errorMessage || 'invalid payload'}`);
  }
  if (sim.status === 'SIMULATION_ERROR') {
    // A transaction the RPC refuses to simulate would fail on-chain too.
    blockingReasons.push('Transaction failed pre-execution simulation and would revert if broadcast.');
  }

  // 2. Protocol risk gate.
  if (r && r.actionRecommendation === 'block') {
    blockingReasons.push(`Protocol ${args.protocolSlug} is BLOCKED by the risk engine: ${summarizeRisk(r)}`);
  }

  // 3. Policy guardrails.
  if (p && (!p.allowed || p.failClosedTriggered)) {
    const violations = Array.isArray(p.ruleViolations) ? (p.ruleViolations as string[]) : [];
    blockingReasons.push(`Policy guardrail: ${violations.join('; ') || 'transaction not permitted'}`);
  }

  const proceed = blockingReasons.length === 0;

  return {
    isError: false,
    verdict: proceed ? 'SIGN' : 'DO_NOT_SIGN',
    proceed,
    blockingReasons,

    // The transaction-level evidence — the differentiated part.
    simulation: {
      status: sim.status,
      succeeds: sim.success,
      computeUnits: sim.unitsConsumed,
      highCompute: sim.highComputeWarning,
      netTokenDeltas: sim.netTokenDeltas,
      hiddenTransfers: sim.hiddenTransfers,
      drainer: sim.drainerScan,
    },

    // Protocol + policy context, present only when the caller supplied it.
    protocol: r
      ? {
          slug: args.protocolSlug,
          safetyScore: r.safetyScore,
          riskTier: r.riskTier,
          actionRecommendation: r.actionRecommendation,
          topDrivers: r.topDrivers,
          confidence: r.confidence,
        }
      : null,
    policy: p
      ? {
          allowed: p.allowed,
          maxAllowedUsd: p.maxAllowedUsd,
          ruleViolations: p.ruleViolations,
          alternatives: p.alternatives,
        }
      : null,

    nextStep: proceed
      ? 'No drainer pattern, no block, no policy violation. Safe to sign.'
      : `DO NOT SIGN. ${blockingReasons[0]}`,
  };
}

function summarizeRisk(r: Record<string, unknown>): string {
  const drivers = Array.isArray(r.topDrivers) ? (r.topDrivers as Array<{ detail?: string }>) : [];
  return drivers[0]?.detail || `safety ${r.safetyScore}/10`;
}
