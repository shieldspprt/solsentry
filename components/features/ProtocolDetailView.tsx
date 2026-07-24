'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ProtocolRecord, ActionType, InstitutionalFactorsBreakdown } from '../../lib/types';
import { evaluatePolicyRules } from '../../packages/core/src/policy-engine';
import { DEFAULT_POLICY_RULES } from '../../packages/core/src/constants';
import { formatCurrency, formatCompactCurrency } from '../../lib/formatters';
import { ProtocolBusinessRatiosSection } from './ProtocolBusinessRatiosSection';
import { ProtocolWebTelemetrySection } from './ProtocolWebTelemetrySection';
import { ProtocolDecisionSection } from './ProtocolDecisionSection';

export interface ProtocolDetailViewProps {
  protocol: ProtocolRecord;
  /** Grounded server-side; the browser cannot reach the upstream sources. */
  breakdown: InstitutionalFactorsBreakdown;
  sourcesLive: string[];
  sourcesUnavailable: string[];
  registryError?: string | null;
}

export const ProtocolDetailView: React.FC<ProtocolDetailViewProps> = ({
  protocol,
  breakdown,
  sourcesLive,
  sourcesUnavailable,
  registryError,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'risk_factors' | 'program_verification'>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const coverage = breakdown.factor_coverage;
  const isGrounded = coverage.weight_covered_pct >= 60;

  const [simAmount, setSimAmount] = useState(500);
  const [simAction, setSimAction] = useState<ActionType>('swap');
  const [simDailyVolume, setSimDailyVolume] = useState(0);

  // Re-run the server render, which re-grounds every factor from source.
  const handleSyncTelemetry = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  const simResult = evaluatePolicyRules(DEFAULT_POLICY_RULES, {
    action: simAction,
    protocolSlug: protocol.slug,
    amountUsd: simAmount,
    currentDailyVolumeUsd: simDailyVolume,
    protocolRiskScore: breakdown.composite_risk_score,
    isProtocolAudited: protocol.audit_status === 'audited',
    // An unmeasured oracle factor is not evidence of health. Fail closed.
    isOracleHealthy: (breakdown.oracle_depeg_score ?? 0) >= 6,
  });
  // Fail closed on a low score *or* on too little evidence to judge one.
  const failClosed = breakdown.composite_risk_score < 5.0 || !isGrounded;
  const isSimAllowed = simResult.allowed && !failClosed;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Link href="/dashboard/protocols" className="text-sm font-semibold text-cyan-400 hover:underline inline-block">
            ← Back to Protocols Index
          </Link>
          <Button variant="secondary" size="sm" onClick={handleSyncTelemetry} disabled={isRefreshing}>
            {isRefreshing ? 'Re-grounding…' : '↻ Re-ground from sources'}
          </Button>
        </div>

        {registryError && (
          <div className="mb-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/70 text-xs text-amber-200">
            <strong className="font-bold">Protocol registry unavailable</strong> ({registryError}). Showing the bundled protocol
            record; audit status and program IDs may be out of date. Live factors below are unaffected.
          </div>
        )}

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
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <p className="text-sm text-slate-300 font-semibold uppercase tracking-wider">Category: {protocol.category}</p>
                <span className="text-slate-600">•</span>
                {/* Driven by real factor provenance, not a stored constant. */}
                <span className={`text-xs font-mono font-medium flex items-center gap-1.5 ${isGrounded ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${isGrounded ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  {coverage.measured_factors}/{coverage.total_factors} factors live ({coverage.weight_covered_pct}% of model weight)
                </span>
                {sourcesLive.length > 0 && (
                  <span className="text-[11px] text-slate-500 font-mono">via {sourcesLive.join(', ')}</span>
                )}
                {sourcesUnavailable.length > 0 && (
                  <span className="text-[11px] text-slate-600 font-mono">unavailable: {sourcesUnavailable.join(', ')}</span>
                )}
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
          <span className="text-xs text-emerald-300 font-semibold mt-1 block">
            {breakdown.risk_tier.toUpperCase()} Risk · band {breakdown.confidence?.score_band_low.toFixed(1)}–
            {breakdown.confidence?.score_band_high.toFixed(1)}
          </span>
        </Card>

        {/* Protocol-wide open-position counts used to be TVL ÷ 42,000. Real
            position risk is read per wallet on the Positions page. */}
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Your Position Risk</span>
          <span className="text-3xl font-extrabold text-cyan-300 mt-2 block">—</span>
          <Link href="/dashboard/positions" className="text-xs text-cyan-400 font-medium mt-1 block hover:underline">
            Scan a wallet to read real on-chain positions →
          </Link>
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
          {/* One tile per factor, driven off the same FactorScore[] the
              composite uses — so an unmeasured factor cannot show a number. */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {(breakdown.factors || []).map((f) => (
              <Card key={f.key} padding="sm">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{f.label}</span>
                <span className={`text-xl font-extrabold mt-1 block ${f.measured ? 'text-slate-100' : 'text-slate-600'}`}>
                  {f.measured && f.score != null ? `${f.score.toFixed(1)} / 10` : '—'}
                </span>
                <span className={`text-xs font-semibold mt-1 block ${f.measured ? 'text-cyan-300' : 'text-slate-500'}`}>
                  {f.measured && f.value != null ? `${f.value} ${f.unit}` : 'Not measured'}
                </span>
              </Card>
            ))}
          </div>

          <ProtocolBusinessRatiosSection breakdown={breakdown} category={protocol.category} />
          <ProtocolWebTelemetrySection breakdown={breakdown} />
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
                {isSimAllowed
                  ? 'PROCEED — passes all guardrails'
                  : !isGrounded
                  ? `BLOCKED — only ${coverage.weight_covered_pct}% of the risk model is grounded`
                  : breakdown.composite_risk_score < 5.0
                  ? 'BLOCKED — safety score lower than 5.0'
                  : 'BLOCKED — policy violation'}
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
