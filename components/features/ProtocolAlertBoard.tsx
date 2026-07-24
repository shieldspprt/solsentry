'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ScoredProtocol } from '../../hooks/use-sentry-swr';

export interface ProtocolAlertBoardProps {
  scored: ScoredProtocol[];
  isLoading: boolean;
}

// Replaces the epoch/slot-height card, which showed live data that answered no
// question a risk manager or agent actually has. This surfaces the protocols the
// engine is currently gating and why — the one thing on the overview that should
// change what someone does next.
export const ProtocolAlertBoard: React.FC<ProtocolAlertBoardProps> = ({ scored, isLoading }) => {
  const gated = scored
    .filter((s) => s.breakdown.action_recommendation === 'block' || s.breakdown.action_recommendation === 'avoid')
    .sort((a, b) => a.breakdown.composite_risk_score - b.breakdown.composite_risk_score);

  return (
    <Card
      title="Protocols Requiring Action"
      subtitle="Verdicts of avoid or block, worst first — driven by realized exploit history, not by score alone"
    >
      {isLoading && scored.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">Grounding protocol risk…</div>
      ) : gated.length === 0 ? (
        <div className="p-8 text-center text-sm bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1">
          <span className="font-bold text-emerald-400 text-base block">No protocol is currently gated</span>
          <p className="text-slate-400">
            All {scored.length} tracked protocols are clear of the avoid and block thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gated.map(({ protocol, breakdown }) => {
            const blocked = breakdown.action_recommendation === 'block';
            const ih = breakdown.quant_metrics.incident_history;
            return (
              <Link
                key={protocol.slug}
                href={`/dashboard/protocols/${protocol.slug}`}
                className={`block p-4 rounded-xl border ${
                  blocked ? 'bg-rose-950/40 border-rose-800/80' : 'bg-amber-950/30 border-amber-800/70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-100 uppercase font-mono text-sm">{protocol.slug}</span>
                    <Badge variant={blocked ? 'critical' : 'medium'}>{breakdown.action_recommendation}</Badge>
                    <span className="text-xs text-slate-400 font-mono">{breakdown.composite_risk_score}/10</span>
                  </div>
                  {ih?.most_recent_age_days != null && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      {ih.most_recent_age_days}d ago
                    </span>
                  )}
                </div>
                {ih?.most_recent_name && (
                  <p className={`text-xs mt-2 leading-relaxed ${blocked ? 'text-rose-200' : 'text-amber-200'}`}>
                    {ih.most_recent_name}
                    {ih.most_recent_amount_usd != null && ` — $${(ih.most_recent_amount_usd / 1_000_000).toFixed(1)}M`}
                    {ih.most_recent_technique && ` via ${ih.most_recent_technique}`}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
};
