'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatTile } from '../ui/StatTile';
import { ProtocolRecord } from '../../lib/types';
import { SolanaEpochData } from '../../packages/core/src/data-fetchers/helius';
import { SolanaEpochProgressCard } from './SolanaEpochProgressCard';
import { ImminentRektRadarCard } from './ImminentRektRadarCard';
import { formatCompactCurrency } from '../../lib/formatters';
import { usePositions, useScoredProtocols } from '../../hooks/use-sentry-swr';

export interface DashboardViewProps {
  protocols: ProtocolRecord[];
  agentCount: number | null;
  recentChecksCount: number | null;
  epochData: SolanaEpochData | null;
}

function decisionVariant(action: string): 'low' | 'medium' | 'critical' {
  return action === 'TAKE_POSITION' ? 'low' : action === 'CHANGE_POSITION' ? 'medium' : 'critical';
}

function decisionLabel(action: string): string {
  return action === 'TAKE_POSITION' ? 'Safe to enter' : action === 'CHANGE_POSITION' ? 'Caution' : 'Avoid';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  protocols: initialProtocols,
  agentCount,
  recentChecksCount,
  epochData,
}) => {
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { publicKey } = useWallet();
  // Scores are grounded server-side; the browser cannot reach Pyth, Helius,
  // DeFiLlama or GitHub itself.
  const { scored, asOf, isLoading, registryError, mutate: mutateScored } = useScoredProtocols();
  const { positions, hasWallet } = usePositions(publicKey?.toBase58() || null);

  const rows = scored.length > 0 ? scored : initialProtocols.map((protocol) => ({ protocol, breakdown: null }));
  const totalTvl = rows.reduce((acc, r) => acc + (r.protocol.tvl_usd || 0), 0);

  // Real factor coverage across the index: how much of the model is actually
  // grounded right now. This replaces the fixed "99.8% Data Freshness".
  const coverage = scored.reduce(
    (acc, r) => ({
      live: acc.live + r.breakdown.factor_coverage.measured_factors,
      total: acc.total + r.breakdown.factor_coverage.total_factors,
    }),
    { live: 0, total: 0 }
  );
  const coveragePct = coverage.total > 0 ? Math.round((coverage.live / coverage.total) * 100) : 0;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/v1/sync', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSyncError(body?.message || `Sync failed (HTTP ${res.status}). Live scores below are still refreshed on every load.`);
      }
      await mutateScored();
    } catch (err) {
      setSyncError((err as Error).message || 'Sync request failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filtered = rows.filter((r) =>
    `${r.protocol.name} ${r.protocol.slug} ${r.protocol.category}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">Overview</h1>
          <p className="text-[14px] sm:text-[15px] text-slate-400 mt-1">Solana protocol risk scoring, grounded in live sources</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleSync} disabled={isSyncing} className="self-start sm:self-auto">
          {isSyncing ? 'Syncing…' : '↻ Sync Live Data'}
        </Button>
      </div>

      {syncError && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/70 text-xs text-amber-200">
          <strong className="font-bold">Sync did not complete:</strong> {syncError}
        </div>
      )}

      {/* A dead datastore used to be invisible: every read was wrapped in a
          bare catch that substituted constants. Now it says so. */}
      {registryError && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/70 text-xs text-amber-200">
          <strong className="font-bold">Datastore unavailable</strong> ({registryError}). Protocol records come from the bundled
          registry and stored counts read “—”. Live risk factors below are computed from external sources and are unaffected.
        </div>
      )}

      {/* Key stats — 2 cols on mobile, 4 on desktop. A null count means the
          store is unreachable; show "—" rather than inventing a number. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Monitored TVL" value={formatCompactCurrency(totalTvl)} subtitle={`${rows.length} protocols`} accent="cyan" />
        <StatTile
          label="Registered Agents"
          value={agentCount ?? '—'}
          subtitle={agentCount == null ? 'store unavailable' : 'protected'}
          accent="emerald"
        />
        <StatTile
          label="Risk Queries"
          value={recentChecksCount ?? '—'}
          subtitle={recentChecksCount == null ? 'store unavailable' : 'checks run'}
          accent="indigo"
        />
        <StatTile
          label="Live Factor Coverage"
          value={coverage.total > 0 ? `${coveragePct}%` : '—'}
          subtitle={coverage.total > 0 ? `${coverage.live}/${coverage.total} factors grounded` : isLoading ? 'grounding…' : 'no live data'}
          accent={coveragePct >= 50 ? 'emerald' : 'cyan'}
        />
      </div>

      {/* Priority cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SolanaEpochProgressCard epochData={epochData} />
        <ImminentRektRadarCard positions={positions} hasWallet={hasWallet} />
      </div>

      {/* Protocol list — responsive rows (no cramped table) */}
      <Card
        title="Protocol Risk Index"
        subtitle={
          asOf
            ? `Scores grounded server-side · as of ${new Date(asOf).toLocaleTimeString()}`
            : 'Grounding scores from live sources…'
        }
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
          {filtered.map(({ protocol: p, breakdown }) => {
            const dec = breakdown?.agent_decision.action;
            const cov = breakdown?.factor_coverage;
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
                  <div className="text-[13px] text-slate-400 capitalize">
                    {p.category}
                    {cov && <span className="text-slate-500"> · {cov.measured_factors}/{cov.total_factors} factors live</span>}
                  </div>
                </div>

                <div className="hidden sm:block text-right shrink-0">
                  <div className="font-mono font-bold text-slate-100 text-[15px]">
                    {p.tvl_usd != null ? formatCompactCurrency(p.tvl_usd) : '—'}
                  </div>
                  <div className="text-[12px] text-slate-500">TVL</div>
                </div>

                {/* Until the grounded score arrives, no score is shown — a
                    locally-computed one would be an ungrounded placeholder. */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {breakdown ? (
                    <>
                      <Badge score={breakdown.composite_risk_score} size="sm" />
                      <Badge variant={decisionVariant(dec!)} size="sm">{decisionLabel(dec!)}</Badge>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">scoring…</span>
                  )}
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
