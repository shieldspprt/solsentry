'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AlertRecord } from '../../lib/types';
import { formatDate } from '../../lib/formatters';

export interface AlertsViewProps {
  alerts?: AlertRecord[];
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts = [] }) => {
  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

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
        <div className="flex items-center gap-3">
          <Badge variant={isStreaming ? 'low' : 'info'}>
            {isStreaming ? '⚡ Live Stream Connected' : 'Stream Re-connecting'}
          </Badge>
        </div>
      </div>

      {/* Live SSE Stream Event Feed */}
      <Card title="Live Streaming Telemetry Engine (/api/v1/stream)" subtitle="Continuous Server-Sent Events (SSE) broadcasting oracle heartbeats and liquidation warnings">
        {streamEvents.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            Connecting to live SSE stream endpoint...
          </div>
        ) : (
          <div className="space-y-3">
            {streamEvents.map((evt, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                  <span className="font-bold text-cyan-300 uppercase">{evt.type}</span>
                  <span className="text-slate-300">{evt.protocol || evt.stream || 'SolSentry Engine'}</span>
                </div>
                <div className="flex items-center gap-4">
                  {evt.solUsd && <span className="text-slate-200">SOL: ${evt.solUsd.toFixed(2)}</span>}
                  {evt.healthFactor && <span className="text-rose-400 font-bold">HF: {evt.healthFactor}</span>}
                  <span className="text-slate-500">{new Date(evt.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
