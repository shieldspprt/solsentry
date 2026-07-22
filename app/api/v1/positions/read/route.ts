import { NextRequest, NextResponse } from 'next/server';
import { readWalletPositions, isValidSolanaAddress } from '../../../../../packages/core/src/wallet-reader';
import { evaluatePositionHealth } from '../../../../../packages/core/src/position-monitor';
import { runStandardStressSuite } from '../../../../../packages/core/src/stress-engine';
import { sanitizeText } from '../../../../../lib/validation';

// Reads REAL on-chain positions for a Solana wallet (live health factors),
// evaluates each, and runs the standard stress suite. No auth/DB write —
// pure live read an agent or the dashboard can call.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const walletAddress = sanitizeText(String(body?.walletAddress || ''));

    if (!walletAddress) {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 });
    }
    if (!isValidSolanaAddress(walletAddress)) {
      return NextResponse.json({ error: 'Invalid Solana wallet address' }, { status: 400 });
    }

    const live = await readWalletPositions(walletAddress);
    const evaluated = live.positions.map((pos) => {
      const health = evaluatePositionHealth(pos);
      return {
        positionId: pos.id,
        protocolSlug: pos.protocol_slug,
        positionType: pos.position_type,
        asset: pos.asset,
        amountUsd: pos.amount_usd,
        healthFactor: pos.health_factor,
        pnlUsd: pos.pnl_usd,
        isLiquidationRisk: health.isLiquidationRisk,
        agentAction: health.agentAction,
        actionReason: health.actionReason,
      };
    });

    const imminent = evaluated.filter((p) => p.isLiquidationRisk).length;
    const stress = runStandardStressSuite(live.positions);

    return NextResponse.json({
      wallet: walletAddress,
      dataSource: 'onchain_wallet',
      sourcesLive: live.sources_live,
      sourcesUnavailable: live.sources_failed,
      asOf: live.as_of,
      totalOpenPositions: evaluated.length,
      imminentLiquidationRiskCount: imminent,
      positions: evaluated,
      stressScenarios: stress,
      safetyRecommendation:
        imminent > 0 ? 'CRITICAL_ACTION_REQUIRED' : evaluated.length === 0 ? 'NO_OPEN_POSITIONS' : 'HEALTHY_BOUNDS',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to read wallet positions' }, { status: 500 });
  }
}
