import { describe, expect, it, vi } from 'vitest';
import { AnomalyPersistence, WebhookSubscriptionRecord } from '../../../../lib/anomaly-persistence';
import { oracleSampleBucket, OracleStreamMonitor } from '../../../../lib/oracle-monitor';
import { AnomalyEvent } from '../../../../lib/types';

function persistence(claim = true): AnomalyPersistence {
  return {
    loadDetectorState: vi.fn(async () => null),
    saveDetectorState: vi.fn(async () => undefined),
    claimAnomalyEvent: vi.fn(async () => claim),
    listWebhookUrls: vi.fn(async () => []),
    createWebhookSubscription: vi.fn(async () => ({} as WebhookSubscriptionRecord)),
    listWebhookSubscriptions: vi.fn(async () => []),
    recordWebhookDelivery: vi.fn(async () => undefined),
  };
}

describe('OracleStreamMonitor', () => {
  it('aligns sampling timestamps across serverless instances', () => {
    expect(oracleSampleBucket(new Date('2026-07-27T12:00:04.999Z'))).toBe('2026-07-27T12:00:00.000Z');
    expect(oracleSampleBucket(new Date('2026-07-27T12:00:05.001Z'))).toBe('2026-07-27T12:00:05.000Z');
  });

  it('shares one poll across multiple SSE subscribers and dispatches a claimed event once', async () => {
    const store = persistence(true);
    const fetchHealth = vi.fn(async () => ({
      symbol: 'USDC_USD',
      price: 0.97,
      confidence_bps: 2,
      staleness_ms: 45_000,
      slot_lag_ms: 45_000,
      health_score: 2,
      as_of: '2026-07-27T11:59:15.000Z',
    }));
    const dispatch = vi.fn(async (_event: AnomalyEvent) => undefined);
    const monitor = new OracleStreamMonitor({
      feeds: ['USDC_USD'],
      persistence: store,
      fetchHealth,
      dispatchAlerts: dispatch,
      clock: () => new Date('2026-07-27T12:00:02.000Z'),
    });
    const first: string[] = [];
    const second: string[] = [];
    const unsubscribeFirst = monitor.subscribe((message) => first.push(message.event));
    const unsubscribeSecond = monitor.subscribe((message) => second.push(message.event));

    await monitor.pollOnce();
    unsubscribeFirst();
    unsubscribeSecond();

    expect(fetchHealth).toHaveBeenCalledTimes(1);
    expect(store.loadDetectorState).toHaveBeenCalledTimes(1);
    expect(store.saveDetectorState).toHaveBeenCalledTimes(1);
    expect(store.claimAnomalyEvent).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(first).toContain('anomaly');
    expect(second).toContain('anomaly');
  });

  it('broadcasts an anomaly locally but does not fan out when another instance claimed it', async () => {
    const store = persistence(false);
    const dispatch = vi.fn(async (_event: AnomalyEvent) => undefined);
    const monitor = new OracleStreamMonitor({
      feeds: ['SOL_USD'],
      persistence: store,
      fetchHealth: async () => ({
        symbol: 'SOL_USD',
        price: 150,
        confidence_bps: 80,
        staleness_ms: 1_000,
        slot_lag_ms: 1_000,
        health_score: 3,
        as_of: '2026-07-27T12:00:00.000Z',
      }),
      dispatchAlerts: dispatch,
      clock: () => new Date('2026-07-27T12:00:07.000Z'),
    });

    await monitor.pollOnce();

    expect(store.claimAnomalyEvent).toHaveBeenCalledTimes(1);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
