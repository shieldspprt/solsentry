import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { runStressScenario, runStandardStressSuite } from '../../../../packages/core/src/stress-engine';
import { readWalletPositions, isValidSolanaAddress } from '../../../../packages/core/src/wallet-reader';
import { PositionRecord } from '../../../../lib/types';
import { StressTestSchema } from '../schemas';

// Portfolio stress test: simulate an adverse price move and report which
// positions liquidate, capital at risk, cascade exposure, and the exact
// collateral needed to restore a safe health factor.
export async function handleStressTest(args: unknown) {
  const parseResult = StressTestSchema.safeParse(args);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return { isError: true, error: `Stress Test Failed — ${issue.message}` };
  }

  const { protocolSlug, agentId, walletAddress, priceShockPct } = parseResult.data;

  // Only real positions are ever stressed. Stress-testing invented positions
  // produces a confident, meaningless answer — worse than no answer at all.
  let positions: PositionRecord[] = [];
  let dataSource: 'onchain_wallet' | 'database' | 'none' = 'none';

  if (walletAddress) {
    if (!isValidSolanaAddress(walletAddress)) {
      return { isError: true, error: `Stress Test Failed — '${walletAddress}' is not a valid Solana wallet address` };
    }
    const live = await readWalletPositions(walletAddress);
    positions = protocolSlug ? live.positions.filter((p) => p.protocol_slug === protocolSlug) : live.positions;
    dataSource = 'onchain_wallet';
  } else {
    try {
      const supabase = getSupabaseAdmin();
      let query = supabase.from('positions').select('*').eq('status', 'open');
      if (agentId) query = query.eq('agent_id', agentId);
      if (protocolSlug) query = query.eq('protocol_slug', protocolSlug);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        positions = data as unknown as PositionRecord[];
        dataSource = 'database';
      }
    } catch {
      // leave positions empty — reported explicitly below
    }
  }

  if (positions.length === 0) {
    return {
      isError: false,
      mode: 'none',
      dataSource,
      positionsEvaluated: 0,
      scenarios: [],
      headline:
        'No positions available to stress. Pass walletAddress to stress real on-chain positions, or register positions for this agent.',
    };
  }

  if (typeof priceShockPct === 'number') {
    const result = runStressScenario(positions, { label: `Custom (${priceShockPct}%)`, price_shock_pct: priceShockPct });
    return { isError: false, mode: 'single', dataSource, positionsEvaluated: positions.length, scenario: result };
  }

  const suite = runStandardStressSuite(positions);
  const worst = suite[suite.length - 1];
  return {
    isError: false,
    mode: 'suite',
    dataSource,
    positionsEvaluated: positions.length,
    scenarios: suite,
    headline:
      worst.positions_liquidated > 0
        ? `Under ${worst.scenario.label}, ${worst.positions_liquidated} position(s) liquidate; $${worst.capital_at_risk_usd} at risk, up to $${worst.cascade_liquidation_usd} including cascade.`
        : `Portfolio survives all standard scenarios down to ${worst.scenario.price_shock_pct}%.`,
  };
}
