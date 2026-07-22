import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    schema_version: 'v1',
    name_for_human: 'SolSentry Solana DeFi Risk Middleware',
    name_for_model: 'solsentry_risk_middleware',
    description_for_human: 'Real time safety scoring, protocol audit verifications, and guardrails for Solana AI trading agents.',
    description_for_model: 'Middleware tool for AI agents on Solana. Use this tool before executing any lending, borrowing, swapping, LP, or staking transaction on Solana protocols (Kamino, Jupiter, Drift, Orca, Raydium, Meteora, Marinade, Jito) to verify protocol risk scores and policy compliance.',
    auth: {
      type: 'user_http',
      authorization_type: 'bearer',
    },
    api: {
      type: 'openapi',
      url: 'http://localhost:3000/api/v1/openapi.json',
    },
    logo_url: 'http://localhost:3000/icon.png',
    contact_email: 'support@solsentry.io',
    legal_info_url: 'http://localhost:3000/legal',
  };

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
