import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 });
    }

    try {
      const supabase = getSupabaseAdmin();
      const userId = body?.userId && typeof body.userId === 'string' ? body.userId.trim() : null;
      const agentId = body?.agentId && typeof body.agentId === 'string' ? body.agentId.trim() : null;

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
    } catch {
      // In-memory or fallback mode
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
