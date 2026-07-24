'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { InstitutionalFactorsBreakdown, ProtocolCategory } from '../../lib/types';
import { formatCompactCurrency } from '../../lib/formatters';

export interface ProtocolBusinessRatiosSectionProps {
  /** The live breakdown from the risk-check call — never recomputed locally. */
  breakdown: InstitutionalFactorsBreakdown;
  category: ProtocolCategory;
}

const UNMEASURED = <span className="text-slate-500">Not measured</span>;

export const ProtocolBusinessRatiosSection: React.FC<ProtocolBusinessRatiosSectionProps> = ({ breakdown, category }) => {
  const biz = breakdown.quant_metrics.business_ratios;

  const share = biz?.category_market_share_pct ?? null;
  const categoryTvl = biz?.category_tvl_usd ?? null;
  const protocolTvl = biz?.protocol_tvl_usd ?? null;
  const annualFee = biz?.annualized_fee_usd ?? null;
  const feeRatio = biz?.fee_to_tvl_ratio_pct ?? null;

  return (
    <Card
      title="Business Share & Fee Capture"
      subtitle="Protocol TVL against the summed Solana TVL of its category, and annualised fee capture. All figures from DeFiLlama."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Category Market Share</span>
          <span className="text-2xl font-extrabold text-cyan-300 mt-2 block">{share != null ? `${share}%` : UNMEASURED}</span>
          <span className="text-xs text-slate-300 mt-1 block">
            {categoryTvl != null ? `of ${formatCompactCurrency(categoryTvl)} Solana ${category} TVL` : `Solana ${category} total unavailable`}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Protocol TVL</span>
          <span className="text-2xl font-extrabold text-slate-100 mt-2 block">
            {protocolTvl != null ? formatCompactCurrency(protocolTvl) : UNMEASURED}
          </span>
          <span className="text-xs text-slate-300 mt-1 block">Live from DeFiLlama</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Annualised Fee Capture</span>
          <span className="text-2xl font-extrabold text-amber-400 mt-2 block">
            {annualFee != null ? formatCompactCurrency(annualFee) : UNMEASURED}
          </span>
          <span className="text-xs text-slate-300 mt-1 block">
            {biz?.annualized_basis ? `Extrapolated from the ${biz.annualized_basis} fee window` : 'No fee series reported'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Fee / TVL Ratio</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">
            {feeRatio != null ? `${feeRatio}%` : UNMEASURED}
          </span>
          <span className="text-xs text-slate-300 mt-1 block">Annual fees as a share of TVL</span>
        </div>
      </div>
    </Card>
  );
};
