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
  };

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
