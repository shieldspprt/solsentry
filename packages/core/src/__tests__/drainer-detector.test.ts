import { describe, it, expect } from 'vitest';
import { detectDrainerPatterns } from '../simulation/drainer-detector';
import { HiddenTokenTransfer, TOKEN_PROGRAM_ID } from '../simulation/inner-instruction-parser';

function hiddenTransfer(amount = '1000'): HiddenTokenTransfer {
  return {
    programId: TOKEN_PROGRAM_ID,
    sourceAccount: 'source-token-account',
    destinationAccount: 'destination-token-account',
    authorityAccount: 'wallet',
    amount,
    instructionType: 'transfer',
  };
}

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

  it('does not penalize routine CPI transfers without corroborating risk signals', () => {
    const res = detectDrainerPatterns(
      [{ parsedName: 'swap' }],
      [{ account: 'wallet', preBalanceSol: 100, postBalanceSol: 80, netDeltaSol: -20, pctChange: -20 }],
      [hiddenTransfer('20000000'), hiddenTransfer('19500000'), hiddenTransfer('500000')]
    );

    expect(res.riskLevel).toBe('SAFE');
    expect(res.scorePenalty).toBe(0);
    expect(res.detectedPatterns).toEqual([]);
    expect(res.observations[0]).toContain('3 inner SPL token transfers');
  });

  it('does not classify a full swap input as a drain when the same owner receives output', () => {
    const res = detectDrainerPatterns(
      [{ parsedName: 'swap' }],
      [
        {
          account: 'usdc-source',
          owner: 'wallet-owner',
          mint: 'usdc',
          assetType: 'token',
          preBalanceSol: 100,
          postBalanceSol: 0,
          netDeltaSol: -100,
          pctChange: -100,
        },
        {
          account: 'sol-destination',
          owner: 'wallet-owner',
          mint: 'wrapped-sol',
          assetType: 'token',
          preBalanceSol: 0,
          postBalanceSol: 0.5,
          netDeltaSol: 0.5,
          pctChange: 100,
        },
      ],
      [hiddenTransfer()]
    );

    expect(res.riskLevel).toBe('SAFE');
    expect(res.scorePenalty).toBe(0);
    expect(res.observations.some((observation) => observation.includes('paired with an inbound balance'))).toBe(true);
  });

  it('still flags a full token sweep when the owner receives nothing', () => {
    const res = detectDrainerPatterns(
      [{ parsedName: 'transfer' }],
      [
        {
          account: 'victim-token-account',
          owner: 'victim-wallet',
          mint: 'usdc',
          assetType: 'token',
          preBalanceSol: 100,
          postBalanceSol: 0,
          netDeltaSol: -100,
          pctChange: -100,
        },
      ],
      [hiddenTransfer()]
    );

    expect(res.isDrainerPattern).toBe(true);
    expect(res.riskLevel).toBe('CRITICAL');
  });

  it('flags CPI movement when it is corroborated by an authority mutation', () => {
    const res = detectDrainerPatterns([{ parsedName: 'approve' }, { parsedName: 'swap' }], [], [hiddenTransfer()]);

    expect(res.isDrainerPattern).toBe(true);
    expect(res.riskLevel).toBe('HIGH');
    expect(res.scorePenalty).toBe(40);
    expect(res.detectedPatterns).toContain('Authority mutation combined with 1 inner SPL token transfer');
  });
});
