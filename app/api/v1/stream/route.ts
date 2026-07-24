import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const customStream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Initial connection event
      sendEvent('connected', {
        status: 'active',
        stream: 'solsentry_live_risk',
        timestamp: new Date().toISOString(),
      });

      // Stream continuous live risk telemetry events
      const interval = setInterval(() => {
        const mockEvents = [
          {
            type: 'oracle_heartbeat',
            protocol: 'kamino',
            oracle: 'pyth',
            status: 'healthy',
            solUsd: 148.5 + (Math.random() * 0.4 - 0.2),
            timestamp: new Date().toISOString(),
          },
          {
            type: 'liquidation_warning',
            protocol: 'marginfi',
            positionId: `pos_${Math.floor(Math.random() * 9000 + 1000)}`,
            healthFactor: 1.12,
            actionRequired: 'DELEVERAGE',
            timestamp: new Date().toISOString(),
          },
          {
            type: 'risk_score_update',
            protocol: 'drift',
            compositeScore: 7.9,
            riskTier: 'low',
            timestamp: new Date().toISOString(),
          },
        ];

        const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
        sendEvent('telemetry', randomEvent);
      }, 3000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
