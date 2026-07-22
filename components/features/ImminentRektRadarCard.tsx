'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PositionRecord } from '../../lib/types';
import { formatCurrency } from '../../lib/formatters';
import { stressPosition } from '../../packages/core/src/stress-engine';
import { EnableAlertsButton } from './EnableAlertsButton';

export interface ImminentRektRadarCardProps {
  positions: PositionRecord[];
}

export const ImminentRektRadarCard: React.FC<ImminentRektRadarCardProps> = ({ positions }) => {
  // Rank by proximity to liquidation, not a flat threshold — the closest
  // positions are the ones a manager must act on first.
  const atRisk = positions
    .filter((p) => p.health_factor != null && p.health_factor <= 1.35)
    .map((p) => ({ pos: p, stress: stressPosition(p, 0) }))
    .sort((a, b) => (a.pos.health_factor || 0) - (b.pos.health_factor || 0));

  return (
    <Card
      title="Imminent Rekt Radar"
      subtitle="Ranked by distance to liquidation, with the exact action size to restore safety"
      action={<EnableAlertsButton />}
    >
      {atRisk.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-300 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
          <span className="font-bold text-emerald-400 text-base block">All Monitored Positions Operating Safely</span>
          <p className="text-slate-400">No positions within range of their liquidation threshold.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {atRisk.map(({ pos, stress }) => {
            const hf = pos.health_factor || 0;
            const critical = hf <= 1.1;
            const buffer = stress.price_buffer_pct;
            const hours = stress.hours_to_liquidation_est;
            return (
              <div
                key={pos.id}
                className={`p-5 rounded-xl border flex flex-col gap-4 text-sm ${
                  critical ? 'bg-rose-950/40 border-rose-800/80' : 'bg-amber-950/30 border-amber-800/70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-100 uppercase font-mono text-base">{pos.protocol_slug}</span>
                    <Badge variant={critical ? 'critical' : 'medium'}>HF {hf.toFixed(2)}</Badge>
                    <span className="text-slate-300 text-xs">
                      {pos.asset} · {formatCurrency(pos.amount_usd)}
                    </span>
                  </div>
                  <a href="/dashboard/positions">
                    <Button variant={critical ? 'danger' : 'secondary'} size="sm">
                      {critical ? 'De-leverage Now' : 'Review Position'}
                    </Button>
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/70">
                    <div className="text-slate-500 uppercase tracking-wide">Price Buffer</div>
                    <div className="text-slate-100 font-mono font-bold text-sm">
                      {buffer != null ? `${buffer.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/70">
                    <div className="text-slate-500 uppercase tracking-wide">Est. Time to Liq</div>
                    <div className="text-slate-100 font-mono font-bold text-sm">
                      {hours != null ? `~${hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`}` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/70">
                    <div className="text-slate-500 uppercase tracking-wide">Liq. Price</div>
                    <div className="text-slate-100 font-mono font-bold text-sm">
                      {pos.liquidation_price != null ? `$${pos.liquidation_price}` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-2.5 border border-emerald-900/50">
                    <div className="text-emerald-500/80 uppercase tracking-wide">Add to Restore</div>
                    <div className="text-emerald-300 font-mono font-bold text-sm">
                      {stress.action_size_usd_to_target != null ? formatCurrency(stress.action_size_usd_to_target) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
