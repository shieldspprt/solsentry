import React from 'react';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { AgentsView } from '../../../components/features/AgentsView';
import { AgentRecord } from '../../../lib/types';
import { DEFAULT_SOLANA_AGENTS } from '../../../lib/default-agents';

export const revalidate = 15;

export default async function AgentsPage() {
  let agents: AgentRecord[] = DEFAULT_SOLANA_AGENTS;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('agents').select('*');
    if (data && data.length > 0) {
      agents = data as unknown as AgentRecord[];
    }
  } catch {
    // Fallback
  }

  return <AgentsView initialAgents={agents} />;
}
