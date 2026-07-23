import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-admin';
import { logger } from '../../../../../lib/logger';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || typeof sub.endpoint !== 'string' || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'invalid_input', message: 'Invalid push subscription payload' }, { status: 400 });
    }

    let userId = body?.userId && typeof body.userId === 'string' ? body.userId.trim() : null;
    let agentId = body?.agentId && typeof body.agentId === 'string' ? body.agentId.trim() : null;

    if (userId && !UUID_REGEX.test(userId)) {
      userId = null;
    }
    if (agentId && !UUID_REGEX.test(agentId)) {
      agentId = null;
    }

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          agent_id: agentId,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
        },
        { onConflict: 'endpoint' }
      );
      logger.info('push_subscription_registered', { endpoint: sub.endpoint.slice(0, 30), userId, agentId });
    } catch (err: any) {
      logger.warn('push_subscription_upsert_failed', { error: err.message });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error('push_subscribe_handler_failed', { error: err.message });
    return NextResponse.json({ error: 'invalid_request', message: 'Failed to process push subscription' }, { status: 400 });
  }
}
