import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-admin';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../../lib/default-protocols';
import { computeProtocolRisk } from '../../../../../packages/core/src/risk-scorer';
import { buildGroundedMetrics } from '../../../../../packages/core/src/data-fetchers/grounded-metrics';
import { ProtocolRecord } from '../../../../../lib/types';
import { logger } from '../../../../../lib/logger';

export const revalidate = 60;

// The scored protocol index. Grounding happens here, server-side, so the
// dashboard renders real provenance instead of the scorer's empty baseline —
// the browser cannot reach Pyth/Helius/DeFiLlama/GitHub directly, which is why
// every factor previously rendered as a default.
export async function GET() {
  let protocols: ProtocolRecord[] = DEFAULT_SOLANA_PROTOCOLS;
  let registrySource: 'database' | 'bundled' = 'bundled';
  let registryError: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('protocols').select('*').order('risk_score', { ascending: false });
    if (error) {
      registryError = error.message;
    } else if (data && data.length > 0) {
      protocols = data as unknown as ProtocolRecord[];
      registrySource = 'database';
    }
  } catch (err: any) {
    registryError = err?.message || 'protocol store unreachable';
  }

  const scored = await Promise.all(
    protocols.map(async (protocol) => {
      try {
        const grounded = await buildGroundedMetrics(protocol);
        const merged: ProtocolRecord = { ...protocol, tvl_usd: grounded.tvl_usd ?? protocol.tvl_usd };
        const breakdown = computeProtocolRisk(
          { ...merged, institutional_metrics: grounded.metrics },
          { provenance: grounded.provenance }
        );
        return {
          protocol: merged,
          breakdown,
          sourcesLive: grounded.sources_live,
          sourcesUnavailable: grounded.sources_unavailable,
        };
      } catch (err: any) {
        logger.warn('scored_protocol_failed', { slug: protocol.slug, error: err?.message });
        // Ungrounded: the scorer reports every data-driven factor as unmeasured.
        return {
          protocol,
          breakdown: computeProtocolRisk(protocol),
          sourcesLive: [],
          sourcesUnavailable: ['all'],
        };
      }
    })
  );

  return NextResponse.json(
    {
      asOf: new Date().toISOString(),
      registrySource,
      registryError,
      count: scored.length,
      protocols: scored,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  );
}
