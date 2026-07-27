import { describe, expect, it } from 'vitest';
import {
  parseWebhookSubscription,
  WebhookSubscriptionValidationError,
} from '../../../../lib/webhook-subscriptions';

const userId = '550e8400-e29b-41d4-a716-446655440000';

describe('webhook subscription validation', () => {
  it('normalizes and returns a persistable authenticated subscription', () => {
    expect(
      parseWebhookSubscription(
        {
          url: 'https://alerts.example.com/solsentry',
          events: ['oracle_anomaly', 'depeg', 'oracle_anomaly'],
          agentId: '76b2647f-7813-49d9-8a9d-f00d67f00d67',
          walletAddress: '11111111111111111111111111111111',
          thresholdHf: 1.2,
        },
        { userId, production: true }
      )
    ).toEqual({
      user_id: userId,
      agent_id: '76b2647f-7813-49d9-8a9d-f00d67f00d67',
      url: 'https://alerts.example.com/solsentry',
      events: ['oracle_anomaly', 'depeg'],
      wallet_address: '11111111111111111111111111111111',
      threshold_hf: 1.2,
    });
  });

  it('uses documented defaults when events are omitted', () => {
    const parsed = parseWebhookSubscription(
      { url: 'http://localhost:4000/hook' },
      { userId: null, production: false }
    );
    expect(parsed.events).toEqual(['liquidation_risk', 'depeg', 'oracle_anomaly']);
  });

  it('rejects insecure production callbacks, credentials, and unknown events', () => {
    expect(() =>
      parseWebhookSubscription({ url: 'http://alerts.example.com/hook' }, { userId, production: true })
    ).toThrow(WebhookSubscriptionValidationError);
    expect(() =>
      parseWebhookSubscription({ url: 'https://user:secret@alerts.example.com/hook' }, { userId, production: true })
    ).toThrow('credentials');
    expect(() =>
      parseWebhookSubscription({ url: 'https://127.0.0.1/hook' }, { userId, production: true })
    ).toThrow('private network');
    expect(() =>
      parseWebhookSubscription(
        { url: 'https://alerts.example.com/hook', events: ['made_up_event'] },
        { userId, production: true }
      )
    ).toThrow('unsupported event');
  });
});
