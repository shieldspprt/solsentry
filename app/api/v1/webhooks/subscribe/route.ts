import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../../../../lib/logger';

export interface WebhookSubscriptionRequest {
  url: string;
  events: Array<'liquidation_risk' | 'health_factor_low' | 'depeg' | 'protocol_exploit' | 'oracle_down'>;
  walletAddress?: string;
  agentId?: string;
  thresholdHf?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: WebhookSubscriptionRequest = await request.json();

    if (!body?.url || typeof body.url !== 'string') {
      return NextResponse.json(
        { error: 'invalid_input', message: 'url (HTTPS callback URL) is required' },
        { status: 400 }
      );
    }

    try {
      const parsedUrl = new URL(body.url);
      if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'invalid_input', message: 'url must use HTTPS protocol in production' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'invalid_input', message: 'url is not a valid URL string' },
        { status: 400 }
      );
    }

    const events = Array.isArray(body.events) && body.events.length > 0 ? body.events : ['liquidation_risk', 'depeg'];
    const subscriptionId = `sub_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

    logger.info('webhook_subscribed', {
      subscriptionId,
      url: body.url,
      events,
      agentId: body.agentId,
      walletAddress: body.walletAddress,
    });

    return NextResponse.json({
      subscriptionId,
      status: 'active',
      url: body.url,
      events,
      agentId: body.agentId || null,
      walletAddress: body.walletAddress || null,
      registeredAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('webhook_subscribe_failed', { error: err.message });
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to create webhook subscription: ' + err.message },
      { status: 500 }
    );
  }
}
