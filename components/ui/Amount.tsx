'use client';

import React from 'react';

export interface AmountProps {
  lamports?: bigint | number;
  solAmount?: number;
  usdAmount?: number;
  solPriceUsd?: number;
  decimals?: number;
  mode?: 'compact' | 'full';
  showCurrencyToggle?: boolean;
  className?: string;
}

export const Amount: React.FC<AmountProps> = ({
  lamports,
  solAmount,
  usdAmount,
  solPriceUsd = 185.0,
  decimals = 9,
  mode = 'compact',
  className = '',
}) => {
  let computedSol = 0;

  if (lamports !== undefined) {
    const divisor = BigInt(10 ** decimals);
    const bigLamports = typeof lamports === 'bigint' ? lamports : BigInt(Math.floor(lamports));
    const whole = Number(bigLamports / divisor);
    const fraction = Number(bigLamports % divisor) / (10 ** decimals);
    computedSol = whole + fraction;
  } else if (solAmount !== undefined) {
    computedSol = solAmount;
  }

  const computedUsd = usdAmount !== undefined ? usdAmount : computedSol * solPriceUsd;

  const formatCompact = (val: number) => {
    if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1)}k`;
    return val.toFixed(2);
  };

  const formattedSol = mode === 'compact' ? formatCompact(computedSol) : computedSol.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const formattedUsd = mode === 'compact' ? formatCompact(computedUsd) : computedUsd.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const exactHoverTitle = `${computedSol.toFixed(9)} SOL ($${computedUsd.toFixed(2)} USD as of live feed)`;

  return (
    <span className={`font-mono tabular-nums inline-flex items-baseline gap-1 text-slate-100 ${className}`} title={exactHoverTitle}>
      <span className="font-bold">{formattedSol} SOL</span>
      <span className="text-xs font-semibold text-slate-400 font-sans">(${formattedUsd})</span>
    </span>
  );
};
