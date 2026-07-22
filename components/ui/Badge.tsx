import React from 'react';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'low' | 'medium' | 'high' | 'critical' | 'info' | 'neutral';
  score?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  score,
  size = 'md',
  className = '',
}) => {
  let computedVariant: NonNullable<BadgeProps['variant']> = variant || 'neutral';

  if (score !== undefined) {
    if (score >= 8.0) computedVariant = 'low';
    else if (score >= 6.0) computedVariant = 'medium';
    else if (score >= 4.0) computedVariant = 'high';
    else computedVariant = 'critical';
  }

  const variantStyles = {
    low: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
    high: 'bg-orange-500/12 text-orange-300 border-orange-500/30',
    critical: 'bg-rose-500/12 text-rose-300 border-rose-500/30',
    info: 'bg-indigo-500/12 text-indigo-300 border-indigo-500/30',
    neutral: 'bg-white/[0.06] text-slate-200 border-white/10',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-[12px] font-semibold',
    md: 'px-3 py-1.5 text-[13px] font-bold',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full whitespace-nowrap ${variantStyles[computedVariant]} ${sizeStyles[size]} ${className}`}>
      {score !== undefined ? `${score.toFixed(1)} / 10` : children}
    </span>
  );
};
