import { NextResponse } from 'next/server';

export async function GET() {
  const openApiSpec = {
    openapi: '3.0.1',
    info: {
      title: 'AgentGate Solana AI Agent DeFi Risk Middleware API',
      description: 'API for AI agents to check Solana DeFi protocol risk scores, position health, and guardrail policies.',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'AgentGate Active Cluster',
      },
    ],
    paths: {
      '/api/v1/protocols': {
        get: {
          summary: 'List supported Solana DeFi protocols and risk scores',
          operationId: 'getProtocolsList',
          responses: {
            '200': {
              description: 'Successful response containing protocol risk scores and TVL metrics',
            },
          },
        },
      },
      '/api/v1/risk-check': {
        post: {
          summary: 'Perform pre flight risk check for a target protocol',
          operationId: 'checkProtocolRisk',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    protocolSlug: { type: 'string', example: 'kamino' },
                    action: { type: 'string', example: 'lend' },
                    amountUsd: { type: 'number', example: 500 },
                  },
                  required: ['protocolSlug'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Risk evaluation result and recommendation',
            },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
