import { SolSentryClient } from '../../sdk/src/index';

export interface ElizaAction {
  name: string;
  similes: string[];
  description: string;
  handler: (runtime: any, message: any, state?: any) => Promise<any>;
}

export interface ElizaPlugin {
  name: string;
  description: string;
  actions: ElizaAction[];
  evaluators: any[];
}

export function createSolSentryPlugin(opts: { baseUrl?: string; apiKey?: string } = {}): ElizaPlugin {
  const client = new SolSentryClient(opts);

  const checkRiskAction: ElizaAction = {
    name: 'SOLSENTRY_CHECK_PROTOCOL_RISK',
    similes: ['CHECK_RISK', 'GET_PROTOCOL_RISK', 'ASSESS_PROTOCOL_SAFETY'],
    description: 'Queries quantitative safety score and 7-factor institutional breakdown for a Solana protocol.',
    handler: async (_runtime, message) => {
      const slug = message.content?.protocolSlug || 'kamino';
      return client.checkProtocolRisk(slug);
    },
  };

  const evaluatePolicyAction: ElizaAction = {
    name: 'SOLSENTRY_EVALUATE_POLICY',
    similes: ['CHECK_POLICY', 'VERIFY_TRADE_LIMITS', 'POLICY_GUARDRAIL'],
    description: 'Evaluates trade policy guardrails (single-tx limit, daily volume, drawdown caps, min safety score).',
    handler: async (_runtime, message) => {
      const content = message.content || {};
      return client.evaluatePolicy({
        action: content.action || 'swap',
        protocolSlug: content.protocolSlug || 'kamino',
        amountUsd: Number(content.amountUsd || 1000),
        currentDailyVolumeUsd: content.currentDailyVolumeUsd,
        currentDrawdownPct: content.currentDrawdownPct,
        openPositionsCount: content.openPositionsCount,
      });
    },
  };

  const preflightAction: ElizaAction = {
    name: 'SOLSENTRY_PREFLIGHT',
    similes: ['PREFLIGHT_CHECK', 'PRE_TRADE_AUDIT', 'CAN_EXECUTE_TRADE'],
    description: 'Combines protocol risk scoring and policy evaluation in one shot before trade execution.',
    handler: async (_runtime, message) => {
      const content = message.content || {};
      return client.preflight({
        action: content.action || 'swap',
        protocolSlug: content.protocolSlug || 'kamino',
        amountUsd: Number(content.amountUsd || 1000),
      });
    },
  };

  const simulateTxAction: ElizaAction = {
    name: 'SOLSENTRY_SIMULATE_TRANSACTION',
    similes: ['SIMULATE_TX', 'PREFLIGHT_TRANSACTION', 'SCAN_DRAINER'],
    description: 'Simulates a raw serialized Solana transaction, returning net token balance deltas and drainer warnings.',
    handler: async (_runtime, message) => {
      const content = message.content || {};
      return client.simulateTransaction({
        transaction: content.transaction || '',
        encoding: content.encoding || 'base58',
      });
    },
  };

  return {
    name: 'solsentry-risk',
    description: 'SolSentry quantitative risk scoring and trade policy guardrails for ElizaOS Solana AI agents.',
    actions: [checkRiskAction, evaluatePolicyAction, preflightAction, simulateTxAction],
    evaluators: [],
  };
}

export const solSentryPlugin = createSolSentryPlugin();
