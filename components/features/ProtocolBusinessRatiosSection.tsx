'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { ProtocolRecord } from '../../lib/types';
import { formatCurrency, formatCompactCurrency } from '../../lib/formatters';

export interface ProtocolBusinessRatiosSectionProps {
  protocol: ProtocolRecord;
}

export const ProtocolBusinessRatiosSection: React.FC<ProtocolBusinessRatiosSectionProps> = ({ protocol }) => {
  const m = protocol.institutional_metrics;
  const biz = m?.business_ratios || {
    category_market_share_pct: 35.0,
    total_category_lend_usd: 1500000000,
    protocol_lend_usd: 525000000,
    capital_efficiency_ratio: 2.5,
    annualized_fee_usd: 25000000,
    fee_to_tvl_ratio_pct: 4.8,
    utilization_rate_pct: 54.0,
  };

  return (
    <Card title="Business Share Ratios & Capital Efficiency" subtitle="Protocol market share vs total category lending & fee capture">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Category Market Share</span>
          <span className="text-2xl font-extrabold text-cyan-300 mt-2 block">{biz.category_market_share_pct}%</span>
          <span className="text-xs text-slate-300 mt-1 block">Solana {protocol.category} market</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Protocol Liquidity</span>
          <span className="text-2xl font-extrabold text-slate-100 mt-2 block">{formatCompactCurrency(biz.protocol_lend_usd)}</span>
          <span className="text-xs text-slate-300 mt-1 block">Category Total: {formatCompactCurrency(biz.total_category_lend_usd)}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Capital Efficiency</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">{biz.capital_efficiency_ratio}x</span>
          <span className="text-xs text-slate-300 mt-1 block">24h Volume Turnover</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Annualized Fee Capture</span>
          <span className="text-2xl font-extrabold text-amber-400 mt-2 block">{formatCurrency(biz.annualized_fee_usd)}</span>
          <span className="text-xs text-slate-300 mt-1 block">{biz.fee_to_tvl_ratio_pct}% Fee/TVL Ratio</span>
        </div>
      </div>
    </Card>
  );
};
