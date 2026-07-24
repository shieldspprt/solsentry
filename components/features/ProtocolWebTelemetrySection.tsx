'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { InstitutionalFactorsBreakdown } from '../../lib/types';

export interface ProtocolWebTelemetrySectionProps {
  /** The live breakdown from the risk-check call — never recomputed locally. */
  breakdown: InstitutionalFactorsBreakdown;
}

const Metric: React.FC<{ label: string; value: string; sub: string; tone?: string }> = ({
  label,
  value,
  sub,
  tone = 'text-slate-100',
}) => (
  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
    <span className="text-slate-400 font-semibold uppercase text-xs block">{label}</span>
    <span className={`text-2xl font-extrabold mt-2 block ${tone}`}>{value}</span>
    <span className="text-xs text-slate-300 mt-1 block">{sub}</span>
  </div>
);

export const ProtocolWebTelemetrySection: React.FC<ProtocolWebTelemetrySectionProps> = ({ breakdown }) => {
  const web = breakdown.quant_metrics.web_community;
  const coverage = breakdown.factor_coverage;
  const commits = web?.developer_commits_30d ?? null;
  const devs = web?.active_devs_count ?? null;
  const measured = commits != null && devs != null;

  return (
    <Card
      title="Developer Activity"
      subtitle="Commit flow and distinct contributors over the last 30 days, read from the protocol's public GitHub organisation"
    >
      {!measured ? (
        <div className="p-6 text-center text-sm bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
          <span className="font-bold text-slate-200 block">Not measured</span>
          <p className="text-slate-400">No public GitHub organisation is mapped for this protocol, or the API was unreachable.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <Metric
            label="Commits (30d)"
            value={commits.toLocaleString()}
            sub={`Across ${web?.repos_sampled ?? 0} most recently pushed repos`}
            tone="text-indigo-300"
          />
          <Metric
            label="Active Contributors"
            value={devs.toLocaleString()}
            sub="Distinct commit authors, 30d"
            tone="text-cyan-300"
          />
          <Metric label="GitHub Org" value={web?.github_org || '—'} sub="Source: github.com" />
          <Metric
            label="Model Coverage"
            value={`${coverage.weight_covered_pct}%`}
            sub={`${coverage.measured_factors}/${coverage.total_factors} factors measured`}
            tone={coverage.weight_covered_pct >= 60 ? 'text-emerald-400' : 'text-amber-400'}
          />
        </div>
      )}

      <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
        Monthly web visits, domain trust and social sentiment were previously shown here. No code ever fetched them — they were
        constants — so they have been removed rather than left unsourced.
      </p>
    </Card>
  );
};
