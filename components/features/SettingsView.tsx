'use client';

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';

export const SettingsView: React.FC = () => {
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [apiKey] = useState('ag_live_9f83a71b2d4e5f6a7b8c9d0e1f2a3b4c');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [txMsg, setTxMsg] = useState<string | null>(null);

  const handleProUpgrade = async () => {
    if (!connected || !publicKey) {
      alert('Please connect Phantom or Solflare wallet in header');
      return;
    }

    setIsUpgrading(true);
    setTxMsg(null);

    try {
      const treasuryPubkey = new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryPubkey,
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      setTxMsg(`Pro Subscription Activated! Tx Signature: ${signature.slice(0, 16)}...`);
    } catch (err) {
      setTxMsg(`Upgrade failed: ${(err as Error).message}`);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Settings</h2>
        <p className="text-sm text-slate-300 mt-1">Manage API keys, subscription tiers, and x402 wallet payments</p>
      </div>

      <Card title="API Key" subtitle="Authenticates AI agents querying REST endpoints and MCP servers">
        <div className="space-y-5">
          <Input label="Active API Key" type="password" value={apiKey} onChange={() => {}} readOnly />
          <div className="flex gap-4">
            <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(apiKey)}>
              Copy API Key
            </Button>
          </div>
        </div>
      </Card>

      {/* x402 Pay-As-You-Go Micropayment Card */}
      <Card title="x402 Pay-As-You-Go USDC Micropayments" subtitle="Pay per MCP tool call / simulation using native USDC Solana Pay transactions">
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-sm">
            <div>
              <span className="font-bold text-slate-100 block">Pay-As-You-Go Protocol</span>
              <span className="text-xs text-slate-400">Pass X-402-Payment transaction header with USDC transfer</span>
            </div>
            <Badge variant="low">Active Protocol</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 uppercase font-semibold block">Basic Queries</span>
              <span className="font-bold text-slate-100 text-sm mt-1 block">0.10 - 0.25 USDC</span>
              <span className="text-slate-500">get_protocol_list, check_risk</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 uppercase font-semibold block">Analysis Tools</span>
              <span className="font-bold text-cyan-300 text-sm mt-1 block">0.35 - 0.75 USDC</span>
              <span className="text-slate-500">preflight, evaluate_policy</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-400 uppercase font-semibold block">Full Simulation</span>
              <span className="font-bold text-emerald-300 text-sm mt-1 block">1.50 USDC</span>
              <span className="text-slate-500">simulate_transaction</span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Subscription Tiers" subtitle="Read access is free for all users. Manager actions use x402 wallet signatures">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-100 text-base">Free Tier</span>
              <Badge variant="low">Active</Badge>
            </div>
            <p className="text-sm text-slate-300">
              Unlimited read access to protocol risk scores, business share ratios, web telemetry, position health factors, and policy rules.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-100 text-base">Pro Tier</span>
              <span className="text-sm font-extrabold text-cyan-300 font-mono">0.05 SOL / month</span>
            </div>
            <p className="text-sm text-slate-300">
              Includes manager de-leveraging transaction execution, automated alert webhooks, and x402 micro-payment billing.
            </p>
            <Button variant="primary" size="sm" onClick={handleProUpgrade} disabled={isUpgrading}>
              {isUpgrading ? 'Processing...' : 'Upgrade Tier (0.05 SOL)'}
            </Button>
          </div>
        </div>

        {txMsg && (
          <div className="mt-5 p-4 rounded-xl bg-cyan-950/90 border border-cyan-700 text-sm font-mono text-cyan-200">
            {txMsg}
          </div>
        )}
      </Card>
    </div>
  );
};
