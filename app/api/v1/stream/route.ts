import { NextRequest } from 'next/server';
import { oracleStreamMonitor } from '../../../../lib/oracle-monitor';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        try {
          controller.close();
        } catch {
          // The client or runtime already closed the stream.
        }
      };

      unsubscribe = oracleStreamMonitor.subscribe(({ event, data }) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          close();
        }
      });
      request.signal.addEventListener('abort', close, { once: true });
    },
    cancel() {
      if (!closed) {
        closed = true;
        unsubscribe();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
