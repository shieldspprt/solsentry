import { AlertRecord, AnomalyEvent, AlertSeverity } from './types';
import { logger } from './logger';

export interface AnomalyAlertDispatchResult {
  webhook_deliveries: number;
  webhook_failures: number;
}

function severityForAlert(severity: AnomalyEvent['severity']): AlertSeverity {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'warning';
  return 'info';
}

export function anomalyToAlert(event: AnomalyEvent): Omit<AlertRecord, 'agent_id' | 'user_id' | 'position_id'> & {
  agent_id: null;
  user_id: null;
  position_id: null;
} {
  return {
    id: event.id,
    agent_id: null,
    user_id: null,
    position_id: null,
    alert_type: 'oracle_anomaly',
    severity: severityForAlert(event.severity),
    message: event.summary,
    is_read: false,
    created_at: event.timestamp,
  };
}

function configuredWebhookUrls(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.ANOMALY_WEBHOOK_URLS || env.ANOMALY_WEBHOOK_URL || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((url) => {
      try {
        const parsed = new URL(url);
        if (parsed.username || parsed.password) return false;
        if (env.NODE_ENV === 'production') return parsed.protocol === 'https:';
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    });
}

async function postWebhook(url: string, event: AnomalyEvent, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'oracle_anomaly',
        anomaly: event,
        alert: anomalyToAlert(event),
      }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// Best-effort optional fanout. SSE/dashboard delivery is the primary path;
// webhook fanout is enabled only when ANOMALY_WEBHOOK_URL(S) is configured.
export async function dispatchAnomalyAlerts(
  event: AnomalyEvent,
  opts: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}
): Promise<AnomalyAlertDispatchResult> {
  const urls = configuredWebhookUrls(opts.env);
  if (urls.length === 0) return { webhook_deliveries: 0, webhook_failures: 0 };

  const results = await Promise.all(urls.map((url) => postWebhook(url, event, opts.timeoutMs ?? 2500)));
  const webhookDeliveries = results.filter(Boolean).length;
  const webhookFailures = results.length - webhookDeliveries;

  if (webhookFailures > 0) {
    logger.warn('anomaly_webhook_delivery_partial_failure', {
      anomalyId: event.id,
      deliveries: webhookDeliveries,
      failures: webhookFailures,
    });
  }

  return { webhook_deliveries: webhookDeliveries, webhook_failures: webhookFailures };
}
