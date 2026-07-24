'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ProtocolRecord } from '../../lib/types';
import { computeProtocolRisk } from '../../packages/core/src/risk-scorer';
import { formatCompactCurrency } from '../../lib/formatters';
import { useProtocols } from '../../hooks/use-sentry-swr';

export interface ProtocolsViewProps {
  protocols: ProtocolRecord[];
}

export const ProtocolsView: React.FC<ProtocolsViewProps> = ({ protocols: initialProtocols }) => {
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { protocols, mutate } = useProtocols(initialProtocols);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/v1/sync', { method: 'POST' });
      await mutate();
    } catch {
      await mutate();
    } finally {
      setIsSyncing(false);
    }
  };

  const filtered = protocols.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Protocols</h2>
          <p className="text-sm text-slate-300 mt-1">Real time security, business share ratios, web stats, and AI decision metrics</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search protocols..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Sync Live'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((protocol) => {
          const breakdown = computeProtocolRisk(protocol);
          const biz = breakdown.quant_metrics.business_ratios;
          const pos = breakdown.quant_metrics.position_telemetry;
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

              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-sm">
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-xs">TVL</span>
                  <span className="font-bold text-slate-100 text-base">{formatCompactCurrency(protocol.tvl_usd)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-xs">Category Share</span>
                  <span className="font-bold text-cyan-300 text-base">{biz?.category_market_share_pct || 25}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-xs">Open Positions</span>
                  <span className="font-bold text-slate-100 text-base">{(pos?.total_open_positions || 5000).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-xs">Imminent Rekts</span>
                  <span className={`font-bold text-base ${(pos?.positions_near_liquidation_count || 0) > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {pos?.positions_near_liquidation_count || 0}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-sm">
                <span className="text-slate-300 font-semibold text-xs">Agent Action:</span>
                <Badge variant={dec.action === 'TAKE_POSITION' ? 'low' : dec.action === 'CHANGE_POSITION' ? 'medium' : 'critical'}>
                  {dec.action}
                </Badge>
              </div>

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
