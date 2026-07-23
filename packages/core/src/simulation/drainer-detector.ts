export interface DrainerScanResult {
  isDrainerPattern: boolean;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scorePenalty: number;
  warnings: string[];
  detectedPatterns: string[];
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
}

const DRAINER_INSTRUCTION_NAMES = new Set([
  'approve',
  'setauthority',
  'closeaccount',
  'transferchecked',
]);

export function detectDrainerPatterns(
  instructions: InstructionLogSummary[],
  balanceDeltas: BalanceDeltaSummary[] = []
): DrainerScanResult {
  const warnings: string[] = [];
  const detectedPatterns: string[] = [];
  let scorePenalty = 0;

  // Pattern 1: Sequence matching (Approve / SetAuthority followed by Transfer or CloseAccount)
  for (let i = 0; i < instructions.length; i++) {
    const currentName = (instructions[i].parsedName || instructions[i].instructionType || '').toLowerCase();

    if (currentName === 'approve' || currentName === 'setauthority') {
      const nextName = instructions[i + 1]
        ? (instructions[i + 1].parsedName || instructions[i + 1].instructionType || '').toLowerCase()
        : '';

      if (nextName === 'transfer' || nextName === 'transferchecked' || nextName === 'closeaccount') {
        detectedPatterns.push(`Suspicious sequence: ${currentName} followed immediately by ${nextName}`);
        warnings.push(`High risk: Instruction sequence authorizes and immediately drains token accounts.`);
        scorePenalty += 40;
      } else {
        warnings.push(`Warning: Transaction contains token delegation/authority change (${currentName}).`);
        scorePenalty += 15;
      }
    }

    if (currentName === 'closeaccount') {
      warnings.push(`Notice: Transaction closes a token account and redirects rent SOL.`);
      scorePenalty += 10;
    }
  }

  // Pattern 2: Balance Drain (> 90% SOL or Token balance reduction)
  for (const delta of balanceDeltas) {
    if (delta.preBalanceSol > 0.05 && delta.pctChange <= -90) {
      detectedPatterns.push(`Mass balance reduction: Account ${delta.account.slice(0, 8)}... lost ${Math.abs(delta.pctChange).toFixed(1)}% of balance`);
      warnings.push(`CRITICAL: Transaction reduces account balance by over 90% (${Math.abs(delta.netDeltaSol).toFixed(3)} SOL).`);
      scorePenalty += 50;
    }
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
  };
}
