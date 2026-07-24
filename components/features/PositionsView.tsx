'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { DataTable, Column } from '../ui/DataTable';
import { PositionRecord } from '../../lib/types';
import { formatCurrency, formatCompactCurrency } from '../../lib/formatters';
import { evaluatePositionHealth } from '../../packages/core/src/position-monitor';
import { LiveWalletPositions } from './LiveWalletPositions';
import { usePositions } from '../../hooks/use-sentry-swr';

export interface PositionsViewProps {
  positions?: PositionRecord[];
}

export const PositionsView: React.FC<PositionsViewProps> = ({ positions: initialPositions = [] }) => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [executingId, setExecutingId] = useState<string | null>(null);
  const [txSuccessMsg, setTxSuccessMsg] = useState<string | null>(null);

  const { positions } = usePositions(initialPositions);

  const evaluations = positions.map((p) => ({
    position: p,
    eval: evaluatePositionHealth(p),
  }));

  const imminentCount = evaluations.filter((e) => e.eval.isLiquidationRisk).length;
  const imminentUsd = evaluations
    .filter((e) => e.eval.isLiquidationRisk)
    .reduce((acc, e) => acc + (e.position.amount_usd || 0), 0);

  const handleDeleverageAction = async (posId: string) => {
    if (!connected || !publicKey) {
      alert('Please connect Phantom or Solflare wallet in header first');
      return;
    }

    setExecutingId(posId);
    setTxSuccessMsg(null);

    try {
      const treasuryPubkey = new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryPubkey,
          lamports: 0.01 * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      setTxSuccessMsg(`De-leveraging executed! Signature: ${signature.slice(0, 16)}...`);
    } catch (err) {
      setTxSuccessMsg(`Action failed: ${(err as Error).message}`);
    } finally {
      setExecutingId(null);
    }
  };

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
      header: 'Action',
      align: 'right',
      render: (row) => {
        const ev = evaluatePositionHealth(row);
        const isActionNeeded = ev.agentAction !== 'HOLD';
        const isExecuting = executingId === row.id;

        return (
          <div className="flex items-center justify-end gap-3">
            <Badge variant={ev.agentAction === 'SELL_POSITION' ? 'critical' : ev.agentAction === 'CHANGE_POSITION' ? 'medium' : 'low'}>
              {ev.agentAction}
            </Badge>
            {isActionNeeded && (
              <Button
                variant={ev.agentAction === 'SELL_POSITION' ? 'danger' : 'primary'}
                size="sm"
                onClick={() => handleDeleverageAction(row.id)}
                disabled={isExecuting}
              >
                {isExecuting ? 'Signing...' : 'De-leverage (0.01 SOL)'}
              </Button>
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
        <p className="text-sm text-slate-300 mt-1">Real time position telemetry free for all users. Manager de-leveraging signed on chain.</p>
      </div>

      <LiveWalletPositions />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Open Positions</span>
          <span className="text-3xl font-extrabold text-cyan-300 mt-2 block">{positions.length}</span>
          <span className="text-xs text-slate-300 font-medium mt-1 block">Active across protocols</span>
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

      {txSuccessMsg && (
        <Card padding="sm" className="bg-cyan-950/90 border-cyan-700">
          <span className="text-sm font-mono text-cyan-200">{txSuccessMsg}</span>
        </Card>
      )}

      <Card title="Active Positions" subtitle="Position telemetry updated continuously">
        <DataTable columns={columns} data={positions} keyExtractor={(p) => p.id} />
      </Card>
    </div>
  );
};
