'use client';

import React, { useEffect, useState } from 'react';

export interface TimestampProps {
  isoString?: string;
  slot?: number;
  epoch?: number;
  className?: string;
}

// Relative and locale-formatted times differ between the server render and the
// browser (clock skew, timezone, locale), which makes React discard the entire
// server-rendered tree with a hydration mismatch. Everything time-dependent
// therefore renders only after mount; the server emits a stable placeholder.
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function relativeTime(d: Date): string {
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return `${Math.max(0, diffSec)}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export const Timestamp: React.FC<TimestampProps> = ({ isoString, slot, epoch, className = '' }) => {
  const mounted = useMounted();
  const dateObj = isoString ? new Date(isoString) : null;

  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-300 ${className}`}
      title={dateObj ? `UTC: ${dateObj.toUTCString()}` : undefined}
      suppressHydrationWarning
    >
      <span>{mounted && dateObj ? relativeTime(dateObj) : '—'}</span>
      {epoch !== undefined && (
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300">
          Epoch #{epoch}
        </span>
      )}
      {slot !== undefined && (
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400">
          Slot {slot.toLocaleString()}
        </span>
      )}
    </span>
  );
};

// Locale clock time ("11:46:12"), rendered client-side only for the same reason.
export const LocalTime: React.FC<{ isoString?: string | null; className?: string }> = ({
  isoString,
  className = '',
}) => {
  const mounted = useMounted();
  if (!mounted || !isoString) return <span className={className}>—</span>;
  return (
    <span className={className} suppressHydrationWarning>
      {new Date(isoString).toLocaleTimeString()}
    </span>
  );
};
