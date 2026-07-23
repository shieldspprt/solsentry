import { describe, it, expect } from 'vitest';
import { detectDrainerPatterns } from '../simulation/drainer-detector';

describe('Drainer Pattern Detector', () => {
  it('should flag suspicious approve followed by transfer sequence', () => {
    const instructions = [
      { parsedName: 'approve' },
      { parsedName: 'transfer' },
    ];
    const res = detectDrainerPatterns(instructions);
    expect(res.isDrainerPattern).toBe(true);
    expect(res.riskLevel).toBe('HIGH');
    expect(res.scorePenalty).toBeGreaterThanOrEqual(40);
    expect(res.detectedPatterns[0]).toContain('approve followed immediately by transfer');
  });

  it('should flag mass balance reduction exceeding 90%', () => {
    const instructions = [{ parsedName: 'transfer' }];
    const balanceDeltas = [
      { account: '7xKX...1111', preBalanceSol: 10, postBalanceSol: 0.1, netDeltaSol: -9.9, pctChange: -99 },
    ];
    const res = detectDrainerPatterns(instructions, balanceDeltas);
    expect(res.isDrainerPattern).toBe(true);
    expect(res.riskLevel).toBe('CRITICAL');
    expect(res.warnings[0]).toContain('reduces account balance by over 90%');
  });

  it('should return SAFE for benign transactions', () => {
    const instructions = [{ parsedName: 'transfer' }];
    const balanceDeltas = [
      { account: '7xKX...1111', preBalanceSol: 10, postBalanceSol: 9.5, netDeltaSol: -0.5, pctChange: -5 },
    ];
    const res = detectDrainerPatterns(instructions, balanceDeltas);
    expect(res.isDrainerPattern).toBe(false);
    expect(res.riskLevel).toBe('SAFE');
  });
});
