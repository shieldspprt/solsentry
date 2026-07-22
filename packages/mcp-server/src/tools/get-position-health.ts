import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { evaluatePositionHealth } from '../../../../packages/core/src/position-monitor';
import { readWalletPositions, isValidSolanaAddress } from '../../../../packages/core/src/wallet-reader';
import { sanitizeText } from '../../../../lib/validation';
import { PositionRecord } from '../../../../lib/types';
import { DEFAULT_SOLANA_POSITIONS } from '../../../../lib/default-positions';

export interface GetPositionHealthArgs {
  agentId?: string;
  protocolSlug?: string;
  walletAddress?: string;
}

export async function handleGetPositionHealth(args: GetPositionHealthArgs = {}) {
  const safeArgs = args || {};
  const agentId = safeArgs.agentId ? sanitizeText(safeArgs.agentId) : null;
  const protocolSlug = safeArgs.protocolSlug ? sanitizeText(safeArgs.protocolSlug).toLowerCase() : null;
  const walletAddress = safeArgs.walletAddress ? sanitizeText(safeArgs.walletAddress) : null;

  let positionsList: PositionRecord[] = DEFAULT_SOLANA_POSITIONS;
  let dataSource: 'onchain_wallet' | 'database' | 'default_sample' = 'default_sample';

  // Preferred path: read REAL on-chain positions for the wallet.
  if (walletAddress) {
    if (!isValidSolanaAddress(walletAddress)) {
      return { isError: true, error: `Position Health Failed — '${walletAddress}' is not a valid Solana wallet address` };
    }
    const live = await readWalletPositions(walletAddress);
    let livePositions = live.positions;
    if (protocolSlug) livePositions = livePositions.filter((p) => p.protocol_slug === protocolSlug);
    positionsList = livePositions;
    dataSource = 'onchain_wallet';

    const evaluated = positionsList.map((pos) => {
      const healthEval = evaluatePositionHealth(pos);
      return {
        positionId: pos.id,
        protocolSlug: pos.protocol_slug,
        positionType: pos.position_type,
        asset: pos.asset,
        amountUsd: pos.amount_usd,
        healthFactor: pos.health_factor,
        liquidationPrice: pos.liquidation_price,
        isLiquidationRisk: healthEval.isLiquidationRisk,
        agentAction: healthEval.agentAction,
        actionReason: healthEval.actionReason,
      };
    });
    const imminent = evaluated.filter((p) => p.isLiquidationRisk).length;
    return {
      success: true,
      dataSource,
      wallet: walletAddress,
      sourcesLive: live.sources_live,
      sourcesUnavailable: live.sources_failed,
      asOf: live.as_of,
      totalOpenPositions: evaluated.length,
      imminentLiquidationRiskCount: imminent,
      positions: evaluated,
      safetyRecommendation: imminent > 0 ? 'CRITICAL_ACTION_REQUIRED' : evaluated.length === 0 ? 'NO_OPEN_POSITIONS' : 'HEALTHY_BOUNDS',
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from('positions').select('*').eq('status', 'open');

    if (agentId) query = query.eq('agent_id', agentId);
    if (protocolSlug) query = query.eq('protocol_slug', protocolSlug);

    const { data: positions } = await query;
    if (positions && positions.length > 0) {
      positionsList = positions as unknown as PositionRecord[];
      dataSource = 'database';
    } else if (protocolSlug) {
      positionsList = DEFAULT_SOLANA_POSITIONS.filter((p) => p.protocol_slug === protocolSlug);
    }
  } catch {
    // Fallback
  }

  const evaluatedPositions = positionsList.map((pos) => {
    const healthEval = evaluatePositionHealth(pos);
    return {
      positionId: pos.id,
      protocolSlug: pos.protocol_slug,
      positionType: pos.position_type,
      asset: pos.asset,
      amountUsd: pos.amount_usd,
      healthFactor: pos.health_factor,
      liquidationPrice: pos.liquidation_price,
      isLiquidationRisk: healthEval.isLiquidationRisk,
      agentAction: healthEval.agentAction,
      actionReason: healthEval.actionReason,
    };
  });

  const imminentRiskCount = evaluatedPositions.filter((p) => p.isLiquidationRisk).length;

  return {
    success: true,
    dataSource,
    totalOpenPositions: evaluatedPositions.length,
    imminentLiquidationRiskCount: imminentRiskCount,
    positions: evaluatedPositions,
    safetyRecommendation: imminentRiskCount > 0 ? 'CRITICAL_ACTION_REQUIRED' : 'HEALTHY_BOUNDS',
  };
}
