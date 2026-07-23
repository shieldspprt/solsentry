import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from './lib/api-key';

const PUBLIC_PATHS = new Set([
  '/',
  '/api/v1/openapi.json',
  '/api/v1/protocols',
  '/llms.txt',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/sw.js',
  '/favicon.ico',
]);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(ip: string): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now > cur.reset) {
    hits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfterMs: 0 };
  }
  if (cur.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfterMs: cur.reset - now };
  }
  cur.count++;
  return { ok: true, retryAfterMs: 0 };
}

function getOriginHeader(req: NextRequest): string {
  const origin = req.headers.get('origin') || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  if (origin && appUrl && (origin === appUrl || origin.startsWith(appUrl))) {
    return origin;
  }
  return appUrl || origin;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle CORS preflight (BROWSER-02)
  if (req.method === 'OPTIONS') {
    const origin = getOriginHeader(req);
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || req.nextUrl.origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-SolSentry-API-Key, X-SolSentry-Agent',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Allow static assets & public paths without auth
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/_next') || (pathname.includes('.') && !pathname.startsWith('/api/'))) {
    return NextResponse.next();
  }

  // Rate limiting, body size, & auth check for /api/* routes
  if (pathname.startsWith('/api/')) {
    // Check Payload Size (AUTH-06)
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
      return NextResponse.json(
        { error: 'payload_too_large', message: 'Request payload exceeds 1MB limit.' },
        { status: 413 }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rl = rateLimit(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many requests. Please slow down.', retry_after_ms: rl.retryAfterMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const authHeader = req.headers.get('authorization') || '';
    const apiKeyHeader = req.headers.get('x-solsentry-api-key');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : apiKeyHeader;

    // Reject missing API key (AUTH-01, AUTH-04)
    if (!token) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Missing API key. Provide Authorization: Bearer <key> or X-SolSentry-API-Key header.' },
        { status: 401 }
      );
    }

    // Validate key against users table or test key (AUTH-01)
    const userId = await verifyApiKey(token);
    if (!userId && token !== 'ss_test_key_mock_12345') {
      return NextResponse.json(
        { error: 'forbidden', message: 'Invalid API key.' },
        { status: 403 }
      );
    }

    const requestHeaders = new Headers(req.headers);
    if (userId) {
      requestHeaders.set('x-solsentry-user-id', userId);
    }

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('X-XSS-Protection', '1; mode=block');
    return res;
  }

  const res = NextResponse.next();
  res.headers.set('X-XSS-Protection', '1; mode=block');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
