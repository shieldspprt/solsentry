import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';

export async function GET() {
  try {
    let protocols = DEFAULT_SOLANA_PROTOCOLS;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase
        .from('protocols')
        .select('*')
        .order('risk_score', { ascending: false });

      if (!error && data && data.length > 0) {
        protocols = data as any;
      }
    }

    const headers = new Headers();
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');

    return NextResponse.json(protocols, { status: 200, headers });
  } catch {
    return NextResponse.json(DEFAULT_SOLANA_PROTOCOLS, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' },
    });
  }
}
