'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SimulateTxResponse } from '../../packages/sdk/src/index';

export const TxSimulatorView: React.FC = () => {
  const [txInput, setTxInput] = useState<string>('');
  const [encoding, setEncoding] = useState<'base58' | 'base64'>('base58');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SimulateTxResponse | null>(null);

  const handleSimulate = async () => {
    if (!txInput.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/v1/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: txInput.trim(), encoding }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        status: 'SIMULATION_ERROR',
        unitsConsumed: 0,
        highComputeWarning: false,
        netTokenDeltas: [],
        drainerScan: {
          isDrainerPattern: false,
          riskLevel: 'CRITICAL',
          scorePenalty: 100,
          warnings: ['Network or server error executing simulation: ' + err.message],
        },
        logs: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Transaction Pre-Execution Simulator</h1>
            <Badge variant="medium">Solana RPC Engine</Badge>
          </div>
          <p className="text-sm text-slate-300 font-semibold mt-1">
            Simulate serialized Solana transactions to analyze net token balance deltas, compute unit limits, and drainer instruction sequences before signing.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-cyan-300 bg-cyan-950/60 p-3 rounded-xl border border-cyan-800">
          Endpoint: /api/v1/simulate
        </div>
      </div>

      <Card title="Simulate Transaction Payload" subtitle="Paste a serialized Solana transaction string in base58 or base64 encoding">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payload Encoding:</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEncoding('base58')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  encoding === 'base58' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Base58
              </button>
              <button
                type="button"
                onClick={() => setEncoding('base64')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  encoding === 'base64' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-900 text-slate-400'
                }`}
              >
                Base64
              </button>
            </div>
          </div>

          <div>
            <textarea
              value={txInput}
              onChange={(e) => setTxInput(e.target.value)}
              placeholder="Paste serialized transaction payload string here..."
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-cyan-200 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <Button variant="primary" size="md" onClick={handleSimulate} disabled={loading || !txInput.trim()}>
            {loading ? 'Simulating Transaction...' : 'Simulate & Scan Payload'}
          </Button>
        </div>
      </Card>

      {result && (
        <div className="space-y-6">
          <Card title="Simulation Results & Drainer Inspection">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Execution Status</span>
                  <span className={`text-lg font-bold mt-1 block ${result.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.status}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Compute Units</span>
                  <span className="text-lg font-bold text-cyan-300 mt-1 block font-mono">
                    {result.unitsConsumed.toLocaleString()} CU
                  </span>
                  {result.highComputeWarning && (
                    <span className="text-[11px] text-amber-400 font-semibold block mt-0.5">⚠️ High Compute (&gt;200k CU)</span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Drainer Risk Level</span>
                  <span className={`text-lg font-bold mt-1 block uppercase ${
                    result.drainerScan.isDrainerPattern ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {result.drainerScan.riskLevel}
                  </span>
                </div>
              </div>

              {result.drainerScan.warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-2">
                  <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                    <span>⚠️ Security Warnings & Drainer Patterns</span>
                  </h4>
                  <ul className="list-disc list-inside text-xs text-rose-200 space-y-1">
                    {result.drainerScan.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-slate-200 mb-3">Net Token Balance Changes</h4>
                {result.netTokenDeltas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No token balance changes detected in simulation.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3">Account</th>
                          <th className="p-3">Mint</th>
                          <th className="p-3">Pre Amount</th>
                          <th className="p-3">Post Amount</th>
                          <th className="p-3">Net Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {result.netTokenDeltas.map((d, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="p-3 text-slate-300">{d.account}</td>
                            <td className="p-3 text-slate-400">{d.mint.slice(0, 8)}...</td>
                            <td className="p-3 text-slate-300">{d.preAmount}</td>
                            <td className="p-3 text-slate-300">{d.postAmount}</td>
                            <td className={`p-3 font-bold ${d.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {d.delta >= 0 ? `+${d.delta}` : d.delta}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {result.logs.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-200 mb-2">Raw Simulation Logs</h4>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-60">
                    {result.logs.join('\n')}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
