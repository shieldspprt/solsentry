import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchAnomalyAlerts } from '../../../../lib/anomaly-alerts';
import { AnomalyPersistence, WebhookSubscriptionRecord } from '../../../../lib/anomaly-persistence';
import { AnomalyEvent } from '../../../../lib/types';

function anomaly(): AnomalyEvent {
  return {
    id: 'ano_usdc_usd_1785110700000',
    type: 'oracle_anomaly',
    feed: 'USDC_USD',
    severity: 'critical',
    score: 95,
    summary: 'Critical oracle anomaly on USDC_USD.',
    feature_contributions: [],
    baseline_window: {
      method: 'rolling_median_mad+ewma',
      window_size: 72,
      min_samples: 8,
      observations: {},
    },
    timestamp: '2026-07-27T00:05:00.000Z',
    source: 'pyth:hermes',
    provenance: {
      source: 'pyth:hermes',
      as_of: '2026-07-27T00:04:59.000Z',
      received_at: '2026-07-27T00:05:00.000Z',
      previous_as_of: null,
      confidence: 0.95,
    },
    telemetry: {
      price: 0.97,
      confidence_bps: 2,
      staleness_ms: 1_000,
      slot_lag_ms: 1_000,
      price_return_bps: -300,
      stablecoin_depeg_bps: 300,
    },
  };
}

function persistence(urls: string[]): AnomalyPersistence {
  return {
    loadDetectorState: vi.fn(async () => null),
    saveDetectorState: vi.fn(async () => undefined),
    claimAnomalyEvent: vi.fn(async () => true),
    listWebhookUrls: vi.fn(async () => urls),
    createWebhookSubscription: vi.fn(async () => ({} as WebhookSubscriptionRecord)),
    listWebhookSubscriptions: vi.fn(async () => []),
    recordWebhookDelivery: vi.fn(async () => undefined),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('anomaly webhook dispatch', () => {
  it('fans out to persisted and static callbacks once per unique URL and records results', async () => {
    const store = persistence([
      'https://alerts.example.com/hook',
      'https://second.example.com/hook',
    ]);
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await dispatchAnomalyAlerts(anomaly(), {
      persistence: store,
      env: {
        NODE_ENV: 'production',
        ANOMALY_WEBHOOK_URLS: 'https://alerts.example.com/hook',
      } as NodeJS.ProcessEnv,
    });

    expect(result).toEqual({ webhook_deliveries: 2, webhook_failures: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.recordWebhookDelivery).toHaveBeenCalledTimes(2);
  });

  it('rejects insecure static callbacks in production', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await dispatchAnomalyAlerts(anomaly(), {
      persistence: null,
      env: { NODE_ENV: 'production', ANOMALY_WEBHOOK_URLS: 'http://localhost:3001/hook' } as NodeJS.ProcessEnv,
    });

    expect(result).toEqual({ webhook_deliveries: 0, webhook_failures: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
