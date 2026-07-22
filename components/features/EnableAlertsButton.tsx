'use client';

import React, { useState } from 'react';
import { enablePushAlerts, pushSupported } from '../../lib/push-client';

// Lets a manager opt into device push notifications for imminent-liquidation
// alerts. Gracefully degrades when push isn't configured or supported.
export const EnableAlertsButton: React.FC = () => {
  const [state, setState] = useState<'idle' | 'working' | 'on' | 'error'>('idle');
  const [msg, setMsg] = useState<string>('');

  if (typeof window !== 'undefined' && !pushSupported()) return null;

  const onClick = async () => {
    setState('working');
    const result = await enablePushAlerts();
    if (result.ok) {
      setState('on');
      setMsg('Liquidation alerts enabled on this device');
    } else {
      setState('error');
      setMsg(
        result.reason === 'no_vapid'
          ? 'Push not configured (set NEXT_PUBLIC_VAPID_PUBLIC_KEY)'
          : result.reason === 'denied'
          ? 'Notification permission denied'
          : result.reason === 'unsupported'
          ? 'Push not supported in this browser'
          : 'Could not enable alerts'
      );
    }
  };

  if (state === 'on') {
    return <span className="text-[11px] text-emerald-400 font-medium">🔔 {msg}</span>;
  }

  return (
    <button
      onClick={onClick}
      disabled={state === 'working'}
      title={msg || 'Get a device notification when a position nears liquidation'}
      className="text-[11px] px-2.5 py-1 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
    >
      {state === 'working' ? 'Enabling…' : state === 'error' ? `⚠ ${msg}` : '🔔 Enable liquidation alerts'}
    </button>
  );
};
