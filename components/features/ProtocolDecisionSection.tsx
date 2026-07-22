'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { InstitutionalFactorsBreakdown, FactorScore } from '../../lib/types';

export interface ProtocolDecisionSectionProps {
  breakdown: InstitutionalFactorsBreakdown;
}

const SOURCE_LABEL: Record<string, string> = {
  pyth: 'Pyth Oracle',
  helius: 'Helius RPC',
  onchain: 'Solana Onchain',
  defillama: 'DeFiLlama',
  jito: 'Jito MEV',
  derived: 'Quantitative Derived',
  model_default: 'Baseline Default',
};

function scoreColor(score: number): string {
  if (score >= 8.5) return 'bg-emerald-400';
  if (score >= 7) return 'bg-cyan-400';
  if (score >= 5) return 'bg-amber-400';
  return 'bg-rose-400';
}

const FactorBar: React.FC<{ factor: FactorScore }> = ({ factor }) => {
  const live = factor.source !== 'model_default';
  return (
    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-100 font-bold">{factor.label}</span>
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 rounded-lg text-xs uppercase font-semibold ${
              live ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-slate-900 text-slate-400 border border-slate-700'
            }`}
          >
            {SOURCE_LABEL[factor.source] || factor.source}
          </span>
          <span className="text-slate-100 font-mono font-extrabold text-base">{factor.score.toFixed(1)} / 10</span>
        </div>
      </div>
      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div className={`h-full rounded-full ${scoreColor(factor.score)}`} style={{ width: `${factor.score * 10}%` }} />
      </div>
      <p className="text-xs text-slate-300 leading-normal">{factor.rationale}</p>
    </div>
  );
};

export const ProtocolDecisionSection: React.FC<ProtocolDecisionSectionProps> = ({ breakdown }) => {
  const dec = breakdown.agent_decision;
  const isTake = dec.action === 'TAKE_POSITION';
  const isChange = dec.action === 'CHANGE_POSITION';
  const conf = breakdown.confidence;
  const trend = breakdown.trend;
  const factors = breakdown.factors || [];

  return (
    <Card title="Decision Analysis" subtitle="Plain English automated AI decision breakdown and score rationale">
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">AI Recommendation:</span>
              <Badge variant={isTake ? 'low' : isChange ? 'medium' : 'critical'}>{dec.action}</Badge>
            </div>
            <div className="text-sm font-mono text-cyan-300">
              Confidence Score: <strong className="text-slate-100 font-bold text-base">{dec.confidence_score}%</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-200 leading-relaxed">
            <strong className="text-slate-100 block font-bold mb-1 text-base">Primary Rationale:</strong>
            {dec.primary_reason}
          </div>

          {conf && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Safety Score</span>
                <span className="text-xl font-extrabold text-slate-100 font-mono mt-1 block">{breakdown.composite_risk_score.toFixed(1)} / 10</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">Confidence Band</span>
                <span className="text-sm font-bold text-cyan-300 font-mono mt-1 block">
                  {conf.score_band_low.toFixed(1)} to {conf.score_band_high.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase block">7 Day Trend</span>
                <span className={`text-sm font-bold mt-1 block ${trend?.direction === 'improving' ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {trend?.direction === 'improving' ? 'Improving' : trend?.direction === 'deteriorating' ? 'Deteriorating' : 'Stable'}
                </span>
              </div>
            </div>
          )}
        </div>

        {factors.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-base font-extrabold text-slate-100">Score Factor Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {factors.map((f) => (
                <FactorBar key={f.key} factor={f} />
              ))}
            </div>
          </div>
        )}

        {breakdown.what_would_flip && breakdown.what_would_flip.conditions.length > 0 && (
          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
            <strong className="text-slate-200 block text-sm font-bold">What Would Change This Decision:</strong>
            {breakdown.what_would_flip.conditions.map((c, i) => (
              <div key={i} className="text-slate-300 text-sm">
                • {c}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
