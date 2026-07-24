'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { AgentRecord } from '../../lib/types';
import { formatTruncateAddress } from '../../lib/formatters';
import { useAgents } from '../../hooks/use-sentry-swr';

export interface AgentsViewProps {
  initialAgents?: AgentRecord[];
}

export const AgentsView: React.FC<AgentsViewProps> = ({ initialAgents = [] }) => {
  const { agents, mutate } = useAgents(initialAgents);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [agentType, setAgentType] = useState('custom');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Autonomous guardrails state
  const [autonomyEnabled, setAutonomyEnabled] = useState(true);
  const [healthThreshold, setHealthThreshold] = useState(1.2);
  const [dailyLossLimitUsd, setDailyLossLimitUsd] = useState(2500);

  const handleCreateAgent = async () => {
    if (!name) return;
    setLoading(true);

    const newAgent: AgentRecord = {
      id: `ag_${Math.random().toString(36).substring(2, 9)}`,
      user_id: 'user_1',
      name,
      description: 'Registered AI Trading Agent',
      agent_type: agentType as any,
      wallet_address: walletAddress || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistically update SWR cache
    await mutate([newAgent, ...agents], false);

    try {
      await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: 'Registered AI Trading Agent' }),
      });
      await mutate();
    } catch {
      await mutate();
    } finally {
      setName('');
      setWalletAddress('');
      setIsModalOpen(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">AI Agents</h2>
          <p className="text-sm text-slate-300 mt-1">Manage AI agents connected to SolSentry risk middleware & autonomous execution</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          Register Agent
        </Button>
      </div>

      {/* Autonomous Guardrails Card */}
      <Card title="Autonomous Action & Execution Settings" subtitle="Configure automatic de-leveraging, rebalancing, and circuit breakers for AI agents">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 text-sm">Auto-Deleveraging</span>
              <Badge variant={autonomyEnabled ? 'low' : 'critical'}>{autonomyEnabled ? 'Enabled' : 'Disabled'}</Badge>
            </div>
            <p className="text-xs text-slate-400">Trigger automatic position exit when health factor drops below threshold.</p>
            <Input
              label="Health Factor Trigger"
              type="number"
              step="0.05"
              value={healthThreshold}
              onChange={(e) => setHealthThreshold(Number(e.target.value))}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 text-sm">Circuit Breaker</span>
              <Badge variant="low">Active</Badge>
            </div>
            <p className="text-xs text-slate-400">Pause agent trading automatically if daily drawdown exceeds USD limit.</p>
            <Input
              label="Daily Loss Cap (USD)"
              type="number"
              value={dailyLossLimitUsd}
              onChange={(e) => setDailyLossLimitUsd(Number(e.target.value))}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 text-sm">Framework Plugins</span>
              <Badge variant="info">4 Ready</Badge>
            </div>
            <p className="text-xs text-slate-400">ElizaOS, Solana Agent Kit (ai16z), LangChain, & CrewAI SDK packages available.</p>
            <div className="pt-2">
              <Button variant="secondary" size="sm" className="w-full" onClick={() => window.location.href = '/docs'}>
                View Framework Integration SDKs
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {agents.length === 0 ? (
        <Card padding="lg" className="text-center py-16">
          <p className="text-base font-bold text-slate-200">No registered AI agents yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Register your ElizaOS, Solana Agent Kit, or custom trading agent to start protecting transactions.
          </p>
          <div className="mt-6">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
              Register Agent
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent) => (
            <Card key={agent.id} padding="md" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-100 text-lg">{agent.name}</h3>
                <Badge variant="info">{agent.agent_type}</Badge>
              </div>
              <p className="text-sm text-slate-300">{agent.description}</p>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-sm flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Solana Wallet:</span>
                <span className="font-mono text-slate-200 font-bold">{formatTruncateAddress(agent.wallet_address) || 'Not Configured'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register AI Agent"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateAgent} disabled={loading || !name}>
              {loading ? 'Creating...' : 'Create Agent'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input
            label="Agent Name"
            placeholder="e.g. Solana Trading Bot Alpha"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Solana Wallet Address (Mainnet Beta)"
            placeholder="e.g. 7xKXtg2CW..."
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
