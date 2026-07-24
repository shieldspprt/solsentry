import { PolicyRules } from '../../../lib/types';
import { evaluatePolicyRules } from './policy-engine';
import { DEFAULT_POLICY_RULES } from './constants';

export interface HistoricalScenario {
  id: string;
  name: string;
  date: string;
  description: string;
  protocolSlug: string;
  simulatedRiskScore: number;
  isOracleHealthy: boolean;
  isAudited: boolean;
  actualMarketLossPct: number;
}

export const HISTORICAL_SCENARIOS: HistoricalScenario[] = [
  {
    id: 'ftx_crash_2022',
    name: 'FTX Contagion & Solend Liquidation Cascade (Nov 2022)',
    date: '2022-11-08',
    description: 'Rapid SOL price collapse triggered massive liquidations across Solana lending protocols with bad debt accumulation.',
    protocolSlug: 'kamino',
    simulatedRiskScore: 3.2,
    isOracleHealthy: false,
    isAudited: true,
    actualMarketLossPct: 62.5,
  },
  {
    id: 'usdc_depeg_2023',
    name: 'SVB Collapse & USDC De-peg Crisis (March 2023)',
    date: '2023-03-11',
    description: 'USDC unpegged to $0.87 following Silicon Valley Bank closure, triggering oracle discrepancies in DEX pools.',
    protocolSlug: 'orca',
    simulatedRiskScore: 4.1,
    isOracleHealthy: false,
    isAudited: true,
    actualMarketLossPct: 13.0,
  },
  {
    id: 'wormhole_exploit_2022',
    name: 'Wormhole Cross-Chain Bridge Hack (Feb 2022)',
    date: '2022-02-02',
    description: 'Smart contract vulnerability allowed attacker to mint 120,000 unbacked wETH on Solana.',
    protocolSlug: 'jupiter',
    simulatedRiskScore: 2.8,
    isOracleHealthy: true,
    isAudited: false,
    actualMarketLossPct: 100.0,
  },
  {
    id: 'mango_exploit_2022',
    name: 'Mango Markets Oracle Price Manipulation (Oct 2022)',
    date: '2022-10-11',
    description: 'Attacker inflated MNGO spot price to borrow $114M in protocol assets against illiquid collateral.',
    protocolSlug: 'drift',
    simulatedRiskScore: 3.8,
    isOracleHealthy: false,
    isAudited: true,
    actualMarketLossPct: 100.0,
  },
];

export interface BacktestResult {
  scenarioId: string;
  scenarioName: string;
  decision: string;
  blocked: boolean;
  preventedLossUsd: number;
  reasons: string[];
}

export function runHistoricalBacktest(
  tradeAmountUsd: number = 10000,
  customRules: PolicyRules = DEFAULT_POLICY_RULES
): {
  totalScenarios: number;
  blockedCount: number;
  protectionSuccessRatePct: number;
  totalLossPreventedUsd: number;
  results: BacktestResult[];
} {
  let totalLossPreventedUsd = 0;
  let blockedCount = 0;

  const results: BacktestResult[] = HISTORICAL_SCENARIOS.map((sc) => {
    const evalRes = evaluatePolicyRules(customRules, {
      action: 'lend',
      protocolSlug: sc.protocolSlug,
      amountUsd: tradeAmountUsd,
      currentDailyVolumeUsd: 0,
      protocolRiskScore: sc.simulatedRiskScore,
      isProtocolAudited: sc.isAudited,
      isOracleHealthy: sc.isOracleHealthy,
    });

    const isBlocked = !evalRes.allowed;
    const estimatedLossWithoutGuardrail = tradeAmountUsd * (sc.actualMarketLossPct / 100);

    if (isBlocked) {
      blockedCount++;
      totalLossPreventedUsd += estimatedLossWithoutGuardrail;
    }

    return {
      scenarioId: sc.id,
      scenarioName: sc.name,
      decision: isBlocked ? 'BLOCKED' : 'ALLOWED',
      blocked: isBlocked,
      preventedLossUsd: isBlocked ? estimatedLossWithoutGuardrail : 0,
      reasons: evalRes.violations,
    };
  });

  return {
    totalScenarios: HISTORICAL_SCENARIOS.length,
    blockedCount,
    protectionSuccessRatePct: Math.round((blockedCount / HISTORICAL_SCENARIOS.length) * 100),
    totalLossPreventedUsd,
    results,
  };
}
