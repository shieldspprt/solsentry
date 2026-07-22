import React from 'react';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { ProtocolsView } from '../../../components/features/ProtocolsView';
import { ProtocolRecord } from '../../../lib/types';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../lib/default-protocols';

export const revalidate = 15;

export default async function ProtocolsPage() {
  let protocols: ProtocolRecord[] = DEFAULT_SOLANA_PROTOCOLS;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('protocols')
      .select('*')
      .order('risk_score', { ascending: false });

    if (data && data.length > 0) {
      protocols = data as unknown as ProtocolRecord[];
    }
  } catch {
    // Fallback
  }

  return <ProtocolsView protocols={protocols} />;
}
