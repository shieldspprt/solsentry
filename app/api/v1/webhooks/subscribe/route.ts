import { NextRequest, NextResponse } from 'next/server';
import { getAnomalyPersistence } from '../../../../../lib/anomaly-persistence';
import { logger } from '../../../../../lib/logger';
import {
  parseWebhookSubscription,
  WebhookSubscriptionValidationError,
} from '../../../../../lib/webhook-subscriptions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const persistence = getAnomalyPersistence();
    if (!persistence) {
      return NextResponse.json(
        { error: 'service_unavailable', message: 'Webhook persistence is not configured' },
        { status: 503 }
      );
    }

    const userId = request.headers.get('x-solsentry-user-id');
    const input = parseWebhookSubscription(await request.json(), {
      userId,
      production: process.env.NODE_ENV === 'production',
    });
    const subscription = await persistence.createWebhookSubscription(input);

    logger.info('webhook_subscribed', {
      subscriptionId: subscription.id,
      events: subscription.events,
      userId,
      agentId: subscription.agent_id,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.is_active ? 'active' : 'inactive',
      url: subscription.url,
      events: subscription.events,
      agentId: subscription.agent_id,
      walletAddress: subscription.wallet_address,
      registeredAt: subscription.created_at,
      updatedAt: subscription.updated_at,
    });
  } catch (error) {
    if (error instanceof WebhookSubscriptionValidationError) {
      return NextResponse.json({ error: 'invalid_input', message: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'unknown error';
    logger.error('webhook_subscribe_failed', { error: message });
    return NextResponse.json(
      { error: 'persistence_error', message: 'Failed to persist webhook subscription' },
      { status: 503 }
    );
  }
}

/** List persisted callbacks belonging to the authenticated API-key owner. */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-solsentry-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized', message: 'An attributed API key is required' }, { status: 401 });
  }
  try {
    const persistence = getAnomalyPersistence();
    if (!persistence) {
      return NextResponse.json(
        { error: 'service_unavailable', message: 'Webhook persistence is not configured' },
        { status: 503 }
      );
    }
    const subscriptions = await persistence.listWebhookSubscriptions(userId);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    logger.error('webhook_subscription_list_failed', {
      error: error instanceof Error ? error.message : 'unknown error',
      userId,
    });
    return NextResponse.json(
      { error: 'persistence_error', message: 'Failed to list webhook subscriptions' },
      { status: 503 }
    );
  }
}
