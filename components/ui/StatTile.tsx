'use client';

import React from 'react';

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  delta?: string;
  deltaVariant?: 'positive' | 'negative' | 'neutral';
  accent?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  className?: string;
}

const accentText: Record<NonNullable<StatTileProps['accent']>, string> = {
  cyan: 'text-cyan-300',
  emerald: 'text-emerald-300',
  amber: 'text-amber-300',
  rose: 'text-rose-300',
  indigo: 'text-indigo-300',
  slate: 'text-slate-100',
};

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  subtitle,
  delta,
  deltaVariant = 'neutral',
  accent = 'slate',
  className = '',
}) => {
  const deltaStyles = {
    positive: 'text-emerald-400',
    negative: 'text-rose-400',
    neutral: 'text-slate-400',
  };

  return (
    <div className={`glass-card rounded-2xl p-5 ${className}`}>
      <span className="text-sm font-medium text-slate-400 block">{label}</span>
      <div className={`text-[28px] sm:text-3xl font-extrabold tabular-nums mt-1.5 leading-none ${accentText[accent]}`}>
        {value}
      </div>
      {(delta || subtitle) && (
        <div className="flex items-center gap-2 mt-2 text-[13px]">
          {delta && <span className={`font-semibold ${deltaStyles[deltaVariant]}`}>{delta}</span>}
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
