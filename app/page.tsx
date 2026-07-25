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
    description: 'Pre-signing transaction simulator with wallet-drainer detection, plus a provenance-tagged protocol risk engine, MCP server and TypeScript SDK for Solana AI agents.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    url: siteUrl,
    softwareRequirements: 'Model Context Protocol (MCP), TypeScript SDK, or REST API',
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
          v3.1 — Drainer detection, exploit gating &amp; per-protocol oracles
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Never sign a drainer. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            One call, before your agent signs.
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
          SolSentry runs your agent's transaction against mainnet without broadcasting it, and tells you exactly which tokens
          leave the wallet — and whether the instruction sequence matches a known wallet-drainer pattern. Plus a
          provenance-tagged protocol risk engine where every factor names its source, and anything we cannot measure is reported
          as unmeasured rather than filled in.
        </p>

        {/* The one call that matters, shown first */}
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left font-mono text-xs shadow-xl">
          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-2">
            Before your agent signs:
          </span>
          <div className="text-cyan-300">const check = await sentry.simulate(serializedTx);</div>
          <div className="text-rose-300">{'if (check.drainerScan.isDrainerPattern) return;  // do not sign'}</div>
          <div className="text-slate-500 mt-2">$ solsentry simulate &lt;tx&gt;    # or from the CLI</div>
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
          <Card padding="md" title="🔌 MCP + TypeScript SDK">
            <p className="text-sm text-slate-300 leading-relaxed">
              Nine <code>solsentry_*</code> tools over MCP for Claude, Cursor and any MCP client, plus <code>@solsentry/sdk</code> for
              custom bots. Two integration paths, both maintained — instead of five thin wrappers around the same HTTP calls.
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
              factor. SolSentry sizes the action; your agent executes it. It never signs on your behalf.
            </p>
          </Card>

          <Card padding="md" title="🚨 Realized Exploit History">
            <p className="text-sm text-slate-300 leading-relaxed">
              Every protocol is checked against DeFiLlama's hacks dataset. A loss over $10M inside 180 days forces a
              <strong> block</strong> verdict regardless of how healthy the other factors look.
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
