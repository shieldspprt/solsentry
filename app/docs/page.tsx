'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

export default function ApiDocsPage() {
  const [selectedLang, setSelectedLang] = useState<'sdk' | 'curl' | 'python' | 'mcp'>('sdk');
  const [testProtocol, setTestProtocol] = useState('kamino');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleRunTest = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/risk-check?protocol=${testProtocol}`);
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const getCodeSnippet = () => {
    if (selectedLang === 'sdk') {
      return `import { SolSentryClient } from '@solsentry/sdk';

const client = new SolSentryClient({ apiKey: 'YOUR_API_KEY' });

// 1. Check Institutional Protocol Risk
const risk = await client.checkProtocolRisk('${testProtocol}');
console.log(risk.safetyScore, risk.recommendation);

// 2. Pre-flight Transaction Simulation (Drainer Scan)
const sim = await client.simulateTransaction({ transaction: 'base58_tx_payload...' });
console.log(sim.drainerScan.isDrainerPattern);`;
    }
    if (selectedLang === 'curl') {
      return `# 1. Protocol Risk Check
curl -X GET "https://solsentry.io/api/v1/risk-check?protocol=${testProtocol}" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# 2. Transaction Simulation (x402 Pay-As-You-Go)
curl -X POST "https://solsentry.io/api/v1/simulate" \\
  -H "Content-Type: application/json" \\
  -H "X-402-Payment: tx_signature..." \\
  -d '{"transaction": "base58_tx_payload..."}'`;
    }
    if (selectedLang === 'python') {
      return `import requests

url = "https://solsentry.io/api/v1/risk-check"
headers = {"Authorization": "Bearer YOUR_API_KEY"}
params = {"protocol": "${testProtocol}"}

response = requests.get(url, headers=headers, params=params)
data = response.json()
print("Safety Score:", data["safetyScore"])`;
    }
    return `// MCP Configuration for Claude Desktop / Cursor / Antigravity IDE
{
  "mcpServers": {
    "solsentry": {
      "command": "npx",
      "args": ["-y", "@solsentry/mcp-server"],
      "env": {
        "SOLSENTRY_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}`;
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 p-6 lg:p-12 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-cyan-400 font-extrabold text-sm hover:underline">
              ← Back to Dashboard
            </Link>
            <Badge variant="info">v3.0.0 OpenAPI Spec</Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-slate-50">API & MCP Developer Playground</h1>
          <p className="text-sm text-slate-300 mt-1">
            Test live SolSentry endpoints, copy client SDK code, and integrate MCP tools.
          </p>
        </div>
        <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer">
          <Button variant="secondary" size="sm">
            📄 Raw OpenAPI Spec (JSON)
          </Button>
        </a>
      </div>

      {/* Interactive Tester */}
      <Card title="Live Interactive Endpoint Tester" subtitle="Run a live risk query directly against the SolSentry engine">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Input
                label="Protocol Slug"
                placeholder="e.g. kamino, drift, jupiter, orca"
                value={testProtocol}
                onChange={(e) => setTestProtocol(e.target.value.toLowerCase())}
              />
            </div>
            <Button variant="primary" onClick={handleRunTest} disabled={loading}>
              {loading ? 'Executing...' : '⚡ Test Risk Query'}
            </Button>
          </div>

          {testResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-300">
              <pre>{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </Card>

      {/* Code Snippet Switcher */}
      <Card title="Client Integration Code Snippets" subtitle="Select your preferred language or agent framework">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
            <Button
              variant={selectedLang === 'sdk' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedLang('sdk')}
            >
              TypeScript SDK
            </Button>
            <Button
              variant={selectedLang === 'curl' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedLang('curl')}
            >
              cURL REST API
            </Button>
            <Button
              variant={selectedLang === 'python' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedLang('python')}
            >
              Python
            </Button>
            <Button
              variant={selectedLang === 'mcp' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedLang('mcp')}
            >
              MCP Server Config
            </Button>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto relative">
            <pre>{getCodeSnippet()}</pre>
          </div>
        </div>
      </Card>
    </div>
  );
}
