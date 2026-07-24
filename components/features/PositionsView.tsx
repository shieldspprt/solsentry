'use client';

import React from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DataTable, Column } from '../ui/DataTable';
import { PositionRecord } from '../../lib/types';
import { formatCurrency, formatCompactCurrency } from '../../lib/formatters';
import { evaluatePositionHealth } from '../../packages/core/src/position-monitor';
import { stressPosition } from '../../packages/core/src/stress-engine';
import { LiveWalletPositions } from './LiveWalletPositions';
import { usePositions } from '../../hooks/use-sentry-swr';

export interface PositionsViewProps {
  /** Optional override; normally positions come from the connected wallet. */
  walletAddress?: string;
}

// Where a user actually performs the de-leverage. SolSentry computes the size;
// the protocol's own app executes it. We never build the transaction ourselves.
const PROTOCOL_APP_URLS: Record<string, string> = {
  kamino: 'https://app.kamino.finance/',
  drift: 'https://app.drift.trade/',
  jupiter: 'https://jup.ag/',
  orca: 'https://www.orca.so/',
  raydium: 'https://raydium.io/',
  meteora: 'https://app.meteora.ag/',
  marinade: 'https://marinade.finance/',
  jito: 'https://www.jito.network/',
};

export const PositionsView: React.FC<PositionsViewProps> = ({ walletAddress }) => {
  const { publicKey } = useWallet();
  const effectiveWallet = walletAddress || publicKey?.toBase58() || null;
  const { positions, hasWallet } = usePositions(effectiveWallet);

  const evaluations = positions.map((p) => ({
    position: p,
    eval: evaluatePositionHealth(p),
  }));

  const imminentCount = evaluations.filter((e) => e.eval.isLiquidationRisk).length;
  const imminentUsd = evaluations
    .filter((e) => e.eval.isLiquidationRisk)
    .reduce((acc, e) => acc + (e.position.amount_usd || 0), 0);

  const columns: Column<PositionRecord>[] = [
    {
      key: 'protocol_slug',
      header: 'Protocol',
      render: (row) => (
        <Link href={`/dashboard/protocols/${row.protocol_slug}`} className="font-extrabold text-slate-100 hover:text-cyan-300 uppercase font-mono text-sm">
          {row.protocol_slug}
        </Link>
      ),
    },
    {
      key: 'asset',
      header: 'Asset & Type',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-100 block text-base">{row.asset}</span>
          <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">{row.position_type}</span>
        </div>
      ),
    },
    {
      key: 'amount_usd',
      header: 'Value',
      render: (row) => <span className="font-mono text-sm font-bold text-slate-100">{formatCurrency(row.amount_usd)}</span>,
    },
    {
      key: 'health_factor',
      header: 'Health Factor',
      render: (row) => (
        <span className={`font-extrabold font-mono text-base ${row.health_factor && row.health_factor <= 1.15 ? 'text-rose-400' : row.health_factor && row.health_factor <= 1.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {row.health_factor ? row.health_factor.toFixed(2) : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Recommended Action',
      align: 'right',
      render: (row) => {
        const ev = evaluatePositionHealth(row);
        const isActionNeeded = ev.agentAction !== 'HOLD';
        // Collateral to add / debt to repay to restore a safe health factor.
        const size = stressPosition(row, 0).action_size_usd_to_target;
        const appUrl = PROTOCOL_APP_URLS[row.protocol_slug];

        return (
          <div className="flex items-center justify-end gap-3">
            {isActionNeeded && size != null && (
              <span className="text-xs text-slate-400">
                Add <strong className="text-emerald-300 font-mono">{formatCurrency(size)}</strong> to reach HF 1.50
              </span>
            )}
            <Badge variant={ev.agentAction === 'SELL_POSITION' ? 'critical' : ev.agentAction === 'CHANGE_POSITION' ? 'medium' : 'low'}>
              {ev.agentAction}
            </Badge>
            {isActionNeeded && appUrl && (
              <a href={appUrl} target="_blank" rel="noreferrer">
                <Button variant={ev.agentAction === 'SELL_POSITION' ? 'danger' : 'secondary'} size="sm">
                  Open {row.protocol_slug} ↗
                </Button>
              </a>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Positions</h2>
        <p className="text-sm text-slate-300 mt-1">On-chain position health read live from protocol APIs, with the exact collateral needed to restore safety.</p>
      </div>

      <LiveWalletPositions />

      {/* Summary tiles only exist once a wallet has actually been read. */}
      {hasWallet && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card padding="md">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Open Positions</span>
            <span className="text-3xl font-extrabold text-cyan-300 mt-2 block">{positions.length}</span>
            <span className="text-xs text-slate-300 font-medium mt-1 block">Read from connected wallet</span>
          </Card>

          <Card padding="md">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Imminent Liquidations</span>
            <span className={`text-3xl font-extrabold mt-2 block ${imminentCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {imminentCount}
            </span>
            <span className="text-xs text-slate-300 font-medium mt-1 block">{formatCompactCurrency(imminentUsd)} USD at risk</span>
          </Card>

          <Card padding="md">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Action Needed</span>
            <span className="text-3xl font-extrabold text-amber-400 mt-2 block">
              {evaluations.filter((e) => e.eval.agentAction !== 'HOLD').length}
            </span>
            <span className="text-xs text-slate-300 font-medium mt-1 block">Requires deleveraging or exit</span>
          </Card>
        </div>
      )}

      <Card
        title="Active Positions"
        subtitle="SolSentry sizes the action; you execute it in the protocol's own app. SolSentry never builds or signs a transaction on your behalf."
      >
        {positions.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1">
            <span className="font-bold text-slate-200 text-base block">
              {hasWallet ? 'No open positions found for this wallet' : 'No wallet connected'}
            </span>
            <p>
              {hasWallet
                ? 'No lending or leverage positions on supported protocols (Kamino today; Drift pending).'
                : 'Connect a wallet or scan an address above to read real on-chain positions with live health factors.'}
            </p>
          </div>
        ) : (
          <DataTable columns={columns} data={positions} keyExtractor={(p) => p.id} />
        )}
      </Card>
    </div>
  );
};
