import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { computeProtocolRisk } from '../../../../packages/core/src/risk-scorer';
import { buildGroundedMetrics } from '../../../../packages/core/src/data-fetchers/grounded-metrics';
import { recordSnapshot } from '../../../../lib/snapshots';
import { SUPPORTED_PROTOCOLS } from '../../../../packages/core/src/constants';
import { logger } from '../../../../lib/logger';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-solsentry-user-id');
    const cronSecretHeader = request.headers.get('x-solsentry-cron-secret');
    const expectedCronSecret = process.env.SOLSENTRY_CRON_SECRET;

    const isAuthorizedCron = expectedCronSecret && cronSecretHeader === expectedCronSecret;
    if (!userId && !isAuthorizedCron && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication or valid cron secret required to trigger sync.' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const synced: string[] = [];

    for (const slug of SUPPORTED_PROTOCOLS) {
      try {
        const { data: current } = await supabase.from('protocols').select('*').eq('slug', slug).single();
        if (!current) continue;

        // Ground every factor in live sources, not just TVL.
        const grounded = await buildGroundedMetrics(current);
        const merged = { ...current, tvl_usd: grounded.tvl_usd ?? current.tvl_usd };
        const breakdown = computeProtocolRisk(
          { ...merged, institutional_metrics: grounded.metrics },
          { provenance: grounded.provenance }
        );

        await supabase.from('protocols').update({
          tvl_usd: merged.tvl_usd,
          risk_score: breakdown.composite_risk_score,
          oracle_health: breakdown.oracle_depeg_score >= 6 ? 'healthy' : 'degraded',
          institutional_metrics: breakdown.quant_metrics,
          last_updated: new Date().toISOString(),
        }).eq('slug', slug);

        // Write a time-series snapshot so trend deltas accumulate over time.
        await recordSnapshot(slug, breakdown, merged.tvl_usd);
        synced.push(slug);
      } catch (err: any) {
        logger.warn('protocol_sync_partial_failure', { slug, error: err.message });
      }
    }

    logger.info('protocols_synced', { count: synced.length, protocols: synced });

    return NextResponse.json({
      success: true,
      syncedCount: synced.length,
      syncedProtocols: synced,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('protocol_sync_failed', { error: err.message });
    return NextResponse.json({ error: 'internal_error', message: 'Failed to sync live protocol telemetry' }, { status: 500 });
  }
}
