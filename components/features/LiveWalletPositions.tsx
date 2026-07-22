'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatCurrency } from '../../lib/formatters';

interface LivePosition {
  positionId: string;
  protocolSlug: string;
  positionType: string;
  asset: string;
  amountUsd: number | null;
  healthFactor: number | null;
  pnlUsd: number | null;
  isLiquidationRisk: boolean;
  agentAction: string;
  actionReason: string;
}

interface StressScenario {
  scenario: { label: string; price_shock_pct: number };
  positions_liquidated: number;
  capital_at_risk_usd: number;
  portfolio_health_after: number | null;
}

interface ReadResponse {
  wallet: string;
  sourcesLive: string[];
  sourcesUnavailable: string[];
  asOf: string;
  totalOpenPositions: number;
  imminentLiquidationRiskCount: number;
  positions: LivePosition[];
  stressScenarios: StressScenario[];
  safetyRecommendation: string;
  error?: string;
}

export const LiveWalletPositions: React.FC = () => {
  const { publicKey } = useWallet();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveAddress = address || publicKey?.toBase58() || '';

  const scan = async () => {
    const target = effectiveAddress.trim();
    if (!target) {
      setError('Enter a Solana wallet address or connect a wallet');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch('/api/v1/positions/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: target }),
      });
      const json: ReadResponse = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to read wallet');
      } else {
        setData(json);
      }
    } catch {
      setError('Network error reading wallet positions');
    } finally {
      setLoading(false);
    }
  };

  const worst = data?.stressScenarios?.[data.stressScenarios.length - 1];

  return (
    <Card
      title="Live On-Chain Wallet Scan"
      subtitle="Reads REAL positions with live health factors from Kamino (Drift pending)"
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <Input
            label="Solana Wallet Address"
            value={address}
            placeholder={publicKey ? publicKey.toBase58() : 'e.g. 6LD3XC...'}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <Button variant="primary" onClick={scan} disabled={loading}>
          {loading ? 'Scanning chain…' : 'Scan Wallet'}
        </Button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">{error}</div>
      )}

      {data && (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Open Positions</span>
              <span className="text-xl font-extrabold text-cyan-300 mt-1 block">{data.totalOpenPositions}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Imminent Liquidation</span>
              <span className={`text-xl font-extrabold mt-1 block ${data.imminentLiquidationRiskCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {data.imminentLiquidationRiskCount}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Worst Case ({worst?.scenario.price_shock_pct}%)</span>
              <span className="text-xl font-extrabold text-amber-400 mt-1 block">
                {worst ? `${worst.positions_liquidated} liq.` : '—'}
              </span>
              {worst && <span className="text-[10px] text-slate-400 block">{formatCurrency(worst.capital_at_risk_usd)} at risk</span>}
            </div>
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-slate-500 uppercase tracking-wider text-[10px] block">Verdict</span>
              <span className={`text-sm font-extrabold mt-1 block ${data.safetyRecommendation === 'CRITICAL_ACTION_REQUIRED' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {data.safetyRecommendation.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500">
            Live sources: {data.sourcesLive.length ? data.sourcesLive.join(', ') : 'none returned positions'}
            {data.sourcesUnavailable.length > 0 && ` · unavailable: ${data.sourcesUnavailable.join(', ')}`}
            {' · as of '}
            {new Date(data.asOf).toLocaleTimeString()}
          </div>

          {data.positions.length > 0 ? (
            <div className="space-y-2">
              {data.positions.map((p) => (
                <div key={p.positionId} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold uppercase text-slate-100">{p.protocolSlug}</span>
                    <span className="text-slate-400 uppercase">{p.positionType}</span>
                    <span className="text-slate-300">{formatCurrency(p.amountUsd)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold ${p.healthFactor && p.healthFactor <= 1.15 ? 'text-rose-400' : p.healthFactor && p.healthFactor <= 1.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      HF {p.healthFactor != null ? p.healthFactor.toFixed(2) : 'N/A'}
                    </span>
                    <Badge variant={p.agentAction === 'SELL_POSITION' ? 'critical' : p.agentAction === 'CHANGE_POSITION' ? 'medium' : 'low'}>
                      {p.agentAction}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/60 rounded-lg border border-slate-800">
              No open lending/leverage positions found for this wallet on supported protocols.
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
