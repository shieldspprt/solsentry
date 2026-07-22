'use client';

import React from 'react';

export interface TimestampProps {
  isoString?: string;
  slot?: number;
  epoch?: number;
  className?: string;
}

export const Timestamp: React.FC<TimestampProps> = ({
  isoString,
  slot,
  epoch,
  className = '',
}) => {
  const dateObj = isoString ? new Date(isoString) : new Date();
  const utcString = dateObj.toUTCString();

  const getRelativeTime = (d: Date) => {
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const relativeText = getRelativeTime(dateObj);

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold text-slate-300 ${className}`} title={`UTC: ${utcString}`}>
      <span>{relativeText}</span>
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
