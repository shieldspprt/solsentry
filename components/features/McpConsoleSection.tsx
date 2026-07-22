'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const McpConsoleSection: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string>('get_protocol_risk');
  const [argInput, setArgInput] = useState<string>('{\n  "slug": "jupiter"\n}');
  const [mcpResult, setMcpResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleToolChange = (toolName: string) => {
    setSelectedTool(toolName);
    if (toolName === 'get_protocol_risk') {
      setArgInput('{\n  "slug": "jupiter"\n}');
    } else if (toolName === 'check_policy_rules') {
      setArgInput('{\n  "action": "swap",\n  "protocolSlug": "jupiter",\n  "amountUsd": 500\n}');
    } else if (toolName === 'get_imminent_liquidations') {
      setArgInput('{\n  "thresholdHealthFactor": 1.2\n}');
    } else if (toolName === 'get_oracle_telemetry') {
      setArgInput('{\n  "feed": "SOL_USD"\n}');
    }
  };

  const executeMcpCall = async () => {
    setLoading(true);
    setMcpResult(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(argInput);
      } catch {
        // invalid JSON fallback
      }

      const res = await fetch('/api/v1/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: parsedArgs,
          },
        }),
      });

      const data = await res.json();
      setMcpResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setMcpResult(JSON.stringify({ error: 'Failed to execute MCP call', details: String(err) }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Interactive MCP Test Console" subtitle="Execute JSON RPC 2.0 tool calls against the live AgentGate MCP server">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Select MCP Tool</label>
            <select
              value={selectedTool}
              onChange={(e) => handleToolChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none font-mono"
            >
              <option value="get_protocol_risk">get_protocol_risk</option>
              <option value="check_policy_rules">check_policy_rules</option>
              <option value="get_imminent_liquidations">get_imminent_liquidations</option>
              <option value="get_oracle_telemetry">get_oracle_telemetry</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-mono">JSON RPC Method</label>
            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-cyan-300 font-mono">
              tools/call
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-mono">Tool Arguments (JSON)</label>
          <textarea
            value={argInput}
            onChange={(e) => setArgInput(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-cyan-200 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <Button variant="primary" size="md" onClick={executeMcpCall} disabled={loading}>
          {loading ? 'Executing MCP Tool Call...' : 'Execute MCP Request'}
        </Button>

        {mcpResult && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block font-mono">JSON RPC Response</span>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-96">
              {mcpResult}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
};
