import { NextRequest, NextResponse } from 'next/server';
import { simulateSolanaTransaction } from '../../../../packages/core/src/simulation/tx-simulator';
import { logger } from '../../../../lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transaction = body?.transaction || body?.tx || '';
    const encoding = body?.encoding === 'base64' ? 'base64' : 'base58';

    if (!transaction || typeof transaction !== 'string') {
      return NextResponse.json(
        { error: 'invalid_input', message: 'transaction (base58 or base64 string) is required' },
        { status: 400 }
      );
    }

    const userId = request.headers.get('x-solsentry-user-id');
    const result = await simulateSolanaTransaction(transaction, encoding);

    logger.info('tx_simulated', { userId, success: result.success, unitsConsumed: result.unitsConsumed });

    return NextResponse.json(result);
  } catch (err: any) {
    logger.error('tx_simulation_route_error', { error: err.message });
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to simulate transaction: ' + err.message },
      { status: 500 }
    );
  }
}
