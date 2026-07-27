import { HiddenTokenTransfer } from './inner-instruction-parser';

export interface DrainerScanResult {
  isDrainerPattern: boolean;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scorePenalty: number;
  warnings: string[];
  detectedPatterns: string[];
  /** Non-risk telemetry that helps callers explain what the simulator saw. */
  observations: string[];
}

export interface InstructionLogSummary {
  programId?: string;
  instructionType?: string;
  parsedName?: string;
  data?: string;
}

export interface BalanceDeltaSummary {
  account: string;
  preBalanceSol: number;
  postBalanceSol: number;
  netDeltaSol: number;
  pctChange: number;
  assetType?: 'native' | 'token';
  owner?: string;
  mint?: string;
}

export function detectDrainerPatterns(
  instructions: InstructionLogSummary[],
  balanceDeltas: BalanceDeltaSummary[] = [],
  hiddenTransfers: HiddenTokenTransfer[] = []
): DrainerScanResult {
  const warnings: string[] = [];
  const detectedPatterns: string[] = [];
  const observations: string[] = [];
  let scorePenalty = 0;
  let authorityChangeSeen = false;

  // Pattern 1: an approval/authority change is risky when it directly enables
  // a transfer or account close. A standalone authority mutation remains a
  // warning but is not automatically classified as a drainer.
  for (let i = 0; i < instructions.length; i++) {
    const currentName = (instructions[i].parsedName || instructions[i].instructionType || '').toLowerCase();

    if (currentName === 'approve' || currentName === 'setauthority') {
      authorityChangeSeen = true;
      const nextName = instructions[i + 1]
        ? (instructions[i + 1].parsedName || instructions[i + 1].instructionType || '').toLowerCase()
        : '';

      if (nextName === 'transfer' || nextName === 'transferchecked' || nextName === 'closeaccount') {
        detectedPatterns.push(`Suspicious sequence: ${currentName} followed immediately by ${nextName}`);
        warnings.push('High risk: Instruction sequence authorizes and immediately drains token accounts.');
        scorePenalty += 40;
      } else {
        warnings.push(`Warning: Transaction contains token delegation/authority change (${currentName}).`);
        scorePenalty += 15;
      }
    }

    if (currentName === 'closeaccount') {
      warnings.push('Notice: Transaction closes a token account and redirects rent SOL.');
      scorePenalty += 10;
    }
  }

  // CPI transfers are standard mechanics for swaps, lending, staking, and LP
  // operations. Report them as telemetry with zero penalty. They become a risk
  // signal only when corroborated by an authority mutation in the same
  // transaction; balance sweeps are scored independently below.
  if (hiddenTransfers.length > 0) {
    observations.push(
      `${hiddenTransfers.length} inner SPL token transfer${hiddenTransfers.length === 1 ? '' : 's'} observed via CPI; no standalone risk penalty applied.`
    );

    if (authorityChangeSeen) {
      detectedPatterns.push(
        `Authority mutation combined with ${hiddenTransfers.length} inner SPL token transfer${hiddenTransfers.length === 1 ? '' : 's'}`
      );
      warnings.push('High risk: An authority mutation is followed by token movement inside a CPI call.');
      scorePenalty += 25;
    }
  }

  // Pattern 2: a measured balance sweep is strong evidence, but spending a
  // full input asset during a swap is not. If the same wallet owner receives a
  // balance increase elsewhere in the simulation, record the sweep as a value-
  // exchange observation instead of a drainer penalty.
  const ownersWithInboundValue = new Set(
    balanceDeltas
      .filter((delta) => delta.netDeltaSol > 0 && delta.owner)
      .map((delta) => delta.owner as string)
  );
  for (const delta of balanceDeltas) {
    if (delta.preBalanceSol <= 0.05 || delta.pctChange > -90) continue;

    const isValueExchange =
      Boolean(delta.owner) &&
      ownersWithInboundValue.has(delta.owner as string) &&
      !authorityChangeSeen;
    if (isValueExchange) {
      observations.push(
        `Large input spend on ${delta.account.slice(0, 8)}... was paired with an inbound balance for the same owner; no standalone sweep penalty applied.`
      );
      continue;
    }

    detectedPatterns.push(
      `Mass balance reduction: Account ${delta.account.slice(0, 8)}... lost ${Math.abs(delta.pctChange).toFixed(1)}% of balance`
    );
    warnings.push(
      `CRITICAL: Transaction reduces account balance by over 90% (${Math.abs(delta.netDeltaSol).toFixed(3)} units).`
    );
    scorePenalty += 50;
  }

  let riskLevel: DrainerScanResult['riskLevel'] = 'SAFE';
  if (scorePenalty >= 50) riskLevel = 'CRITICAL';
  else if (scorePenalty >= 30) riskLevel = 'HIGH';
  else if (scorePenalty >= 15) riskLevel = 'MEDIUM';
  else if (scorePenalty > 0) riskLevel = 'LOW';

  return {
    isDrainerPattern: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
    riskLevel,
    scorePenalty: Math.min(100, scorePenalty),
    warnings,
    detectedPatterns,
    observations,
  };
}
