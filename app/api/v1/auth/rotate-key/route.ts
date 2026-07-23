import { NextRequest, NextResponse } from 'next/server';
import { rotateApiKey, verifyApiKey } from '../../../../../lib/api-key';
import { logger } from '../../../../../lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const apiKeyHeader = request.headers.get('x-solsentry-api-key');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : apiKeyHeader;

    const userIdHeader = request.headers.get('x-solsentry-user-id');
    let userId = userIdHeader || null;

    if (!userId && token) {
      userId = await verifyApiKey(token);
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required to rotate API key.' },
        { status: 401 }
      );
    }

    const { key, prefix } = await rotateApiKey(userId);
    logger.info('api_key_rotated', { userId, prefix });

    return NextResponse.json({
      success: true,
      apiKey: key,
      apiKeyPrefix: prefix,
      message: 'New API key generated successfully. Store this key securely; it will not be displayed again.',
    });
  } catch (err: any) {
    logger.error('api_key_rotation_failed', { error: err.message });
    return NextResponse.json(
      { error: 'internal_error', message: 'Failed to rotate API key.' },
      { status: 500 }
    );
  }
}
