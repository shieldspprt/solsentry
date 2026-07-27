import { AlertRecord, AnomalyEvent, AlertSeverity } from './types';
import { AnomalyPersistence, getAnomalyPersistence } from './anomaly-persistence';
import { logger } from './logger';
import { isValidWebhookUrl } from './webhook-url';

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
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((url) => isValidWebhookUrl(url, env.NODE_ENV === 'production'));
}

interface PostWebhookResult {
  ok: boolean;
  statusCode: number | null;
  error: string | null;
}

async function postWebhook(url: string, event: AnomalyEvent, timeoutMs: number): Promise<PostWebhookResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'oracle_anomaly',
        anomaly: event,
        alert: anomalyToAlert(event),
      }),
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      statusCode: response.status,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      error: error instanceof Error ? error.message.slice(0, 500) : 'request failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fan an already-claimed anomaly event out to persisted subscriptions and
 * optional environment callbacks. The monitor claims the event in Postgres
 * first, so multiple serverless instances cannot send duplicate deliveries.
 */
export async function dispatchAnomalyAlerts(
  event: AnomalyEvent,
  opts: { timeoutMs?: number; env?: NodeJS.ProcessEnv; persistence?: AnomalyPersistence | null } = {}
): Promise<AnomalyAlertDispatchResult> {
  const env = opts.env ?? process.env;
  const persistence = opts.persistence === undefined ? getAnomalyPersistence() : opts.persistence;
  let persistedUrls: string[] = [];
  if (persistence) {
    try {
      persistedUrls = await persistence.listWebhookUrls('oracle_anomaly');
    } catch (error) {
      logger.warn('anomaly_webhook_subscription_load_failed', {
        anomalyId: event.id,
        error: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }

  const urls = [...new Set([...configuredWebhookUrls(env), ...persistedUrls])].filter((url) =>
    isValidWebhookUrl(url, env.NODE_ENV === 'production')
  );
  if (urls.length === 0) return { webhook_deliveries: 0, webhook_failures: 0 };

  const results = await Promise.all(
    urls.map(async (url) => {
      const result = await postWebhook(url, event, opts.timeoutMs ?? 2500);
      if (persistence) {
        try {
          await persistence.recordWebhookDelivery(event.id, url, result);
        } catch (error) {
          logger.warn('anomaly_webhook_delivery_record_failed', {
            anomalyId: event.id,
            error: error instanceof Error ? error.message : 'unknown error',
          });
        }
      }
      return result;
    })
  );
  const webhookDeliveries = results.filter((result) => result.ok).length;
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
