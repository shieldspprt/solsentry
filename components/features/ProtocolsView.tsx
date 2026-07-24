'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatCompactCurrency } from '../../lib/formatters';
import { useScoredProtocols } from '../../hooks/use-sentry-swr';

export const ProtocolsView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Server-grounded scores. Computing these in the browser would only ever
  // produce the scorer's ungrounded baseline.
  const { scored, asOf, isLoading, isError, mutate } = useScoredProtocols();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const q = search.toLowerCase();
  const filtered = scored.filter(
    ({ protocol: p }) =>
      p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Protocols</h2>
          <p className="text-sm text-slate-300 mt-1">
            Safety scores grounded in Pyth, Helius, DeFiLlama and GitHub.{' '}
            {asOf ? `As of ${new Date(asOf).toLocaleTimeString()}.` : 'Grounding…'}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search protocols..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {isError && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/70 text-sm text-amber-200">
          Could not load the scored protocol index. No scores are shown rather than stale or ungrounded ones.
        </div>
      )}

      {!isError && filtered.length === 0 && (
        <div className="p-8 text-center text-sm text-slate-400 bg-slate-950/70 rounded-xl border border-slate-800">
          {isLoading ? 'Grounding protocol scores from live sources…' : `No protocols match “${search}”.`}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(({ protocol, breakdown, sourcesLive }) => {
          const biz = breakdown.quant_metrics.business_ratios;
          const coverage = breakdown.factor_coverage;
          const dec = breakdown.agent_decision;

          return (
            <Card key={protocol.slug} padding="md" className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-extrabold text-cyan-300 text-base shrink-0">
                    {protocol.name.charAt(0)}
                  </div>
                  <div>
                    <Link href={`/dashboard/protocols/${protocol.slug}`} className="font-extrabold text-slate-100 hover:text-cyan-300 transition-colors block text-base">
                      {protocol.name}
                    </Link>
                    <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">{protocol.category}</span>
                  </div>
                </div>
                <Badge score={breakdown.composite_risk_score} />
              </div>

              {/* Only measured values appear here. Fields with no source read
                  "—" instead of the previous ||25 and ||5000 fallbacks. */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-sm">
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-xs">TVL</span>
                  <span className="font-bold text-slate-100 text-base">
                    {protocol.tvl_usd != null ? formatCompactCurrency(protocol.tvl_usd) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-xs">Category Share</span>
                  <span className="font-bold text-cyan-300 text-base">
                    {biz?.category_market_share_pct != null ? `${biz.category_market_share_pct}%` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-xs">Annual Fees</span>
                  <span className="font-bold text-slate-100 text-base">
                    {biz?.annualized_fee_usd != null ? formatCompactCurrency(biz.annualized_fee_usd) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-xs">Live Coverage</span>
                  <span className={`font-bold text-base ${coverage.weight_covered_pct >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {coverage.measured_factors}/{coverage.total_factors}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-sm">
                <span className="text-slate-300 font-semibold text-xs">Agent Action:</span>
                <Badge variant={dec.action === 'TAKE_POSITION' ? 'low' : dec.action === 'CHANGE_POSITION' ? 'medium' : 'critical'}>
                  {dec.action}
                </Badge>
              </div>

              {sourcesLive.length > 0 && (
                <p className="text-[11px] text-slate-500 font-mono">Grounded via {sourcesLive.join(', ')}</p>
              )}

              <div className="pt-2 flex justify-end">
                <Link href={`/dashboard/protocols/${protocol.slug}`}>
                  <Button variant="secondary" size="sm">
                    Analysis
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
