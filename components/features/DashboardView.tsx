'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatTile } from '../ui/StatTile';
import { ProtocolRecord, PositionRecord } from '../../lib/types';
import { SolanaEpochData } from '../../packages/core/src/data-fetchers/helius';
import { SolanaEpochProgressCard } from './SolanaEpochProgressCard';
import { ImminentRektRadarCard } from './ImminentRektRadarCard';
import { formatCompactCurrency } from '../../lib/formatters';
import { computeProtocolRisk } from '../../packages/core/src/risk-scorer';

export interface DashboardViewProps {
  protocols: ProtocolRecord[];
  positions?: PositionRecord[];
  agentCount: number;
  recentChecksCount: number;
  epochData: SolanaEpochData;
}

function decisionVariant(action: string): 'low' | 'medium' | 'critical' {
  return action === 'TAKE_POSITION' ? 'low' : action === 'CHANGE_POSITION' ? 'medium' : 'critical';
}

function decisionLabel(action: string): string {
  return action === 'TAKE_POSITION' ? 'Safe to enter' : action === 'CHANGE_POSITION' ? 'Caution' : 'Avoid';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  protocols,
  positions = [],
  agentCount,
  recentChecksCount,
  epochData,
}) => {
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const totalTvl = protocols.reduce((acc, p) => acc + (p.tvl_usd || 0), 0);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/v1/sync', { method: 'POST' });
      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      setIsSyncing(false);
    }
  };

  const filtered = protocols.filter((p) =>
    `${p.name} ${p.slug} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">Overview</h1>
          <p className="text-[14px] sm:text-[15px] text-slate-400 mt-1">Live Solana risk scoring & AI recommendations</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleSync} disabled={isSyncing} className="self-start sm:self-auto">
          {isSyncing ? 'Syncing…' : '↻ Sync Live Data'}
        </Button>
      </div>

      {/* Key stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Monitored TVL" value={formatCompactCurrency(totalTvl)} subtitle={`${protocols.length} protocols`} accent="cyan" />
        <StatTile label="Registered Agents" value={agentCount} subtitle="protected" accent="emerald" />
        <StatTile label="Risk Queries" value={recentChecksCount} subtitle="checks run" accent="indigo" />
        <StatTile label="Data Freshness" value="99.8%" subtitle="on-chain" accent="emerald" />
      </div>

      {/* Priority cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SolanaEpochProgressCard epochData={epochData} />
        <ImminentRektRadarCard positions={positions} />
      </div>

      {/* Protocol list — responsive rows (no cramped table) */}
      <Card
        title="Protocol Risk Index"
        subtitle="Tap any protocol for the full decision breakdown"
        action={
          <div className="w-40 sm:w-64">
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        }
      >
        <div className="space-y-2.5">
          {filtered.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">No protocols match “{search}”.</p>
          )}
          {filtered.map((p) => {
            const breakdown = computeProtocolRisk(p);
            const dec = breakdown.agent_decision.action;
            return (
              <Link
                key={p.slug}
                href={`/dashboard/protocols/${p.slug}`}
                className="glass-card hover-lift rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4"
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/10 border border-cyan-400/25 flex items-center justify-center font-bold text-cyan-200 shrink-0">
                  {p.name.charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-50 text-[15px] sm:text-base truncate">{p.name}</div>
                  <div className="text-[13px] text-slate-400 capitalize">{p.category}</div>
                </div>

                <div className="hidden sm:block text-right shrink-0">
                  <div className="font-mono font-bold text-slate-100 text-[15px]">{formatCompactCurrency(p.tvl_usd)}</div>
                  <div className="text-[12px] text-slate-500">TVL</div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge score={breakdown.composite_risk_score} size="sm" />
                  <Badge variant={decisionVariant(dec)} size="sm">{decisionLabel(dec)}</Badge>
                </div>

                <svg className="w-5 h-5 text-slate-600 shrink-0 hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
