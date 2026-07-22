import { getSupabaseAdmin } from './supabase-admin';
import { InstitutionalFactorsBreakdown, MetricTrend, FactorKey } from './types';

// Persist a computed risk breakdown as a time-series snapshot. Idempotent per
// protocol per hour (unique index handles dedupe). Best-effort: failures never
// break the request path.
export async function recordSnapshot(
  slug: string,
  breakdown: InstitutionalFactorsBreakdown,
  tvlUsd: number | null
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('protocol_metric_snapshots').upsert(
      {
        protocol_slug: slug,
        composite_score: breakdown.composite_risk_score,
        audit_governance_score: breakdown.audit_governance_score,
        liquidation_rekt_score: breakdown.liquidation_rekt_score,
        mev_bot_density_score: breakdown.mev_bot_density_score,
        whale_concentration_score: breakdown.whale_concentration_score,
        oracle_depeg_score: breakdown.oracle_depeg_score,
        web_community_score: breakdown.web_community_score,
        business_efficiency_score: breakdown.business_efficiency_score,
        tvl_usd: tvlUsd,
        confidence: breakdown.confidence?.overall ?? null,
        model_version: breakdown.model_version ?? null,
      },
      { onConflict: 'protocol_slug,captured_at', ignoreDuplicates: true }
    );
  } catch {
    // best-effort only
  }
}

interface SnapshotRow {
  composite_score: number;
  audit_governance_score: number | null;
  liquidation_rekt_score: number | null;
  mev_bot_density_score: number | null;
  whale_concentration_score: number | null;
  oracle_depeg_score: number | null;
  web_community_score: number | null;
  business_efficiency_score: number | null;
  captured_at: string;
}

const FACTOR_COLUMNS: Record<FactorKey, keyof SnapshotRow> = {
  audit_governance: 'audit_governance_score',
  liquidation_rekt: 'liquidation_rekt_score',
  mev_bot_density: 'mev_bot_density_score',
  whale_concentration: 'whale_concentration_score',
  oracle_depeg: 'oracle_depeg_score',
  web_community: 'web_community_score',
  business_efficiency: 'business_efficiency_score',
};

function nearest(rows: SnapshotRow[], targetMs: number): SnapshotRow | null {
  let best: SnapshotRow | null = null;
  let bestDist = Infinity;
  for (const r of rows) {
    const d = Math.abs(new Date(r.captured_at).getTime() - targetMs);
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  return best;
}

// Compute a trend from stored snapshots. Returns 'unknown' direction when
// there is not yet enough history — never fabricates movement.
export async function computeTrend(
  slug: string,
  currentComposite: number,
  currentFactors: Partial<Record<FactorKey, number>> = {}
): Promise<MetricTrend> {
  const empty: MetricTrend = {
    composite_7d_delta: null,
    composite_30d_delta: null,
    direction: 'unknown',
    factor_deltas: {},
    snapshots_available: 0,
  };

  try {
    const supabase = getSupabaseAdmin();
    const since = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('protocol_metric_snapshots')
      .select('*')
      .eq('protocol_slug', slug)
      .gte('captured_at', since)
      .order('captured_at', { ascending: false });

    const rows = (data as SnapshotRow[] | null) || [];
    if (rows.length === 0) return empty;

    const now = Date.now();
    const ref7 = nearest(rows, now - 7 * 24 * 60 * 60 * 1000);
    const ref30 = nearest(rows, now - 30 * 24 * 60 * 60 * 1000);

    const d7 = ref7 ? Math.round((currentComposite - ref7.composite_score) * 10) / 10 : null;
    const d30 = ref30 ? Math.round((currentComposite - ref30.composite_score) * 10) / 10 : null;

    const factorDeltas: Partial<Record<FactorKey, number>> = {};
    if (ref7) {
      (Object.keys(FACTOR_COLUMNS) as FactorKey[]).forEach((key) => {
        const col = FACTOR_COLUMNS[key];
        const past = ref7[col] as number | null;
        const current = currentFactors[key];
        if (past != null && current != null) {
          factorDeltas[key] = Math.round((current - past) * 10) / 10;
        }
      });
    }

    let direction: MetricTrend['direction'] = 'stable';
    const ref = d7 ?? d30;
    if (ref == null) direction = 'unknown';
    else if (ref > 0.3) direction = 'improving';
    else if (ref < -0.3) direction = 'deteriorating';

    return {
      composite_7d_delta: d7,
      composite_30d_delta: d30,
      direction,
      factor_deltas: factorDeltas,
      snapshots_available: rows.length,
    };
  } catch {
    return empty;
  }
}
