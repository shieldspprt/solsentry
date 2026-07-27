import React from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { APP_VERSION } from '../lib/version';

export default function LandingPage() {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://solsentry.netlify.app';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SolSentry',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Solana Network',
    description:
      'A transaction guard for Solana AI agents. It simulates a transaction before signing, detects wallet drainer patterns, scores protocol risk from live sources, and streams explainable oracle anomaly events. Available over MCP, a TypeScript SDK, a CLI, and REST.',
    softwareVersion: APP_VERSION,
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
      {/* See app/layout.tsx: JSON-LD as a child breaks hydration. */}
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
            API &amp; SDK Docs
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
          v{APP_VERSION} · Drainer detection, exploit gating, live oracle anomaly detection
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-100 tracking-tight leading-tight">
          Never sign a drainer. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            One call, before your agent signs.
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
          SolSentry runs your agent&apos;s transaction against Solana mainnet without broadcasting it. It tells you exactly which
          tokens leave the wallet, whether the instruction sequence matches a known wallet drainer, and whether the protocol
          itself is safe to touch. One request returns a single verdict: <strong className="text-slate-100">sign</strong> or{' '}
          <strong className="text-slate-100">do not sign</strong>.
        </p>

        {/* The one call that matters, shown first */}
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left font-mono text-xs shadow-xl">
          <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-2">
            Before your agent signs
          </span>
          <div className="text-cyan-300">const verdict = await sentry.guard(&#123; transaction, protocolSlug: &apos;kamino&apos; &#125;);</div>
          <div className="text-rose-300">{'if (!verdict.proceed) return;   // do not sign'}</div>
          <div className="text-slate-500 mt-2">POST /api/v1/guard   ·   solsentry_guard_transaction over MCP</div>
          <div className="text-slate-500 mt-1">
            Watching for trouble between calls: <span className="text-slate-400">GET /api/v1/stream</span> streams telemetry and
            explainable oracle anomaly events.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a href="/dashboard">
            <Button variant="primary" size="lg">
              Launch App
            </Button>
          </a>
          <a href="/docs">
            <Button variant="secondary" size="lg">
              API &amp; SDK Docs
            </Button>
          </a>
          <a href="/mcp">
            <Button variant="secondary" size="lg">
              MCP Tools Reference
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left">
          <Card padding="md" title="One verdict before signing">
            <p className="text-sm text-slate-300 leading-relaxed">
              <code>guard_transaction</code> simulates the actual bytes, scans for drainer patterns, and folds in protocol risk and
              policy guardrails. It is the only tool here that inspects the transaction you are about to sign, so nothing else can
              copy it from public APIs.
            </p>
          </Card>

          <Card padding="md" title="Drainer signals you can trust">
            <p className="text-sm text-slate-300 leading-relaxed">
              A routine SPL transfer inside a swap is not a drainer. Inner CPI transfers are now reported as observations with zero
              penalty, and only escalate when corroborated by an authority mutation or a measured balance sweep. Typed SPL Token and
              Token&#8209;2022 parsing, address lookup table resolution, and native payer accounting back the call.
            </p>
          </Card>

          <Card padding="md" title="Realized exploit history">
            <p className="text-sm text-slate-300 leading-relaxed">
              Every protocol is checked against DeFiLlama&apos;s hacks dataset. A loss above $10M inside 180 days forces a{' '}
              <strong>block</strong> verdict no matter how healthy the other factors look. It is the one signal that describes what
              has already happened, not how a protocol appears.
            </p>
          </Card>

          <Card padding="md" title="Provenance on every factor">
            <p className="text-sm text-slate-300 leading-relaxed">
              Eight risk factors, each tagged with its data source, timestamp, and confidence. Anything we cannot measure is
              reported as unmeasured and dropped from the score. Below 50% coverage the engine withholds a verdict instead of
              guessing.
            </p>
          </Card>

          <Card padding="md" title="MCP, SDK, CLI, REST">
            <p className="text-sm text-slate-300 leading-relaxed">
              Nine <code>solsentry_*</code> tools over MCP for Claude, Cursor, and any MCP client. A TypeScript SDK
              (<code>@npmsolsentry/sdk</code>) and CLI (<code>@npmsolsentry/cli</code>) for everything else. One engine, four surfaces.
            </p>
          </Card>

          <Card padding="md" title="Pay per call in USDC">
            <p className="text-sm text-slate-300 leading-relaxed">
              Native Solana Pay micropayments through the <code>X-402-Payment</code> header. A guard call costs a few cents, sized
              so a safety check is never worth skipping. Billing stays off until you configure a wallet.
            </p>
          </Card>

          <Card padding="md" title="Explainable oracle anomalies">
            <p className="text-sm text-slate-300 leading-relaxed">
              A per feed rolling median/MAD and EWMA baseline scores price returns, confidence band expansion, staleness, slot lag,
              and stablecoin de&#8209;peg. Every <code>anomaly</code> event carries severity, score, and the exact feature
              contributions behind it, so an agent can act on a reason rather than a number.
            </p>
          </Card>

          <Card padding="md" title="Live oracle stream">
            <p className="text-sm text-slate-300 leading-relaxed">
              Server sent events carry live Pyth readings for SOL, USDC, and USDT: price, confidence interval width, and publish
              staleness. The dashboard also holds a <code>slotSubscribe</code> WebSocket that reconnects with jittered backoff and
              marks an idle socket unhealthy instead of showing stale network state as live.
            </p>
          </Card>

          <Card padding="md" title="Durable across cold starts">
            <p className="text-sm text-slate-300 leading-relaxed">
              Detector baselines, anomaly events, and webhook subscriptions persist in Postgres. Every SSE client in a process shares
              one poller, and deterministic event IDs are claimed before any side effect, so a serverless fleet never fires the same
              webhook twice.
            </p>
          </Card>
        </div>
      </main>

      <footer className="px-8 py-6 border-t border-slate-800/80 max-w-7xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <span>SolSentry v{APP_VERSION}. Open source, MIT licensed.</span>
        <div className="flex items-center gap-6">
          <a href="/docs" className="text-cyan-400 hover:underline">API &amp; SDK Playground</a>
          <a href="/mcp" className="text-cyan-400 hover:underline">MCP Protocol Guide</a>
          <span className="text-cyan-400 font-semibold">PWA Ready</span>
        </div>
      </footer>
    </div>
  );
}
