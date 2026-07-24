import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { sanitizeText } from '../../../../lib/validation';
import { DEFAULT_SOLANA_AGENTS } from '../../../../lib/default-agents';

export async function GET() {
  try {
    let agents = DEFAULT_SOLANA_AGENTS;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data, error } = await supabase.from('agents').select('*');
      if (!error && data && data.length > 0) {
        agents = data as any;
      }
    }
    return NextResponse.json(agents, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' },
    });
  } catch {
    return NextResponse.json(DEFAULT_SOLANA_AGENTS, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = sanitizeText(body?.name || '');
    const description = body?.description ? sanitizeText(body.description) : null;
    const userId = body?.userId ? sanitizeText(body.userId) : null;

    if (!name) {
      return NextResponse.json(
        { error: 'invalid_input', message: 'Agent name is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: true, agent: { name, description } });
    }

    const { data, error } = await supabase
      .from('agents')
      .insert({
        user_id: userId,
        name,
        description,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'database_error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'internal_error', message: err.message || 'Failed to register agent' },
      { status: 500 }
    );
  }
}
