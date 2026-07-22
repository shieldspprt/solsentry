import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { computeProtocolRisk } from '../../../../packages/core/src/risk-scorer';
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

  const breakdown = computeProtocolRisk(protocolRecord);
  const biz = breakdown.quant_metrics.business_ratios;
  const web = breakdown.quant_metrics.web_community;

  return {
    isError: false,
    protocol: protocolRecord.name,
    slug: protocolRecord.slug,
    category: protocolRecord.category,
    tvlUsd: protocolRecord.tvl_usd,
    businessRatios: {
      categoryMarketSharePct: biz?.category_market_share_pct,
      capitalEfficiencyRatio: biz?.capital_efficiency_ratio,
      annualizedFeeUsd: biz?.annualized_fee_usd,
      feeToTvlRatioPct: biz?.fee_to_tvl_ratio_pct,
      utilizationRatePct: biz?.utilization_rate_pct,
      protocolLendUsd: biz?.protocol_lend_usd,
      protocolBorrowUsd: biz?.protocol_borrow_usd,
    },
    webCommunityStats: {
      monthlyWebVisits: web?.monthly_web_visits,
      domainTrustScore: web?.domain_trust_score,
      socialSentimentScore: web?.social_sentiment_score,
      developerCommits30d: web?.developer_commits_30d,
      activeDevsCount: web?.active_devs_count,
    },
    businessEfficiencyScore: breakdown.business_efficiency_score,
    webCommunityScore: breakdown.web_community_score,
  };
}
