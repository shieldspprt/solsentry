import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { computeProtocolRisk } from '../../../../packages/core/src/risk-scorer';
import { buildGroundedMetrics } from '../../../../packages/core/src/data-fetchers/grounded-metrics';
import { ProtocolRecord } from '../../../../lib/types';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';
import { GetBusinessRatiosSchema } from '../schemas';

export async function handleGetBusinessRatios(args: unknown) {
  const parseResult = GetBusinessRatiosSchema.safeParse(args);
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0];
    return {
      isError: true,
      error: `Business Ratios Request Failed — ${issue.message}`,
    };
  }

  const { protocolSlug } = parseResult.data;

  let protocolRecord: ProtocolRecord | null = DEFAULT_SOLANA_PROTOCOLS.find((p) => p.slug === protocolSlug) || null;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('protocols')
      .select('*')
      .eq('slug', protocolSlug)
      .maybeSingle();

    if (data) {
      protocolRecord = data as unknown as ProtocolRecord;
    }
  } catch {
    // Fallback
  }

  if (!protocolRecord) {
    return {
      isError: true,
      error: `Business Ratios Request Failed — Protocol '${protocolSlug}' not found in registry — Use agentgate_get_protocol_list to see active protocols — Example: {"protocolSlug": "jupiter"}`,
    };
  }

  // Ground in live sources before scoring. Without this the tool returned the
  // scorer's baseline — which is now, correctly, all nulls.
  const grounded = await buildGroundedMetrics(protocolRecord);
  const breakdown = computeProtocolRisk(
    { ...protocolRecord, tvl_usd: grounded.tvl_usd ?? protocolRecord.tvl_usd, institutional_metrics: grounded.metrics },
    { provenance: grounded.provenance }
  );
  const biz = breakdown.quant_metrics.business_ratios;
  const web = breakdown.quant_metrics.web_community;

  // `null` on any field below means the upstream source did not report it.
  return {
    isError: false,
    protocol: protocolRecord.name,
    slug: protocolRecord.slug,
    category: protocolRecord.category,
    tvlUsd: grounded.tvl_usd ?? protocolRecord.tvl_usd,
    sourcesLive: grounded.sources_live,
    sourcesUnavailable: grounded.sources_unavailable,
    businessRatios: {
      categoryMarketSharePct: biz?.category_market_share_pct ?? null,
      categoryTvlUsd: biz?.category_tvl_usd ?? null,
      protocolTvlUsd: biz?.protocol_tvl_usd ?? null,
      annualizedFeeUsd: biz?.annualized_fee_usd ?? null,
      annualizedBasis: biz?.annualized_basis ?? null,
      feeToTvlRatioPct: biz?.fee_to_tvl_ratio_pct ?? null,
    },
    developerActivity: {
      commits30d: web?.developer_commits_30d ?? null,
      activeDevsCount: web?.active_devs_count ?? null,
      githubOrg: web?.github_org ?? null,
      reposSampled: web?.repos_sampled ?? null,
      asOf: web?.as_of ?? null,
    },
    businessEfficiencyScore: breakdown.business_efficiency_score,
    webCommunityScore: breakdown.web_community_score,
    factorCoverage: breakdown.factor_coverage,
  };
}
