import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';

export async function handleGetProtocolList() {
  let protocolsList = DEFAULT_SOLANA_PROTOCOLS;

  try {
    const supabase = getSupabaseAdmin();
    const { data: protocols } = await supabase
      .from('protocols')
      .select('slug, name, category, risk_score, audit_status, oracle_health, tvl_usd')
      .order('risk_score', { ascending: false });

    if (protocols && protocols.length > 0) {
      protocolsList = protocols as any;
    }
  } catch {
    // Fallback
  }

  return {
    count: protocolsList.length,
    protocols: protocolsList.map((p: any) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      riskScore: p.risk_score || p.riskScore || 9.0,
      auditStatus: p.audit_status || p.auditStatus || 'audited',
      oracleHealth: p.oracle_health || p.oracleHealth || 'healthy',
      tvlUsd: p.tvl_usd || p.tvlUsd || 0,
    })),
  };
}
