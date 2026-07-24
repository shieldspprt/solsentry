import React from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function LandingPage() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://solsentry.io';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SolSentry',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Solana Network',
    description: 'Quantitative risk engine, CLI tool, x402 pay-as-you-go micropayments, agent autonomy, and multi-framework plugins (ElizaOS, Solana Agent Kit, LangChain, MCP) for Solana AI agents.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    url: siteUrl,
    softwareRequirements: 'Model Context Protocol (MCP), Solana Agent Kit, ElizaOS, or REST API',
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between">
      {/* See app/layout.tsx — JSON-LD as a child breaks hydration. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="px-8 py-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-extrabold text-xl shadow-sm">
            S
          </div>
          <span className="text-xl font-extrabold text-slate-100 tracking-tight">SolSentry</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/docs" className="text-sm font-semibold text-slate-300 hover:text-cyan-300 transition-colors">
            Interactive API &amp; SDK Docs
          </a>
          <a href="/mcp" className="text-sm font-semibold text-slate-300 hover:text-cyan-300 transition-colors">
            MCP Protocol
          </a>
          <a href="/dashboard">
            <Button variant="primary" size="md">
              Launch App
            </Button>
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 text-center space-y-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-bold uppercase tracking-wider">
          v3.0.0 — CLI, x402 Micropayments, Agent Autonomy &amp; Backtesting
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Every AI agent can trade. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            SolSentry makes sure they don't get rekt.
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
          A provenance-tagged risk engine, real-time transaction simulator, developer CLI, x402 pay-as-you-go micropayments, and
          multi-framework AI agent plugins for Solana. Every factor names its source — and anything we cannot measure is reported
          as unmeasured, never filled in.
        </p>

        {/* CLI Command Box */}
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left font-mono text-xs text-cyan-300 shadow-xl">
          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">Developer CLI Quickstart:</span>
          <div>$ npm install -g @solsentry/cli</div>
          <div className="text-slate-400">$ solsentry check kamino --details</div>
          <div className="text-slate-400">$ solsentry simulate tx_base58_string</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a href="/dashboard">
            <Button variant="primary" size="lg">
              Launch App
            </Button>
          </a>
          <a href="/docs">
            <Button variant="secondary" size="lg">
              Interactive API &amp; SDK Docs
            </Button>
          </a>
          <a href="/mcp">
            <Button variant="secondary" size="lg">
              MCP Tools Reference
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left">
          <Card padding="md" title="🤖 Multi-Framework AI Agent Plugins">
            <p className="text-sm text-slate-300 leading-relaxed">
              First-class integration packages for <strong>ElizaOS</strong> (<code>@solsentry/eliza-plugin</code>), <strong>Solana Agent Kit</strong> (<code>@solsentry/agent-kit</code>), <strong>LangChain / CrewAI</strong> (<code>@solsentry/langchain</code>), and <strong>MCP Clients</strong>.
            </p>
          </Card>

          <Card padding="md" title="💳 x402 Pay-As-You-Go Micropayments">
            <p className="text-sm text-slate-300 leading-relaxed">
              Native Solana Pay USDC micropayments header (<code>X-402-Payment</code>) per API/MCP call. No subscriptions required — pay per call on chain.
            </p>
          </Card>

          <Card padding="md" title="⚡ Guardrails & De-Leverage Sizing">
            <p className="text-sm text-slate-300 leading-relaxed">
              Policy guardrails, circuit-breaker halts on daily drawdown, and the exact collateral needed to restore a safe health
              factor. SolSentry sizes the action; your agent or wallet executes it. It never signs on your behalf.
            </p>
          </Card>

          <Card padding="md" title="📈 Historical Crash Backtesting Engine">
            <p className="text-sm text-slate-300 leading-relaxed">
              Simulate policy enforcement rules against historical Solana market crashes (Nov 2022 FTX, March 2023 USDC de-peg, Feb 2022 Wormhole hack).
            </p>
          </Card>

          <Card padding="md" title="💻 Official Developer CLI (@solsentry/cli)">
            <p className="text-sm text-slate-300 leading-relaxed">
              Standalone terminal binary providing instantaneous protocol risk scoring, transaction simulation, and policy checks right from your CLI shell.
            </p>
          </Card>

          <Card padding="md" title="📡 Live Oracle SSE Stream (/api/v1/stream)">
            <p className="text-sm text-slate-300 leading-relaxed">
              Server-Sent Events carrying live Pyth Hermes readings for SOL, USDC and USDT — price, confidence-interval width and
              publish staleness. A widening confidence band is the earliest warning of oracle-driven liquidation risk.
            </p>
          </Card>
        </div>
      </main>

      <footer className="px-8 py-6 border-t border-slate-800/80 max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <span>SolSentry Quantitative Risk Engine v3.0.0. Open Source MIT License.</span>
        <div className="flex items-center gap-6">
          <a href="/docs" className="text-cyan-400 hover:underline">API &amp; SDK Playground</a>
          <a href="/mcp" className="text-cyan-400 hover:underline">MCP Protocol Guide</a>
          <span className="text-cyan-400 font-semibold">PWA Ready &amp; Live</span>
        </div>
      </footer>
    </div>
  );
}
