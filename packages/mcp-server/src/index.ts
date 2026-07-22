import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { handleCheckProtocolRisk } from './tools/check-protocol-risk';
import { handleGetProtocolList } from './tools/get-protocol-list';
import { handleEvaluatePolicy } from './tools/evaluate-policy';
import { handleGetPositionHealth } from './tools/get-position-health';
import { handleGetBusinessRatios } from './tools/get-business-ratios';
import { handlePreflight } from './tools/preflight';
import { handleStressTest } from './tools/stress-test';
import { DEFAULT_POLICY_RULES, RISK_MODEL_VERSION } from '../../../packages/core/src/constants';

const server = new Server(
  {
    name: 'agentgate-mcp-server',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

const TOOL_DEFINITIONS = [
  {
    name: 'agentgate_check_protocol_risk',
    description:
      'Evaluates quantitative Solana protocol risk scores on a 0 to 10 scale including MEV bot density, bonding curve risks, and automated AI decisions. Use when checking safety before allocating capital to a protocol. Do NOT use to test specific trade limits, use agentgate_evaluate_policy instead. Prerequisites: protocolSlug string. Side effects: Read only, zero cost, instant response. Example: {"protocolSlug": "jupiter"}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        protocolSlug: {
          type: 'string',
          enum: ['kamino', 'drift', 'jupiter', 'orca', 'raydium', 'meteora', 'marinade', 'jito', 'pumpfun'],
          description: 'Target Solana protocol slug',
        },
      },
      required: ['protocolSlug'],
    },
  },
  {
    name: 'agentgate_get_protocol_list',
    description:
      'Retrieves all monitored Solana DeFi protocols and launchpads with live TVL, category market share, bot volume density, and risk ratings. Use when discovering available protocols or choosing allocation targets. Do NOT use for single protocol detailed breakdown, use agentgate_check_protocol_risk instead. Prerequisites: None. Side effects: Read only, zero cost. Example: {}.',
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
    name: 'agentgate_evaluate_policy',
    description:
      'Evaluates a planned transaction against active financial guardrail policies with fail-closed safety overrides, and returns maxAllowedUsd (the largest amount that would pass) plus safer same-category alternatives when blocked. Pass current portfolio state (currentDailyVolumeUsd, currentDrawdownPct, openPositionsCount) so daily-volume, drawdown, and position-count limits actually bind. Use before executing swaps, borrows, or bonding curve purchases. Do NOT use for general protocol risk analysis, use agentgate_check_protocol_risk instead. Side effects: Read only, zero cost. Example: {"action": "swap", "protocolSlug": "jupiter", "amountUsd": 500, "currentDailyVolumeUsd": 8000}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['swap', 'lend', 'borrow', 'lp', 'stake', 'perp_long', 'perp_short', 'buy_bonding_curve'],
          description: 'Transaction action',
        },
        protocolSlug: {
          type: 'string',
          enum: ['kamino', 'drift', 'jupiter', 'orca', 'raydium', 'meteora', 'marinade', 'jito', 'pumpfun'],
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
          description: 'Optional: USD volume already transacted today (for daily-limit checks)',
        },
        currentDrawdownPct: {
          type: 'number',
          minimum: 0,
          description: 'Optional: current portfolio drawdown percentage (for circuit-breaker checks)',
        },
        openPositionsCount: {
          type: 'number',
          minimum: 0,
          description: 'Optional: number of currently open positions (for max-positions checks)',
        },
      },
      required: ['action', 'protocolSlug', 'amountUsd'],
    },
  },
  {
    name: 'agentgate_preflight',
    description:
      'One-shot pre-trade safety verdict: runs protocol risk analysis AND policy evaluation together and returns a single PROCEED / DO_NOT_PROCEED decision with reasons, maxAllowedUsd, top risk drivers, trend, and alternatives. Use this as the FIRST call before any transaction — it replaces manually chaining agentgate_check_protocol_risk + agentgate_evaluate_policy. Prerequisites: action, protocolSlug, amountUsd; optional portfolio state. Side effects: Read only. Example: {"action": "borrow", "protocolSlug": "kamino", "amountUsd": 800}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['swap', 'lend', 'borrow', 'lp', 'stake', 'perp_long', 'perp_short', 'buy_bonding_curve'],
          description: 'Transaction action',
        },
        protocolSlug: {
          type: 'string',
          enum: ['kamino', 'drift', 'jupiter', 'orca', 'raydium', 'meteora', 'marinade', 'jito', 'pumpfun'],
          description: 'Target protocol slug',
        },
        amountUsd: { type: 'number', minimum: 0.01, description: 'Transaction amount in USD' },
        currentDailyVolumeUsd: { type: 'number', minimum: 0, description: 'Optional daily volume so far' },
        currentDrawdownPct: { type: 'number', minimum: 0, description: 'Optional current drawdown %' },
        openPositionsCount: { type: 'number', minimum: 0, description: 'Optional open position count' },
      },
      required: ['action', 'protocolSlug', 'amountUsd'],
    },
  },
  {
    name: 'agentgate_stress_test',
    description:
      'Simulates an adverse price move across open positions and reports which positions liquidate, capital at risk, cascade exposure, projected portfolio health, time-to-liquidation estimates, and the exact collateral needed to restore a safe health factor. Use to assess leverage/liquidation risk before adding exposure or when markets move. Pass priceShockPct (e.g. -20) for one scenario, or omit to run the standard suite (-10 / -20 / -35). Optional agentId or protocolSlug to scope positions. Side effects: Read only. Example: {"priceShockPct": -20}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        priceShockPct: {
          type: 'number',
          minimum: -95,
          maximum: 0,
          description: 'Adverse price move to simulate, e.g. -20. Omit for the standard suite.',
        },
        walletAddress: { type: 'string', description: 'Solana wallet — stress REAL on-chain positions (preferred)' },
        protocolSlug: {
          type: 'string',
          enum: ['kamino', 'drift', 'jupiter', 'orca', 'raydium', 'meteora', 'marinade', 'jito', 'pumpfun'],
          description: 'Optional protocol slug filter',
        },
        agentId: { type: 'string', description: 'Optional agent UUID filter' },
      },
    },
  },
  {
    name: 'agentgate_get_position_health',
    description:
      'Queries open position health factors, liquidation prices, imminent liquidation count, and recommended agent actions. Pass walletAddress to read REAL on-chain positions with LIVE health factors (currently Kamino lending obligations; Drift pending) — this is the preferred, real-time path. Without walletAddress it reads stored/sample positions. Use when monitoring active portfolio health or liquidation exposure. Do NOT use for policy checks, use agentgate_evaluate_policy instead. Side effects: Read only. Example: {"walletAddress": "85NnTrVWd6zAoHrxD5neSz9SB8xqWtF2LFgRJGEgaZx8"}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
    inputSchema: {
      type: 'object',
      properties: {
        walletAddress: { type: 'string', description: 'Solana wallet address — reads live on-chain positions (preferred)' },
        agentId: { type: 'string', description: 'Optional agent UUID (DB positions)' },
        protocolSlug: {
          type: 'string',
          enum: ['kamino', 'drift', 'jupiter', 'orca', 'raydium', 'meteora', 'marinade', 'jito', 'pumpfun'],
          description: 'Optional protocol slug filter',
        },
      },
    },
  },
  {
    name: 'agentgate_get_business_ratios',
    description:
      'Retrieves business share ratios, capital efficiency, fee to TVL ratios, utilization rates, and web community telemetry. Use when analyzing economic efficiency or web trust score of a protocol. Do NOT use for position monitoring, use agentgate_get_position_health instead. Prerequisites: protocolSlug string. Side effects: Read only, zero cost. Example: {"protocolSlug": "kamino"}.',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
    inputSchema: {
      type: 'object',
      properties: {
        protocolSlug: {
          type: 'string',
          enum: ['kamino', 'drift', 'jupiter', 'orca', 'raydium', 'meteora', 'marinade', 'jito', 'pumpfun'],
          description: 'Target protocol slug',
        },
      },
      required: ['protocolSlug'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOL_DEFINITIONS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: Record<string, unknown> = {};

    const cleanName = name.replace(/^agentgate_/, '');

    if (cleanName === 'check_protocol_risk') {
      result = await handleCheckProtocolRisk(args);
    } else if (cleanName === 'get_protocol_list') {
      result = await handleGetProtocolList();
    } else if (cleanName === 'evaluate_policy') {
      result = await handleEvaluatePolicy(args);
    } else if (cleanName === 'preflight') {
      result = await handlePreflight(args);
    } else if (cleanName === 'stress_test') {
      result = await handleStressTest(args);
    } else if (cleanName === 'get_position_health') {
      result = await handleGetPositionHealth(args);
    } else if (cleanName === 'get_business_ratios') {
      result = await handleGetBusinessRatios(args);
    } else {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Tool Execution Error — Unknown tool name '${name}' — Use agentgate_get_protocol_list or agentgate_check_protocol_risk — Valid names: agentgate_check_protocol_risk, agentgate_get_protocol_list, agentgate_evaluate_policy, agentgate_get_position_health, agentgate_get_business_ratios`,
          },
        ],
      };
    }

    if ((result as any).isError) {
      return {
        isError: true,
        content: [{ type: 'text', text: String((result as any).error) }],
      };
    }

    // Return both a human-readable text block and machine-typed structured
    // content so agents can consume validated fields without parsing text.
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Unexpected MCP Execution Error — ${(error as Error).message} — Contact AgentGate support if issue persists`,
        },
      ],
    };
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'agentgate://schemas/policy-rules',
        name: 'AgentGate Guardrail Policy Rules Reference',
        description: 'Standard financial risk guardrail policy rules and limits for AI trading agents.',
        mimeType: 'application/json',
      },
      {
        uri: 'agentgate://docs/quant-risk-matrix',
        name: 'AgentGate Institutional Quantitative Risk Matrix',
        description: 'Documentation of the 7 dimension quantitative risk scoring framework.',
        mimeType: 'text/markdown',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'agentgate://schemas/policy-rules') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(DEFAULT_POLICY_RULES, null, 2),
        },
      ],
    };
  }

  if (uri === 'agentgate://docs/quant-risk-matrix') {
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: `# AgentGate Quantitative Risk Scoring Matrix (model v${RISK_MODEL_VERSION})\n\nSafety score is 0..10 where HIGHER = SAFER. Each factor carries a data source, timestamp, and confidence; low-confidence factors widen the composite confidence band. Use the band, not the point score.\n\n## Factor weights\n- Audit & Governance (20%) — audit status, auditor count, upgrade timelock\n- Liquidation & Rekt Risk (20%) — share of value near liquidation\n- MEV / Bot Density (15%) — bot-driven volume ratio\n- Whale Concentration (15%) — live top-10 token holder % (Helius)\n- Oracle Latency & Depeg (10%) — Pyth confidence interval + publish staleness\n- Web & Community Trust (10%) — sentiment, domain trust, dev activity\n- Business Efficiency (10%) — market share, fee/TVL, capital efficiency (DeFiLlama)\n\n## Live sources\n- Pyth Hermes — oracle confidence + staleness\n- Helius RPC — token holder concentration\n- DeFiLlama — TVL + fees\n\nTiers: >=8.5 low / proceed, >=7.0 medium / caution, >=5.0 high / avoid, <5.0 critical / block (fail-closed).\n`,
        },
      ],
    };
  }

  throw new Error(`Resource '${uri}' not found`);
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'agentgate_preflight_check',
        description: 'Standard workflow prompt for AI agents to check protocol risk, evaluate policy compliance, and inspect position health before executing transactions.',
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  if (name === 'agentgate_preflight_check') {
    return {
      description: 'AI Agent Pre-Flight Safety Workflow',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Before executing any trade or allocation on Solana, call agentgate_preflight with your action, protocolSlug, and amountUsd (plus portfolio state: currentDailyVolumeUsd, currentDrawdownPct, openPositionsCount if known). If verdict is PROCEED, execute. If DO_NOT_PROCEED, resize to maxAllowedUsd or switch to a listed alternative. For leverage/perp exposure, also call agentgate_stress_test to confirm the portfolio survives a -20% shock. Treat the confidence band, not just the point safetyScore, as the decision input.',
          },
        },
      ],
    };
  }

  throw new Error(`Prompt '${name}' not found`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AgentGate MCP Server v2.5.0 listening on stdio transport.');
}

main().catch((error) => {
  console.error('Fatal MCP Server Error:', error);
  process.exit(1);
});
