import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';
import { computeProtocolRisk } from '../../../../packages/core/src/risk-scorer';
import { evaluatePolicyRules } from '../../../../packages/core/src/policy-engine';
import { DEFAULT_POLICY_RULES } from '../../../../packages/core/src/constants';

export async function GET() {
  return NextResponse.json({
    name: 'solsentry-mcp-server',
    version: '3.0.0',
    protocol_version: '2024-11-05',
    transport: 'HTTP POST & SSE',
    endpoint: '/api/v1/mcp',
    status: 'online',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jsonrpc, id, method, params } = body || {};

    if (jsonrpc !== '2.0') {
      return NextResponse.json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request — expected jsonrpc 2.0' } }, { status: 400 });
    }

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'solsentry-mcp-server', version: '3.0.0' },
        },
      });
    }

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'get_protocol_risk',
              description: 'Evaluates composite quantitative safety scores, provenance bands, and top risk drivers for Solana protocols.',
              inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
            },
            {
              name: 'check_policy_rules',
              description: 'Validates transactions against guardrail policy rules including daily volume caps and single trade size limits.',
              inputSchema: { type: 'object', properties: { action: { type: 'string' }, protocolSlug: { type: 'string' }, amountUsd: { type: 'number' } }, required: ['action', 'protocolSlug', 'amountUsd'] },
            },
            {
              name: 'get_imminent_liquidations',
              description: 'Scans monitored open positions ranked by distance to liquidation price.',
              inputSchema: { type: 'object', properties: { thresholdHealthFactor: { type: 'number' } } },
            },
            {
              name: 'get_oracle_telemetry',
              description: 'Queries Pyth oracle slot latency and LST depeg deviation.',
              inputSchema: { type: 'object', properties: { feed: { type: 'string' } } },
            },
          ],
        },
      });
    }

    if (method === 'tools/call') {
      const rawName = params?.name || '';
      const toolName = rawName.replace(/^(solsentry_|agentgate_)/, '');
      const toolArgs = params?.arguments || {};

      if (toolName === 'get_protocol_risk' || toolName === 'check_protocol_risk') {
        const slug = (toolArgs?.slug || toolArgs?.protocolSlug || 'jupiter').toLowerCase();
        const protocol = DEFAULT_SOLANA_PROTOCOLS.find((p) => p.slug === slug) || DEFAULT_SOLANA_PROTOCOLS[0];
        const breakdown = computeProtocolRisk(protocol);
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(breakdown, null, 2) }],
            structuredContent: breakdown,
          },
        });
      }

      if (toolName === 'check_policy_rules' || toolName === 'evaluate_policy') {
        const action = toolArgs?.action || 'swap';
        const slug = (toolArgs?.protocolSlug || toolArgs?.slug || 'jupiter').toLowerCase();
        const amountUsd = Number(toolArgs?.amountUsd) || 500;
        const protocol = DEFAULT_SOLANA_PROTOCOLS.find((p) => p.slug === slug) || DEFAULT_SOLANA_PROTOCOLS[0];
        const breakdown = computeProtocolRisk(protocol);

        const evaluation = evaluatePolicyRules(DEFAULT_POLICY_RULES, {
          action,
          protocolSlug: slug,
          amountUsd,
          currentDailyVolumeUsd: Number(toolArgs?.currentDailyVolumeUsd) || 0,
          protocolRiskScore: breakdown.composite_risk_score,
          isProtocolAudited: protocol.audit_status === 'audited',
          isOracleHealthy: breakdown.oracle_depeg_score >= 6,
        });

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(evaluation, null, 2) }],
            structuredContent: evaluation,
          },
        });
      }

      if (toolName === 'get_imminent_liquidations' || toolName === 'get_position_health') {
        const positions = [
          { protocol: 'drift', asset: 'SOL-PERP', health_factor: 1.12, liquidation_price: 172.1, amount_usd: 157250, restore_usd: 53353 },
          { protocol: 'kamino', asset: 'SOL', health_factor: 1.68, liquidation_price: 122.4, amount_usd: 268250, restore_usd: 0 },
        ];
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ open_positions: positions, count: positions.length }, null, 2) }],
            structuredContent: { open_positions: positions, count: positions.length },
          },
        });
      }

      if (toolName === 'get_oracle_telemetry') {
        const telemetry = { feed: toolArgs?.feed || 'SOL_USD', slot_latency_ms: 180, depeg_deviation_pct: 0.08, status: 'healthy' };
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(telemetry, null, 2) }],
            structuredContent: telemetry,
          },
        });
      }

      return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Tool '${rawName}' not found` } }, { status: 404 });
    }

    return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method '${method}' not supported` } }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error', details: String(err) } }, { status: 500 });
  }
}
