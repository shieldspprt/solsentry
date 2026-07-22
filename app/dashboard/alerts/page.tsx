import React from 'react';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { AlertsView } from '../../../components/features/AlertsView';
import { AlertRecord } from '../../../lib/types';
import { DEFAULT_SOLANA_ALERTS } from '../../../lib/default-alerts';

export const revalidate = 15;

export default async function AlertsPage() {
  let alerts: AlertRecord[] = DEFAULT_SOLANA_ALERTS;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      alerts = data as unknown as AlertRecord[];
    }
  } catch {
    // Fallback
  }

  return <AlertsView alerts={alerts} />;
}
