import { NextRequest } from 'next/server';
import { fetchOracleHealth } from '../../../../packages/core/src/data-fetchers/pyth';
import { PYTH_FEED_IDS } from '../../../../packages/core/src/constants';

export const dynamic = 'force-dynamic';

// Feeds broadcast on the heartbeat. SOL is the collateral asset behind most
// Solana leverage; the stables are the ones whose de-peg actually liquidates
// people. Every value on this stream comes from Pyth Hermes — nothing is
// synthesised. If a fetch fails we emit an explicit `source_unavailable`
// event rather than inventing a number.
const STREAM_FEEDS: Array<keyof typeof PYTH_FEED_IDS> = ['SOL_USD', 'USDC_USD', 'USDT_USD'];

const HEARTBEAT_MS = 5000;

// A widening confidence interval or a stalled publish is the real early signal
// of oracle stress. Thresholds match the scorer's health model.
function severityFor(confidenceBps: number, stalenessMs: number): 'ok' | 'degraded' | 'critical' {
  if (confidenceBps > 50 || stalenessMs > 30000) return 'critical';
  if (confidenceBps > 20 || stalenessMs > 10000) return 'degraded';
  return 'ok';
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send('connected', {
        status: 'active',
        stream: 'solsentry_oracle_telemetry',
        source: 'pyth:hermes',
        feeds: STREAM_FEEDS,
        intervalMs: HEARTBEAT_MS,
        timestamp: new Date().toISOString(),
      });

      const tick = async () => {
        if (closed) return;

        const results = await Promise.all(
          STREAM_FEEDS.map(async (symbol) => ({ symbol, health: await fetchOracleHealth(symbol) }))
        );

        for (const { symbol, health } of results) {
          if (!health) {
            send('telemetry', {
              type: 'source_unavailable',
              feed: symbol,
              source: 'pyth:hermes',
              detail: 'Pyth Hermes did not return a price update for this feed.',
              timestamp: new Date().toISOString(),
            });
            continue;
          }

          const severity = severityFor(health.confidence_bps, health.staleness_ms);
          send('telemetry', {
            type: severity === 'ok' ? 'oracle_heartbeat' : 'oracle_stress',
            feed: symbol,
            source: 'pyth:hermes',
            price: Math.round(health.price * 10000) / 10000,
            confidenceBps: health.confidence_bps,
            stalenessMs: health.staleness_ms,
            healthScore: health.health_score,
            severity,
            asOf: health.as_of,
            timestamp: new Date().toISOString(),
          });
        }
      };

      await tick();
      const interval = setInterval(() => void tick(), HEARTBEAT_MS);

      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
