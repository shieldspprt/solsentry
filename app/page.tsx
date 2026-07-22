import React from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SolSentry',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Solana Network',
    description: 'Real time risk scoring, position health monitoring, Model Context Protocol (MCP) server, and guardrail policy enforcement for Solana AI trading agents.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    url: 'http://localhost:3000',
    softwareRequirements: 'Model Context Protocol (MCP) or REST API',
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="px-8 py-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-extrabold text-xl shadow-sm">
            S
          </div>
          <span className="text-xl font-extrabold text-slate-100 tracking-tight">SolSentry</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/mcp" className="text-sm font-semibold text-slate-300 hover:text-cyan-300 transition-colors">
            MCP Protocol &amp; Tools
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
          Model Context Protocol (MCP) Server &amp; PWA Enabled
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Every AI agent can trade. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            SolSentry makes sure they don't get rekt.
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Open source real time risk scoring, position health monitoring, Model Context Protocol (MCP) tool execution, and guardrail policy enforcement for Solana AI trading agents.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <a href="/dashboard">
            <Button variant="primary" size="lg">
              Launch App
            </Button>
          </a>
          <a href="/mcp">
            <Button variant="secondary" size="lg">
              Explore MCP Settings &amp; Tools
            </Button>
          </a>
          <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer">
            <Button variant="secondary" size="lg">
              OpenAPI Spec
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12 text-left">
          <Card padding="md" title="Model Context Protocol (MCP) Server">
            <p className="text-sm text-slate-300 leading-relaxed">
              Standardized JSON RPC 2.0 and Server Sent Events (SSE) interface at /api/v1/mcp allowing Claude Desktop, Cursor, ElizaOS, and Solana Agent Kit to autonomously query risk scores and evaluate policy rules.
            </p>
          </Card>

          <Card padding="md" title="Progressive Web App (PWA) Offline Engine">
            <p className="text-sm text-slate-300 leading-relaxed">
              Service Worker offline state caching, prompt-controlled waiting worker updates, frozen manifest ID, and mobile installation capability for instant risk telemetry anywhere.
            </p>
          </Card>

          <Card padding="md" title="Pre Flight Risk Checks">
            <p className="text-sm text-slate-300 leading-relaxed">
              Score Solana DeFi protocols in real time before your AI agent signs or sends transactions with provenance-aware safety scores from 0 to 10.
            </p>
          </Card>

          <Card padding="md" title="Guardrail Policy Engine">
            <p className="text-sm text-slate-300 leading-relaxed">
              Configurable rules enforcing single transaction caps, daily volume limits, auto de-leveraging health factors, and protocol allowlists.
            </p>
          </Card>
        </div>
      </main>

      <footer className="px-8 py-6 border-t border-slate-800/80 max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <span>SolSentry Risk Engine 2026. Open Source MIT License.</span>
        <div className="flex items-center gap-6">
          <a href="/mcp" className="text-cyan-400 hover:underline">MCP Protocol Guide</a>
          <span className="text-cyan-400 font-semibold">PWA Ready &amp; Live</span>
        </div>
      </footer>
    </div>
  );
}
