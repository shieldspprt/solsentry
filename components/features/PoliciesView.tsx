'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { DEFAULT_POLICY_RULES } from '../../packages/core/src/constants';

export const PoliciesView: React.FC = () => {
  const [rules, setRules] = useState(DEFAULT_POLICY_RULES);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
    </div>
  );
};
