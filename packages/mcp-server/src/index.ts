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
    name: 'solsentry-mcp-server',
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

import { TOOL_DEFINITIONS, dispatchToolCall } from './tool-registry';

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOL_DEFINITIONS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await dispatchToolCall(name, args);

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
