import React from 'react';
import { DashboardView } from '../../components/features/DashboardView';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../lib/default-protocols';
import { DEFAULT_SOLANA_POSITIONS } from '../../lib/default-positions';

export default function DashboardPage() {
  const epochData = {
    epoch: 654,
    slotIndex: 214500,
    slotsInEpoch: 432000,
    epochProgressPct: 49.65,
    absoluteSlot: 289410200,
    blockHeight: 271040500,
    slotLatencyMs: 180,
  };

  return (
    <DashboardView
      protocols={DEFAULT_SOLANA_PROTOCOLS}
      positions={DEFAULT_SOLANA_POSITIONS}
      agentCount={4}
      recentChecksCount={1420}
      epochData={epochData}
    />
  );
}
