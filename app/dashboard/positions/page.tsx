import React from 'react';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { PositionsView } from '../../../components/features/PositionsView';
import { PositionRecord } from '../../../lib/types';
import { DEFAULT_SOLANA_POSITIONS } from '../../../lib/default-positions';

export const revalidate = 15;

export default async function PositionsPage() {
  let positions: PositionRecord[] = DEFAULT_SOLANA_POSITIONS;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('positions').select('*');
    if (data && data.length > 0) {
      positions = data as unknown as PositionRecord[];
    }
  } catch {
    // Fallback
  }

  return <PositionsView positions={positions} />;
}
