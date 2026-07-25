import { NextRequest, NextResponse } from 'next/server';
import { handleGuardTransaction } from '../../../../packages/mcp-server/src/tools/guard-transaction';
import { enforcePayment } from '../../../../lib/x402';
import { logger } from '../../../../lib/logger';

// The pre-signing guard, over REST. Simulates the transaction, scans for
// drainer patterns, and (optionally) folds in protocol risk + policy — one
// SIGN / DO_NOT_SIGN verdict. This is the metered, differentiated endpoint.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transaction = body?.transaction || body?.tx || '';
    if (!transaction || typeof transaction !== 'string') {
      return NextResponse.json(
        { error: 'invalid_input', message: 'transaction (base58 or base64 string) is required' },
        { status: 400 }
      );
    }

    // Priced like a preflight — it does simulation plus protocol/policy work.
    const gate = await enforcePayment('preflight', request.headers.get('x-402-payment'));
    if (!gate.allowed) {
      return NextResponse.json(
        { error: 'payment_required', message: gate.paymentRequired?.reason, x402: gate.paymentRequired },
        { status: 402, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const result = await handleGuardTransaction({
      transaction,
      encoding: body?.encoding === 'base64' ? 'base64' : 'base58',
      protocolSlug: body?.protocolSlug,
      action: body?.action,
      amountUsd: body?.amountUsd,
      currentDailyVolumeUsd: body?.currentDailyVolumeUsd,
      currentDrawdownPct: body?.currentDrawdownPct,
      openPositionsCount: body?.openPositionsCount,
    });

    if ((result as any).isError) {
      return NextResponse.json({ error: 'guard_failed', message: (result as any).error }, { status: 400 });
    }

    logger.info('guard_transaction', {
      verdict: (result as any).verdict,
      protocolSlug: body?.protocolSlug,
      blocking: (result as any).blockingReasons?.length ?? 0,
    });

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    logger.error('guard_route_error', { error: err?.message });
    return NextResponse.json({ error: 'internal_error', message: err?.message }, { status: 500 });
  }
}
