import React from 'react';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import { fetchSolanaEpochInfo } from '../../packages/core/src/data-fetchers/helius';
import { DashboardView } from '../../components/features/DashboardView';
import { ProtocolRecord, PositionRecord } from '../../lib/types';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../lib/default-protocols';
import { DEFAULT_SOLANA_POSITIONS } from '../../lib/default-positions';

export const revalidate = 15;

export default async function DashboardPage() {
  let protocols: ProtocolRecord[] = DEFAULT_SOLANA_PROTOCOLS;
  let positions: PositionRecord[] = DEFAULT_SOLANA_POSITIONS;
  let agentCount = 4;
  let recentChecksCount = 1420;

  try {
    const supabase = getSupabaseAdmin();

    const { data: protoData } = await supabase.from('protocols').select('*').order('risk_score', { ascending: false });
    if (protoData && protoData.length > 0) {
      protocols = protoData as unknown as ProtocolRecord[];
    }

    const { data: posData } = await supabase.from('positions').select('*').eq('status', 'open');
    if (posData && posData.length > 0) {
      positions = posData as unknown as PositionRecord[];
    }

    const { count: aCount } = await supabase.from('agents').select('*', { count: 'exact', head: true });
    if (aCount) agentCount = aCount;

    const { count: rCount } = await supabase.from('risk_checks').select('*', { count: 'exact', head: true });
    if (rCount) recentChecksCount = rCount;
  } catch {
    // Fallback
  }

  const epochData = await fetchSolanaEpochInfo();

  return (
    <DashboardView
      protocols={protocols}
      positions={positions}
      agentCount={agentCount}
      recentChecksCount={recentChecksCount}
      epochData={epochData}
    />
  );
}
