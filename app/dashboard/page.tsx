import React from 'react';
import { DashboardView } from '../../components/features/DashboardView';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../lib/default-protocols';
import { fetchSolanaEpochInfo } from '../../packages/core/src/data-fetchers/helius';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { ProtocolRecord } from '../../lib/types';

export const revalidate = 15;

export default async function DashboardPage() {
  // null means "we could not read this", which the UI renders as "—".
  // Substituting a plausible-looking number here is how a dead database ends
  // up looking like a healthy one.
  let recentChecksCount: number | null = null;
  let agentCount: number | null = null;
  let protocols: ProtocolRecord[] = DEFAULT_SOLANA_PROTOCOLS;

  try {
    const supabase = getSupabaseAdmin();
    const [checks, agents, stored] = await Promise.all([
      supabase.from('risk_checks').select('*', { count: 'exact', head: true }),
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('protocols').select('*').order('risk_score', { ascending: false }),
    ]);

    if (!checks.error) recentChecksCount = checks.count ?? 0;
    if (!agents.error) agentCount = agents.count ?? 0;
    if (!stored.error && stored.data && stored.data.length > 0) {
      protocols = stored.data as unknown as ProtocolRecord[];
    }
  } catch {
    // Counts stay null; the registry falls back to the bundled protocol list.
  }

  const epochData = await fetchSolanaEpochInfo();

  return (
    <DashboardView
      protocols={protocols}
      agentCount={agentCount}
      recentChecksCount={recentChecksCount}
      epochData={epochData}
    />
  );
}
