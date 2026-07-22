'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { ProtocolRecord } from '../../lib/types';

export interface ProtocolWebTelemetrySectionProps {
  protocol: ProtocolRecord;
}

export const ProtocolWebTelemetrySection: React.FC<ProtocolWebTelemetrySectionProps> = ({ protocol }) => {
  const m = protocol.institutional_metrics;
  const web = m?.web_community || {
    monthly_web_visits: 350000,
    domain_trust_score: 94,
    social_sentiment_score: 86,
    developer_commits_30d: 120,
    active_devs_count: 15,
  };

  return (
    <Card title="Web & Developer Telemetry" subtitle="Web traffic, social sentiment, domain security, and GitHub developer metrics">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Monthly Web Visits</span>
          <span className="text-2xl font-extrabold text-slate-100 mt-2 block">{web.monthly_web_visits.toLocaleString()}</span>
          <span className="text-xs text-cyan-300 mt-1 block">Domain Trust: {web.domain_trust_score}/100</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Social Sentiment</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-2 block">{web.social_sentiment_score} / 100</span>
          <span className="text-xs text-slate-300 mt-1 block">Community Bullishness</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">GitHub Commits (30d)</span>
          <span className="text-2xl font-extrabold text-indigo-300 mt-2 block">{web.developer_commits_30d} Commits</span>
          <span className="text-xs text-slate-300 mt-1 block">{web.active_devs_count} Core Devs</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-slate-400 font-semibold uppercase text-xs block">Data Freshness</span>
          <span className="text-2xl font-extrabold text-cyan-300 mt-2 block">{m?.data_freshness_pct || 99.2}%</span>
          <span className="text-xs text-slate-300 mt-1 block font-mono">Pyth Oracle Telemetry</span>
        </div>
      </div>
    </Card>
  );
};
