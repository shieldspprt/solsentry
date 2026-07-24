'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ProtocolRecord, ActionType } from '../../lib/types';
import { computeProtocolRisk } from '../../packages/core/src/risk-scorer';
import { evaluatePolicyRules } from '../../packages/core/src/policy-engine';
import { DEFAULT_POLICY_RULES } from '../../packages/core/src/constants';
import { formatCurrency, formatCompactCurrency } from '../../lib/formatters';
import { ProtocolBusinessRatiosSection } from './ProtocolBusinessRatiosSection';
import { ProtocolWebTelemetrySection } from './ProtocolWebTelemetrySection';
import { ProtocolDecisionSection } from './ProtocolDecisionSection';
import { useProtocolRisk } from '../../hooks/use-sentry-swr';

export interface ProtocolDetailViewProps {
  protocol: ProtocolRecord;
}

export const ProtocolDetailView: React.FC<ProtocolDetailViewProps> = ({ protocol }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'risk_factors' | 'program_verification'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const initialBreakdown = computeProtocolRisk(protocol);
  const { riskData, mutate } = useProtocolRisk(protocol.slug, initialBreakdown);
  const breakdown = riskData || initialBreakdown;

  const m = breakdown.quant_metrics;
  const pos = m.position_telemetry!;

  const [simAmount, setSimAmount] = useState(500);
  const [simAction, setSimAction] = useState<ActionType>('swap');
  const [simDailyVolume, setSimDailyVolume] = useState(0);

  const handleSyncTelemetry = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/v1/sync', { method: 'POST' });
      await mutate();
    } catch {
      await mutate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const simResult = evaluatePolicyRules(DEFAULT_POLICY_RULES, {
    action: simAction,
    protocolSlug: protocol.slug,
    amountUsd: simAmount,
    currentDailyVolumeUsd: simDailyVolume,
    protocolRiskScore: breakdown.composite_risk_score,
    isProtocolAudited: protocol.audit_status === 'audited',
    isOracleHealthy: breakdown.oracle_depeg_score >= 6,
  });
  const failClosed = breakdown.composite_risk_score < 5.0;
  const isSimAllowed = simResult.allowed && !failClosed;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Link href="/dashboard/protocols" className="text-sm font-semibold text-cyan-400 hover:underline inline-block">
            ← Back to Protocols Index
          </Link>
          <Button variant="secondary" size="sm" onClick={handleSyncTelemetry} disabled={isRefreshing}>
            {isRefreshing ? 'Syncing Live Telemetry...' : '↻ Sync Live Telemetry'}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-extrabold text-cyan-300 text-xl shrink-0">
              {protocol.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">{protocol.name}</h1>
                <Badge score={breakdown.composite_risk_score} />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-slate-300 font-semibold uppercase tracking-wider">Category: {protocol.category}</p>
                <span className="text-slate-600">•</span>
                <span className={`text-xs font-mono font-medium flex items-center gap-1.5 ${(m.data_freshness_pct || 0) > 50 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${(m.data_freshness_pct || 0) > 50 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                  {(m.data_freshness_pct || 0) > 50 ? '🟢 Live Pyth, Helius & DeFiLlama Telemetry' : '⚪ Model Baseline Estimate'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={breakdown.risk_tier === 'low' ? 'low' : breakdown.risk_tier === 'medium' ? 'medium' : 'critical'}>
              Verdict: {breakdown.action_recommendation}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Monitored TVL</span>
          <span className="text-3xl font-extrabold text-slate-100 mt-2 block">{formatCompactCurrency(protocol.tvl_usd)}</span>
          <span className="text-xs text-cyan-300 font-semibold mt-1 block">Institutional Liquidity</span>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Safety Score</span>
          <span className="text-3xl font-extrabold text-emerald-400 mt-2 block">{breakdown.composite_risk_score.toFixed(1)} / 10</span>
          <span className="text-xs text-emerald-300 font-semibold mt-1 block">{breakdown.risk_tier.toUpperCase()} Risk Rating</span>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Active Positions</span>
          <span className="text-3xl font-extrabold text-cyan-300 mt-2 block">{pos.total_open_positions.toLocaleString()}</span>
          <span className="text-xs text-amber-400 font-medium mt-1 block">{pos.positions_near_liquidation_count} Near Liquidation ({formatCompactCurrency(pos.positions_near_liquidation_usd)})</span>
        </Card>
      </div>

      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-2 text-sm font-extrabold transition-all border-b-2 ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Decision
        </button>
        <button
          onClick={() => setActiveTab('risk_factors')}
          className={`pb-3 px-2 text-sm font-extrabold transition-all border-b-2 ${
            activeTab === 'risk_factors'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Risk Factors & Telemetry
        </button>
        <button
          onClick={() => setActiveTab('program_verification')}
          className={`pb-3 px-2 text-sm font-extrabold transition-all border-b-2 ${
            activeTab === 'program_verification'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Policy Simulator & Verification
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <ProtocolDecisionSection breakdown={breakdown} />

          {breakdown.critical_warnings.length > 0 && (
            <Card title="Security Warnings">
              <div className="space-y-3">
                {breakdown.critical_warnings.map((warn, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-sm font-semibold text-rose-200">
                    Warning: {warn}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'risk_factors' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card padding="sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Audit</span>
              <span className="text-xl font-extrabold text-slate-100 mt-1 block">{breakdown.audit_governance_score} / 10</span>
              <span className="text-xs text-cyan-300 font-semibold mt-1 block">{m.upgradeability_timelock_hours}h Timelock</span>
            </Card>

            <Card padding="sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Liquidation</span>
              <span className="text-xl font-extrabold text-slate-100 mt-1 block">{breakdown.liquidation_rekt_score} / 10</span>
              <span className="text-xs text-rose-400 font-semibold mt-1 block">{pos.positions_near_liquidation_count} At Risk</span>
            </Card>

            <Card padding="sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">MEV & Bot</span>
              <span className="text-xl font-extrabold text-slate-100 mt-1 block">{breakdown.mev_bot_density_score} / 10</span>
              <span className="text-xs text-amber-400 font-semibold mt-1 block">{m.bot_density_pct}% Bot Vol</span>
            </Card>

            <Card padding="sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Web & Social</span>
              <span className="text-xl font-extrabold text-slate-100 mt-1 block">{breakdown.web_community_score} / 10</span>
              <span className="text-xs text-indigo-300 font-semibold mt-1 block">Community</span>
            </Card>

            <Card padding="sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Business Share</span>
              <span className="text-xl font-extrabold text-slate-100 mt-1 block">{breakdown.business_efficiency_score} / 10</span>
              <span className="text-xs text-emerald-300 font-semibold mt-1 block">Market Share</span>
            </Card>
          </div>

          <ProtocolBusinessRatiosSection protocol={protocol} />
          <ProtocolWebTelemetrySection protocol={protocol} />
        </div>
      )}

      {activeTab === 'program_verification' && (
        <div className="space-y-8">
          <Card title="Pre-Flight Policy Simulator" subtitle="Runs the real guardrail engine against this protocol's live safety score">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Transaction Amount (USD)" type="number" value={simAmount} onChange={(e) => setSimAmount(Number(e.target.value))} />
              <div>
                <label className="text-sm font-semibold text-slate-200 block mb-2">Action</label>
                <select
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value as ActionType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  {['swap', 'lend', 'borrow', 'lp', 'stake', 'perp_long', 'perp_short'].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <Input label="Daily Volume So Far (USD)" type="number" value={simDailyVolume} onChange={(e) => setSimDailyVolume(Number(e.target.value))} />
            </div>

            <div className={`mt-6 p-5 rounded-xl border text-sm ${isSimAllowed ? 'bg-emerald-950/80 border-emerald-700' : 'bg-rose-950/80 border-rose-700'}`}>
              <div className={`font-bold text-base mb-2 ${isSimAllowed ? 'text-emerald-300' : 'text-rose-300'}`}>
                {isSimAllowed ? 'PROCEED — passes all guardrails' : failClosed ? 'BLOCKED — safety score lower than 5.0' : 'BLOCKED — policy violation'}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-200 mt-2">
                <span>Max allowed now: <strong className="text-slate-100 font-mono">{formatCurrency(simResult.maxAllowedUsd)}</strong></span>
                <span>Safety score: <strong className="text-cyan-300 font-mono">{breakdown.composite_risk_score}/10</strong></span>
              </div>
            </div>
          </Card>

          <Card title="Program Verification & Audit Records" subtitle="Program addresses and security audit history">
            <div className="space-y-5 text-sm">
              <div>
                <span className="font-bold text-slate-200 uppercase block mb-2">Auditors:</span>
                <div className="flex flex-wrap gap-3">
                  {protocol.auditors && protocol.auditors.length > 0 ? (
                    protocol.auditors.map((auditor, idx) => (
                      <Badge key={idx} variant="info">{auditor}</Badge>
                    ))
                  ) : (
                    <span className="text-slate-400">No public auditors registered</span>
                  )}
                </div>
              </div>
              <div>
                <span className="font-bold text-slate-200 uppercase block mb-2">Program IDs:</span>
                <div className="space-y-2">
                  {protocol.program_ids?.map((pid, idx) => (
                    <a key={idx} href={`https://solscan.io/account/${pid}`} target="_blank" rel="noreferrer" className="font-mono text-cyan-300 hover:underline block break-all bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm">
                      {pid}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
