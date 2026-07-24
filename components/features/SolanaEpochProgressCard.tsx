'use client';

import React from 'react';
import { Card } from '../ui/Card';
import { SolanaEpochData } from '../../packages/core/src/data-fetchers/helius';

export interface SolanaEpochProgressCardProps {
  epochData: SolanaEpochData | null;
}

export const SolanaEpochProgressCard: React.FC<SolanaEpochProgressCardProps> = ({ epochData }) => {
  if (!epochData) {
    return (
      <Card padding="md" title="Epoch Telemetry" subtitle="Live epoch slot progress and RPC round-trip time">
        <div className="p-8 text-center text-sm bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
          <span className="font-bold text-amber-300 text-base block">Solana RPC unreachable</span>
          <p className="text-slate-400">No epoch data is being received. Check the configured RPC endpoint.</p>
        </div>
      </Card>
    );
  }

  const slotsRemaining = epochData.slotsInEpoch - epochData.slotIndex;
  const hoursRemaining = (slotsRemaining * 0.45 / 3600).toFixed(1);

  return (
    <Card padding="md" title="Epoch Telemetry" subtitle="Live epoch slot progress and RPC round-trip time">
      <div className="space-y-6">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-slate-400 font-semibold uppercase tracking-wider block text-xs">Current Epoch</span>
            <span className="text-2xl font-extrabold text-slate-100 font-mono mt-1 block">Epoch #{epochData.epoch}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 font-semibold uppercase tracking-wider block text-xs">Estimated Time Remaining</span>
            <span className="text-2xl font-extrabold text-cyan-300 font-mono mt-1 block">~{hoursRemaining} Hours</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-slate-200">Epoch Progress</span>
            <span className="text-cyan-300 font-mono font-extrabold text-base">{epochData.epochProgressPct}%</span>
          </div>
          <div className="w-full h-4 rounded-full bg-slate-950 overflow-hidden border border-slate-800 p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              style={{ width: `${epochData.epochProgressPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm pt-2">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-400 font-semibold uppercase text-xs block">Slot Height</span>
            <span className="font-mono font-bold text-slate-100 text-base mt-1 block">{epochData.absoluteSlot.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-400 font-semibold uppercase text-xs block">Block Height</span>
            <span className="font-mono font-bold text-slate-100 text-base mt-1 block">{epochData.blockHeight.toLocaleString()}</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-slate-400 font-semibold uppercase text-xs block">RPC Round-Trip</span>
            <span className="font-mono font-bold text-emerald-400 text-base mt-1 block">{epochData.slotLatencyMs} ms</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
