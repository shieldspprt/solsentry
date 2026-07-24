import { NextRequest, NextResponse } from 'next/server';
import { readWalletPositions, isValidSolanaAddress } from '../../../../../packages/core/src/wallet-reader';
import { evaluatePositionHealth } from '../../../../../packages/core/src/position-monitor';
import { runStandardStressSuite } from '../../../../../packages/core/src/stress-engine';
import { sanitizeText } from '../../../../../lib/validation';
import { logger } from '../../../../../lib/logger';
import { DEFAULT_SOLANA_POSITIONS } from '../../../../../lib/default-positions';

async function handleReadPositions(walletAddress: string, userId: string | null) {
  if (!walletAddress) {
    return NextResponse.json(DEFAULT_SOLANA_POSITIONS, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' },
    });
  }
  if (!isValidSolanaAddress(walletAddress)) {
    return NextResponse.json({ error: 'invalid_input', message: 'Invalid Solana wallet address' }, { status: 400 });
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

  logger.info('positions_read', { wallet: walletAddress, userId, count: evaluated.length });

  return NextResponse.json(
    {
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
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-solsentry-user-id');
    const body = await request.json().catch(() => ({}));
    const walletAddress = sanitizeText(String(body?.walletAddress || ''));
    return await handleReadPositions(walletAddress, userId);
  } catch (err: any) {
    logger.error('position_read_failed', { error: err.message });
    return NextResponse.json({ error: 'internal_error', message: 'Failed to read wallet positions' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-solsentry-user-id');
    const url = new URL(request.url);
    const walletAddress = sanitizeText(url.searchParams.get('wallet') || url.searchParams.get('walletAddress') || '');
    return await handleReadPositions(walletAddress, userId);
  } catch (err: any) {
    logger.error('position_read_failed', { error: err.message });
    return NextResponse.json({ error: 'internal_error', message: 'Failed to read wallet positions' }, { status: 500 });
  }
}
