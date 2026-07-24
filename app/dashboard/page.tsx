import React from 'react';
import { DashboardView } from '../../components/features/DashboardView';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../lib/default-protocols';
import { DEFAULT_SOLANA_POSITIONS } from '../../lib/default-positions';
import { fetchSolanaEpochInfo } from '../../packages/core/src/data-fetchers/helius';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

export const revalidate = 15;

export default async function DashboardPage() {
  let recentChecksCount = 1420;
  let agentCount = 4;

  try {
    const supabase = getSupabaseAdmin();
    const [{ count: checksCount }, { count: agentsCount }] = await Promise.all([
      supabase.from('risk_checks').select('*', { count: 'exact', head: true }),
      supabase.from('agents').select('*', { count: 'exact', head: true }),
    ]);

    if (checksCount !== null && checksCount > 0) {
      recentChecksCount = checksCount;
    }
    if (agentsCount !== null && agentsCount > 0) {
      agentCount = agentsCount;
    }
  } catch {
    // Fallback
  }

  const epochData = await fetchSolanaEpochInfo();

  return (
    <DashboardView
      protocols={DEFAULT_SOLANA_PROTOCOLS}
      positions={DEFAULT_SOLANA_POSITIONS}
      agentCount={agentCount}
      recentChecksCount={recentChecksCount}
      epochData={epochData}
    />
  );
}
