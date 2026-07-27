import {
  NewWebhookSubscription,
  WEBHOOK_EVENT_TYPES,
  WebhookEventType,
} from './anomaly-persistence';
import { normalizeWebhookUrl } from './webhook-url';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_SET = new Set<string>(WEBHOOK_EVENT_TYPES);

export class WebhookSubscriptionValidationError extends Error {}

function callbackUrl(raw: unknown, production: boolean): string {
  try {
    return normalizeWebhookUrl(raw, production);
  } catch (error) {
    throw new WebhookSubscriptionValidationError(
      error instanceof Error ? error.message : 'url is not a valid callback URL'
    );
  }
}

function eventTypes(raw: unknown): WebhookEventType[] {
  if (raw == null) return ['liquidation_risk', 'depeg', 'oracle_anomaly'];
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > WEBHOOK_EVENT_TYPES.length) {
    throw new WebhookSubscriptionValidationError('events must be a non-empty array of supported event names');
  }
  const unique = [...new Set(raw)];
  if (unique.some((event) => typeof event !== 'string' || !EVENT_SET.has(event))) {
    throw new WebhookSubscriptionValidationError(`events contains an unsupported event; allowed: ${WEBHOOK_EVENT_TYPES.join(', ')}`);
  }
  return unique as WebhookEventType[];
}

export function parseWebhookSubscription(
  body: unknown,
  context: { userId: string | null; production: boolean }
): NewWebhookSubscription {
  if (!body || typeof body !== 'object') {
    throw new WebhookSubscriptionValidationError('request body must be a JSON object');
  }
  const input = body as Record<string, unknown>;
  const agentId = typeof input.agentId === 'string' && input.agentId.trim() ? input.agentId.trim() : null;
  if (agentId && !UUID_REGEX.test(agentId)) {
    throw new WebhookSubscriptionValidationError('agentId must be a UUID');
  }
  const walletAddress =
    typeof input.walletAddress === 'string' && input.walletAddress.trim() ? input.walletAddress.trim() : null;
  if (walletAddress && (walletAddress.length < 32 || walletAddress.length > 64)) {
    throw new WebhookSubscriptionValidationError('walletAddress is not a valid Solana address length');
  }
  const threshold = input.thresholdHf == null ? null : Number(input.thresholdHf);
  if (threshold != null && (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100)) {
    throw new WebhookSubscriptionValidationError('thresholdHf must be a positive number no greater than 100');
  }

  return {
    user_id: context.userId,
    agent_id: agentId,
    url: callbackUrl(input.url, context.production),
    events: eventTypes(input.events),
    wallet_address: walletAddress,
    threshold_hf: threshold,
  };
}
