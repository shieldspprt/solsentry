import { handleCheckProtocolRisk } from './tools/check-protocol-risk';
import { handleGetProtocolList } from './tools/get-protocol-list';
import { handleEvaluatePolicy } from './tools/evaluate-policy';
import { handleGetPositionHealth } from './tools/get-position-health';
import { handleGetBusinessRatios } from './tools/get-business-ratios';
import { handlePreflight } from './tools/preflight';
import { handleStressTest } from './tools/stress-test';
import { SUPPORTED_PROTOCOLS, SUPPORTED_ACTIONS } from '../../core/src/constants';

export const TOOL_PREFIX = 'solsentry_';

export const TOOL_DEFINITIONS = [
  {
    name: 'solsentry_check_protocol_risk',
    description:
      'Evaluates composite quantitative safety scores, provenance bands, and top risk drivers for Solana protocols. Read-only. Cost: 1 Helius RPC call + 1 Pyth fetch + 2 DeFiLlama fetches per un-cached request (~150ms). Cached for 5 minutes. Example: {"protocolSlug": "jupiter"}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        protocolSlug: {
          type: 'string',
          enum: [...SUPPORTED_PROTOCOLS],
          description: 'Target Solana protocol slug',
        },
      },
      required: ['protocolSlug'],
    },
  },
  {
    name: 'solsentry_get_protocol_list',
    description:
      'Retrieves all monitored Solana DeFi protocols and launchpads with live TVL, category market share, bot volume density, and risk ratings. Read-only. Example: {}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'solsentry_evaluate_policy',
    description:
      'Evaluates a planned transaction against active financial guardrail policies with fail-closed safety overrides, and returns maxAllowedUsd plus safer alternatives when blocked. Pass current portfolio state so daily-volume, drawdown, and position-count limits bind. Example: {"action": "swap", "protocolSlug": "jupiter", "amountUsd": 500}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [...SUPPORTED_ACTIONS],
          description: 'Transaction action',
        },
        protocolSlug: {
          type: 'string',
          enum: [...SUPPORTED_PROTOCOLS],
          description: 'Target protocol slug',
        },
        amountUsd: {
          type: 'number',
          minimum: 0.01,
          description: 'Transaction amount in USD',
        },
        currentDailyVolumeUsd: {
          type: 'number',
          minimum: 0,
          description: 'Optional: USD volume transacted today',
        },
        currentDrawdownPct: {
          type: 'number',
          minimum: 0,
          description: 'Optional: current portfolio drawdown percentage',
        },
        openPositionsCount: {
          type: 'number',
          minimum: 0,
          description: 'Optional: number of open positions',
        },
      },
      required: ['action', 'protocolSlug', 'amountUsd'],
    },
  },
  {
    name: 'solsentry_preflight',
    description:
      'One-shot pre-trade safety verdict: runs protocol risk analysis AND policy evaluation together. Returns PROCEED / DO_NOT_PROCEED decision with reasons, maxAllowedUsd, top risk drivers, and alternatives. Example: {"action": "borrow", "protocolSlug": "kamino", "amountUsd": 800}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [...SUPPORTED_ACTIONS],
          description: 'Transaction action',
        },
        protocolSlug: {
          type: 'string',
          enum: [...SUPPORTED_PROTOCOLS],
          description: 'Target protocol slug',
        },
        amountUsd: {
          type: 'number',
          minimum: 0.01,
          description: 'Transaction amount in USD',
        },
        currentDailyVolumeUsd: {
          type: 'number',
          minimum: 0,
        },
        currentDrawdownPct: {
          type: 'number',
          minimum: 0,
        },
        openPositionsCount: {
          type: 'number',
          minimum: 0,
        },
      },
      required: ['action', 'protocolSlug', 'amountUsd'],
    },
  },
  {
    name: 'solsentry_stress_test',
    description:
      'Simulates market shock scenarios (-10%, -20%, -35% price drops) across open positions or a targeted protocol to calculate capital at risk, liquidation cascades, and collateral restoration amounts. Example: {"protocolSlug": "kamino", "priceShockPct": -20}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        protocolSlug: {
          type: 'string',
          enum: [...SUPPORTED_PROTOCOLS],
        },
        agentId: { type: 'string' },
        walletAddress: { type: 'string' },
        priceShockPct: { type: 'number', minimum: -95, maximum: 0 },
      },
    },
  },
  {
    name: 'solsentry_get_position_health',
    description:
      'Evaluates position health factors, distance to liquidation price, and recommended de-leveraging actions. Reads real on-chain positions when walletAddress is passed. Example: {"walletAddress": "7xKX...".}',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string' },
        protocolSlug: {
          type: 'string',
          enum: [...SUPPORTED_PROTOCOLS],
        },
        walletAddress: { type: 'string' },
      },
    },
  },
  {
    name: 'solsentry_get_business_ratios',
    description:
      'Computes protocol financial sustainability metrics (fee-to-TVL ratio, revenue capture, TVL efficiency score) on a 0..10 scale. Example: {"protocolSlug": "kamino"}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        protocolSlug: {
          type: 'string',
          enum: [...SUPPORTED_PROTOCOLS],
        },
      },
      required: ['protocolSlug'],
    },
  },
];

export const TOOL_HANDLERS: Record<string, (args: any) => Promise<any>> = {
  'check_protocol_risk': handleCheckProtocolRisk,
  'get_protocol_list': handleGetProtocolList,
  'evaluate_policy': handleEvaluatePolicy,
  'preflight': handlePreflight,
  'stress_test': handleStressTest,
  'get_position_health': handleGetPositionHealth,
  'get_business_ratios': handleGetBusinessRatios,
  // Aliases
  'get_protocol_risk': handleCheckProtocolRisk,
  'check_policy_rules': handleEvaluatePolicy,
  'get_imminent_liquidations': handleGetPositionHealth,
};

export async function dispatchToolCall(rawName: string, toolArgs: any): Promise<any> {
  const normalized = rawName
    .replace(/^(solsentry_|agentgate_)/, '')
    .toLowerCase();

  const handler = TOOL_HANDLERS[normalized];
  if (!handler) {
    throw new Error(`Tool '${rawName}' not found in registry`);
  }
  return await handler(toolArgs);
}
