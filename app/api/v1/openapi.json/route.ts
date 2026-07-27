import { NextResponse } from 'next/server';
import { APP_VERSION } from '../../../../lib/version';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const openApiSpec = {
    openapi: '3.0.1',
    info: {
      title: 'SolSentry Solana AI Agent DeFi Risk Middleware API',
      description: 'Institutional-grade quantitative safety engine, policy guardrails, and position monitoring middleware for Solana AI agents.',
      version: APP_VERSION,
    },
    servers: [
      {
        url: baseUrl,
        description: 'SolSentry Active Node',
      },
    ],
    paths: {
      '/api/v1/protocols': {
        get: {
          summary: 'List monitored Solana DeFi protocols and composite safety scores',
          operationId: 'getProtocolsList',
          responses: {
            '200': { description: 'Protocol registry with risk scores, TVL, and bot density.' },
          },
        },
      },
      '/api/v1/risk-check': {
        post: {
          summary: 'Perform pre-trade risk evaluation for a target protocol',
          operationId: 'checkProtocolRisk',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    protocolSlug: { type: 'string', example: 'jupiter' },
                    action: { type: 'string', example: 'swap' },
                    amountUsd: { type: 'number', example: 5000 },
                  },
                  required: ['protocolSlug'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'Risk decision breakdown and recommendation.' },
          },
        },
      },
      '/api/v1/positions/read': {
        get: {
          summary: 'Read open positions and health factors for a Solana wallet',
          operationId: 'readPositions',
          parameters: [
            { name: 'wallet', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Wallet obligations and health factors.' },
          },
        },
      },
      '/api/v1/stream': {
        get: {
          summary: 'SSE stream for live oracle telemetry and anomaly events',
          operationId: 'streamOracleTelemetry',
          responses: {
            '200': {
              description:
                'text/event-stream feed with telemetry heartbeats and oracle_anomaly events scored by an online rolling median/MAD + EWMA detector.',
            },
          },
        },
      },
      '/api/v1/webhooks/subscribe': {
        post: {
          summary: 'Create or update a durable event webhook subscription',
          operationId: 'subscribeWebhook',
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri', example: 'https://alerts.example.com/solsentry' },
                    events: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'liquidation_risk',
                          'health_factor_low',
                          'depeg',
                          'protocol_exploit',
                          'oracle_down',
                          'oracle_anomaly',
                        ],
                      },
                    },
                    walletAddress: { type: 'string' },
                    agentId: { type: 'string', format: 'uuid' },
                    thresholdHf: { type: 'number' },
                  },
                  required: ['url'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'Persisted webhook subscription.' },
            '503': { description: 'Database persistence is not configured or unavailable.' },
          },
        },
        get: {
          summary: 'List webhook subscriptions for the authenticated API-key owner',
          operationId: 'listWebhookSubscriptions',
          security: [{ apiKey: [] }],
          responses: { '200': { description: 'Persisted subscriptions.' } },
        },
      },
      '/api/v1/mcp': {
        post: {
          summary: 'JSON-RPC 2.0 tool execution endpoint for MCP agents',
          operationId: 'mcpToolCall',
          responses: {
            '200': { description: 'JSON-RPC 2.0 response with tool output.' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-SolSentry-API-Key',
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
