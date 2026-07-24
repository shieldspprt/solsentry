import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { sanitizeText } from '../../../../lib/validation';

// Registered agents are whatever is actually in the store — an empty list is a
// truthful answer. Sample agents used to be returned here and rendered as if
// real users had registered them.
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('agents').select('*');
    if (error) {
      return NextResponse.json(
        { error: 'store_unavailable', message: error.message, agents: [] },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(data || [], {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'store_unavailable', message: err?.message || 'Agent store unreachable', agents: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
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
