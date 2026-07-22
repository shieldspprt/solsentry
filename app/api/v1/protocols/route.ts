import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: protocols, error } = await supabase
      .from('protocols')
      .select('slug, name, category, risk_score, audit_status, oracle_health, tvl_usd')
      .order('risk_score', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch protocol list' }, { status: 500 });
    }

    const headers = new Headers();
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');

    return NextResponse.json(
      { count: protocols.length, protocols },
      { status: 200, headers }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
