'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { DEFAULT_POLICY_RULES } from '../../packages/core/src/constants';
import { runHistoricalBacktest, BacktestResult } from '../../packages/core/src/backtest-engine';
import { formatCompactCurrency } from '../../lib/formatters';

export const PoliciesView: React.FC = () => {
  const [rules, setRules] = useState(DEFAULT_POLICY_RULES);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [backtestUsd, setBacktestUsd] = useState(10000);
  const [backtestOutput, setBacktestOutput] = useState<{
    totalScenarios: number;
    blockedCount: number;
    protectionSuccessRatePct: number;
    totalLossPreventedUsd: number;
    results: BacktestResult[];
  } | null>(null);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRunBacktest = () => {
    const res = runHistoricalBacktest(backtestUsd, rules);
    setBacktestOutput(res);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Policies</h2>
          <p className="text-sm text-slate-300 mt-1">Configure transaction size caps, allowed protocols, and drawdown thresholds</p>
        </div>
        <Button variant="primary" onClick={handleSave}>
          {saveSuccess ? 'Policy Saved!' : 'Save Policy'}
        </Button>
      </div>

      <Card title="Financial Boundaries" subtitle="Maximum transaction sizes and cumulative daily volume">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Max Single Transaction (USD)"
            type="number"
            value={rules.max_single_tx_usd}
            onChange={(e) => setRules({ ...rules, max_single_tx_usd: Number(e.target.value) })}
            helperText="Maximum allowed USD value per single DeFi transaction"
          />
          <Input
            label="Max Daily Volume (USD)"
            type="number"
            value={rules.max_daily_volume_usd}
            onChange={(e) => setRules({ ...rules, max_daily_volume_usd: Number(e.target.value) })}
            helperText="Cumulative maximum USD volume allowed in a 24 hour window"
          />
          <Input
            label="Max Position Size (USD)"
            type="number"
            value={rules.max_position_size_usd}
            onChange={(e) => setRules({ ...rules, max_position_size_usd: Number(e.target.value) })}
            helperText="Maximum allocation per individual position"
          />
          <Input
            label="Max Allowed Drawdown (%)"
            type="number"
            value={rules.max_drawdown_pct}
            onChange={(e) => setRules({ ...rules, max_drawdown_pct: Number(e.target.value) })}
            helperText="Circuit breaker threshold for portfolio drawdown"
          />
        </div>
      </Card>

      <Card title="Security Restrictions" subtitle="Minimum protocol score and oracle requirements">
        <div className="space-y-5">
          <div className="flex items-center justify-between p-5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <span className="font-bold text-slate-100 text-base block">Minimum Risk Score Required</span>
              <span className="text-sm text-slate-300 mt-0.5 block">Block transactions to protocols scoring lower than this threshold</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-extrabold text-cyan-300 text-base">{rules.min_risk_score} / 10</span>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={rules.min_risk_score}
                onChange={(e) => setRules({ ...rules, min_risk_score: Number(e.target.value) })}
                className="w-24"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <span className="font-bold text-slate-100 text-base block">Require Healthy Oracle Feeds</span>
              <span className="text-sm text-slate-300 mt-0.5 block">Automatically block transactions if Pyth price feeds are degraded or offline</span>
            </div>
            <Badge variant="info">Active</Badge>
          </div>
        </div>
      </Card>

      {/* Historical Backtesting Engine Card */}
      <Card
        title="Historical Crash Backtesting Engine"
        subtitle="Simulate policy enforcement against historical Solana market crashes (FTX, USDC De-peg, Wormhole, Mango)"
      >
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Input
                label="Simulated Trade Allocation (USD)"
                type="number"
                value={backtestUsd}
                onChange={(e) => setBacktestUsd(Number(e.target.value))}
              />
            </div>
            <Button variant="secondary" onClick={handleRunBacktest}>
              ⚡ Run Backtest Simulation
            </Button>
          </div>

          {backtestOutput && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-xs font-semibold uppercase block">Protection Success Rate</span>
                  <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                    {backtestOutput.protectionSuccessRatePct}%
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-xs font-semibold uppercase block">Crashes Blocked</span>
                  <span className="text-2xl font-extrabold text-cyan-300 mt-1 block">
                    {backtestOutput.blockedCount} / {backtestOutput.totalScenarios}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 text-xs font-semibold uppercase block">Estimated Capital Loss Prevented</span>
                  <span className="text-2xl font-extrabold text-emerald-300 mt-1 block">
                    {formatCompactCurrency(backtestOutput.totalLossPreventedUsd)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {backtestOutput.results.map((r) => (
                  <div key={r.scenarioId} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold text-slate-100 block">{r.scenarioName}</span>
                      <span className="text-xs text-slate-400">{r.reasons.join(' | ') || 'Passed guardrails'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.preventedLossUsd > 0 && (
                        <span className="font-mono text-xs text-emerald-400 font-bold">
                          +{formatCompactCurrency(r.preventedLossUsd)} saved
                        </span>
                      )}
                      <Badge variant={r.blocked ? 'low' : 'critical'}>
                        {r.decision}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
