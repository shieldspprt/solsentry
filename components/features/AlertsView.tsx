'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AlertRecord } from '../../lib/types';
import { formatDate } from '../../lib/formatters';
import { useSolanaSlotStream } from '../../hooks/use-solana-slot-stream';

export interface AlertsViewProps {
  /** Stored alerts, when a position store is configured. Never sample data. */
  alerts?: AlertRecord[];
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts = [] }) => {
  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const [anomalyEvents, setAnomalyEvents] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const slotStream = useSolanaSlotStream();

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/v1/stream');
      setIsStreaming(true);

      eventSource.addEventListener('telemetry', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setStreamEvents((prev) => [data, ...prev.slice(0, 9)]);
        } catch {
          // Ignore
        }
      });

      eventSource.addEventListener('anomaly', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setAnomalyEvents((prev) => [data, ...prev.slice(0, 9)]);
        } catch {
          // Ignore
        }
      });

      eventSource.onerror = () => {
        setIsStreaming(false);
      };
    } catch {
      setIsStreaming(false);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Alerts</h2>
          <p className="text-sm text-slate-300 mt-1">Real time feed of position risks and live streaming telemetry</p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <Badge variant={isStreaming ? 'low' : 'info'}>
            {isStreaming ? '⚡ Oracle Stream Connected' : 'Oracle Stream Re-connecting'}
          </Badge>
          {anomalyEvents.length > 0 && (
            <Badge variant={anomalyEvents[0]?.severity === 'critical' ? 'critical' : 'high'}>
              {anomalyEvents.length} live anomaly{anomalyEvents.length === 1 ? '' : 'ies'}
            </Badge>
          )}
          <Badge variant={slotStream.status === 'connected' ? 'low' : 'info'}>
            {slotStream.status === 'connected'
              ? `◉ Solana WS · slot ${slotStream.lastSlot?.slot ?? '—'}`
              : slotStream.status === 'unavailable'
                ? 'Solana WS unavailable'
                : 'Solana WS connecting'}
          </Badge>
        </div>
      </div>

      <Card
        title="Live Anomaly Detection"
        subtitle="Explainable online baseline per feed: rolling median/MAD plus EWMA variance over price returns, confidence-band expansion, oracle staleness, slot lag, and stablecoin de-peg deviation. Events are emitted on the same SSE stream as `event: anomaly`."
      >
        {anomalyEvents.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            No anomaly events in this browser session. The detector is still learning per-feed baselines and will alert on guardrail breaches immediately.
          </div>
        ) : (
          <div className="space-y-3">
            {anomalyEvents.map((evt, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-xs ${
                  evt.severity === 'critical' ? 'bg-red-950/35 border-red-800/70' : 'bg-amber-950/35 border-amber-800/70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${evt.severity === 'critical' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <span className={`font-bold uppercase ${evt.severity === 'critical' ? 'text-red-300' : 'text-amber-300'}`}>
                      {evt.severity} anomaly
                    </span>
                    <span className="font-mono text-slate-200">{evt.feed}</span>
                    <span className="font-mono text-slate-500">score {evt.score}/100</span>
                  </div>
                  <span className="font-mono text-slate-500">{new Date(evt.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
                <p className="mt-2 text-sm text-slate-200 font-semibold">{evt.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(evt.feature_contributions || []).slice(0, 4).map((c: any) => (
                    <span key={c.key} className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1 font-mono text-slate-300">
                      {c.label}: {c.value} {c.unit}
                      {typeof c.robust_z === 'number' ? ` · z ${c.robust_z}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Live SSE Stream Event Feed — every value below comes from Pyth Hermes */}
      <Card
        title="Live Oracle Telemetry (/api/v1/stream)"
        subtitle="Server-Sent Events carrying Pyth Hermes price, confidence-interval width, and publish staleness. A widening confidence band is the earliest signal of oracle-driven liquidation risk."
      >
        {streamEvents.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            {isStreaming ? 'Waiting for the first Pyth heartbeat…' : 'Stream unavailable — no oracle telemetry is being received.'}
          </div>
        ) : (
          <div className="space-y-3">
            {streamEvents.map((evt, idx) => {
              const unavailable = evt.type === 'source_unavailable';
              const stressed = evt.severity && evt.severity !== 'ok';
              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
                    unavailable
                      ? 'bg-slate-900/60 border-slate-700'
                      : stressed
                      ? 'bg-amber-950/40 border-amber-800/70'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${
                        unavailable ? 'bg-slate-500' : stressed ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                    <span className={`font-bold uppercase ${unavailable ? 'text-slate-400' : stressed ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {evt.type}
                    </span>
                    <span className="text-slate-300">{evt.feed}</span>
                    <span className="text-slate-500 normal-case">{evt.source}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {typeof evt.price === 'number' && <span className="text-slate-100 font-bold">${evt.price.toFixed(4)}</span>}
                    {typeof evt.confidenceBps === 'number' && (
                      <span className="text-slate-300">conf {evt.confidenceBps} bps</span>
                    )}
                    {typeof evt.stalenessMs === 'number' && (
                      <span className="text-slate-400">age {(evt.stalenessMs / 1000).toFixed(1)}s</span>
                    )}
                    <span className="text-slate-500">{new Date(evt.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        title="Solana Network Stream (WebSocket)"
        subtitle="Direct JSON-RPC slotSubscribe connection to the configured Solana RPC. It reconnects with jittered backoff and marks an idle socket unhealthy rather than presenting stale network state as live."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-1 text-sm">
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                slotStream.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold text-slate-100">
              {slotStream.status === 'connected' ? 'Receiving slot notifications' : 'Waiting for subscription'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-slate-400">
            <span>slot {slotStream.lastSlot?.slot ?? '—'}</span>
            <span>root {slotStream.lastSlot?.root ?? '—'}</span>
            <span>
              {slotStream.lastMessageAt
                ? `updated ${new Date(slotStream.lastMessageAt).toLocaleTimeString()}`
                : slotStream.reconnectAttempt > 0
                  ? `retry ${slotStream.reconnectAttempt}`
                  : 'connecting'}
            </span>
          </div>
        </div>
      </Card>

      {alerts.length === 0 ? (
        <Card padding="lg" className="text-center py-16">
          <p className="text-base font-bold text-slate-200">All Systems Clear</p>
          <p className="text-sm text-slate-400 mt-1">No active position warnings or protocol exploits reported.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} padding="md" className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Badge variant={alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'high' : 'info'}>
                    {alert.alert_type}
                  </Badge>
                  <span className="text-xs text-slate-300 font-semibold">{formatDate(alert.created_at)}</span>
                </div>
                <p className="text-base font-semibold text-slate-100">{alert.message}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
