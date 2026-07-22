import { NextRequest, NextResponse } from 'next/server';
import { computeProtocolRisk } from '../../../../packages/core/src/risk-scorer';
import { buildGroundedMetrics } from '../../../../packages/core/src/data-fetchers/grounded-metrics';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { sanitizeText } from '../../../../lib/validation';
import { computeTrend, recordSnapshot } from '../../../../lib/snapshots';
import { ProtocolRecord } from '../../../../lib/types';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawSlug = body?.protocolSlug || body?.slug || '';
    const protocolSlug = sanitizeText(String(rawSlug)).toLowerCase();

    if (!protocolSlug) {
      return NextResponse.json(
        { error: 'protocolSlug parameter is required' },
        { status: 400 }
      );
    }

    let protocol: ProtocolRecord | null =
      DEFAULT_SOLANA_PROTOCOLS.find((p) => p.slug === protocolSlug) || null;
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.from('protocols').select('*').eq('slug', protocolSlug).maybeSingle();
      if (data) protocol = data as unknown as ProtocolRecord;
    } catch {
      // fallback to default registry
    }

    if (!protocol) {
      return NextResponse.json(
        { error: `Protocol '${protocolSlug}' not found` },
        { status: 404 }
      );
    }

    // Ground in live sources, score, attach trend, persist snapshot.
    let tvlUsd: number | null = protocol.tvl_usd;
    let breakdown;
    try {
      const grounded = await buildGroundedMetrics(protocol);
      tvlUsd = grounded.tvl_usd ?? protocol.tvl_usd;
      breakdown = computeProtocolRisk({ ...protocol, institutional_metrics: grounded.metrics }, { provenance: grounded.provenance });
    } catch {
      breakdown = computeProtocolRisk(protocol);
    }

    const factorScores = Object.fromEntries((breakdown.factors || []).map((f) => [f.key, f.score]));
    const trend = await computeTrend(protocolSlug, breakdown.composite_risk_score, factorScores);
    breakdown.trend = trend;
    void recordSnapshot(protocolSlug, breakdown, tvlUsd);

    const headers = new Headers();
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');

    return NextResponse.json(
      {
        slug: protocol.slug,
        name: protocol.name,
        category: protocol.category,
        safetyScore: breakdown.composite_risk_score,
        scoreDirection: 'higher_is_safer',
        compositeRiskScore: breakdown.composite_risk_score,
        riskTier: breakdown.risk_tier,
        recommendation: breakdown.action_recommendation,
        confidence: breakdown.confidence,
        factors: breakdown.factors,
        topDrivers: breakdown.top_drivers,
        whatWouldFlip: breakdown.what_would_flip,
        trend,
        agentDecision: breakdown.agent_decision,
        breakdown: {
          auditGovernanceScore: breakdown.audit_governance_score,
          liquidationRektScore: breakdown.liquidation_rekt_score,
          mevBotDensityScore: breakdown.mev_bot_density_score,
          whaleConcentrationScore: breakdown.whale_concentration_score,
          oracleDepegScore: breakdown.oracle_depeg_score,
        },
        quantMetrics: breakdown.quant_metrics,
        criticalWarnings: breakdown.critical_warnings,
        tvlUsd,
        auditStatus: protocol.audit_status,
        modelVersion: breakdown.model_version,
        dataAsOf: breakdown.data_as_of,
      },
      { status: 200, headers }
    );
  } catch {
    return NextResponse.json(
      { error: 'Internal server error processing risk check request' },
      { status: 500 }
    );
  }
}
