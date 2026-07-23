import { getSupabaseAdmin } from './supabase-admin';

export interface AuditEntry {
  user_id?: string | null;
  agent_id?: string | null;
  protocol_slug: string;
  action: string;
  amount_usd?: number | null;
  risk_score: number;
  risk_level: string;
  recommendation: string;
  risk_factors?: Record<string, unknown>;
  response_time_ms?: number;
}

export async function auditRiskCheck(entry: AuditEntry): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('risk_checks').insert({
      user_id: entry.user_id || null,
      agent_id: entry.agent_id || null,
      protocol_slug: entry.protocol_slug,
      action: entry.action,
      amount_usd: entry.amount_usd ?? null,
      risk_score: entry.risk_score,
      risk_level: entry.risk_level,
      recommendation: entry.recommendation,
      risk_factors: entry.risk_factors || {},
      response_time_ms: entry.response_time_ms || 0,
    });
  } catch {
    // Fire-and-forget; audit write failures never block trade decision handlers
  }
}
