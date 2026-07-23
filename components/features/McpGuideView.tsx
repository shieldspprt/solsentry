'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { McpConsoleSection } from './McpConsoleSection';

export const McpGuideView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'tools' | 'console'>('quickstart');

  const claudeConfigJson = `{
  "mcpServers": {
    "solsentry": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js"],
      "env": {
        "SOLSENTRY_URL": "http://localhost:3000"
      }
    }
  }
}`;

  const cursorConfigJson = `{
  "mcpServers": {
    "solsentry": {
      "url": "http://localhost:3000/api/v1/mcp"
    }
  }
}`;

  const jsonRpcSampleReq = `{
  "jsonrpc": "2.0",
  "id": 101,
  "method": "tools/call",
  "params": {
    "name": "solsentry_check_protocol_risk",
    "arguments": {
      "protocolSlug": "jupiter"
    }
  }
}`;

  const jsonRpcSampleRes = `{
  "jsonrpc": "2.0",
  "id": 101,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\\"protocol\\":\\"Jupiter\\",\\"safetyScore\\":9.8,\\"riskTier\\":\\"low\\",\\"actionRecommendation\\":\\"proceed\\"}"
      }
    ]
  }
}`;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-950/80 border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Model Context Protocol (MCP)</h1>
            <Badge variant="low">MCP v2024-11-05</Badge>
          </div>
          <p className="text-sm text-slate-300 font-semibold mt-1">
            Standardized JSON RPC 2.0 AI Agent Tool Execution Engine for Solana DeFi Risk Scoring
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-cyan-300 bg-cyan-950/60 p-3 rounded-xl border border-cyan-800">
          Endpoint: /api/v1/mcp
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card padding="md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Transport Protocol</span>
          <span className="text-xl font-extrabold text-slate-100 mt-2 block">HTTP POST &amp; SSE</span>
          <span className="text-xs text-cyan-300 font-semibold mt-1 block">JSON RPC 2.0 Spec</span>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Registered Tools</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-2 block">5 Core Tools</span>
          <span className="text-xs text-emerald-300 font-semibold mt-1 block">Risk, Policy, Oracles</span>
        </Card>

        <Card padding="md">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Supported AI Frameworks</span>
          <span className="text-xl font-extrabold text-cyan-300 mt-2 block">ElizaOS &amp; Claude</span>
          <span className="text-xs text-slate-300 font-semibold mt-1 block">Cursor &amp; LangChain</span>
        </Card>
      </div>

      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('quickstart')}
          className={`pb-3 px-2 text-sm font-extrabold transition-all border-b-2 ${
            activeTab === 'quickstart' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Quickstart &amp; Client Setup
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`pb-3 px-2 text-sm font-extrabold transition-all border-b-2 ${
            activeTab === 'tools' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Tool Registry &amp; Payloads
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={`pb-3 px-2 text-sm font-extrabold transition-all border-b-2 ${
            activeTab === 'console' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Interactive MCP Console
        </button>
      </div>

      {activeTab === 'quickstart' && (
        <div className="space-y-8">
          <Card title="Claude Desktop Integration" subtitle="Add SolSentry risk engine tools directly to your Claude Desktop workspace">
            <div className="space-y-4 text-sm text-slate-300">
              <p>Add the following configuration snippet to your Claude Desktop config file:</p>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto">
                {claudeConfigJson}
              </pre>
            </div>
          </Card>

          <Card title="Cursor IDE Integration" subtitle="Configure MCP server connection in Cursor IDE settings">
            <div className="space-y-4 text-sm text-slate-300">
              <p>Add the SolSentry MCP endpoint URL under Cursor Features &gt; MCP Servers:</p>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto">
                {cursorConfigJson}
              </pre>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="space-y-8">
          <Card title="MCP Registered Tool Specifications">
            <div className="space-y-6 text-sm">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300 text-base">solsentry_check_protocol_risk</span>
                  <Badge variant="low">Read Only</Badge>
                </div>
                <p className="text-slate-300">
                  Calculates real time composite safety scores, provenance bands, and top drivers for Solana DeFi protocols.
                </p>
                <div className="text-xs font-mono text-slate-400">Parameters: protocolSlug (string, required e.g. jupiter, kamino, drift)</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300 text-base">solsentry_evaluate_policy</span>
                  <Badge variant="medium">Validation</Badge>
                </div>
                <p className="text-slate-300">
                  Validates pre-flight AI transactions against daily volume caps, single trade size limits, and safety thresholds.
                </p>
                <div className="text-xs font-mono text-slate-400">Parameters: action (string), protocolSlug (string), amountUsd (number)</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300 text-base">solsentry_get_position_health</span>
                  <Badge variant="critical">Alerting</Badge>
                </div>
                <p className="text-slate-300">
                  Scans open positions ranked by distance to liquidation, returning exact dollar amounts to restore safety.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Sample MCP JSON RPC Request">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto">
                {jsonRpcSampleReq}
              </pre>
            </Card>

            <Card title="Sample MCP Structured Response">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                {jsonRpcSampleRes}
              </pre>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'console' && <McpConsoleSection />}
    </div>
  );
};
