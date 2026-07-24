import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from './lib/api-key';

const PUBLIC_PATHS = new Set([
  '/',
  '/llms.txt',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/sw.js',
  '/favicon.ico',
]);

// Read-only endpoints that compute over public data (protocol registry, Pyth,
// Helius, DeFiLlama, on-chain wallet reads). They stay rate-limited but need no
// key — the dashboard is a browser client and cannot hold one, and gating them
// meant every "live" panel in the UI silently fell back to model defaults.
// Anything that writes, mutates, or reads account state stays authenticated.
const PUBLIC_API_PATHS = new Set([
  '/api/v1/openapi.json',
  '/api/v1/protocols',
  '/api/v1/protocols/scored',
  '/api/v1/risk-check',
  '/api/v1/positions/read',
  '/api/v1/simulate',
  '/api/v1/stream',
  '/api/v1/mcp',
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

    // Public read-only endpoints: rate-limited above, no key required. A key
    // may still be supplied to attribute the call to a user.
    if (PUBLIC_API_PATHS.has(pathname) && !token) {
      return NextResponse.next();
    }

    // Reject missing API key (AUTH-01, AUTH-04)
    if (!token) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Missing API key. Provide Authorization: Bearer <key> or X-SolSentry-API-Key header.' },
        { status: 401 }
      );
    }

    // Validate key against the users table. The fixed development key is a
    // local convenience only — accepting it in production would be an
    // unauthenticated bypass of every protected endpoint.
    const userId = await verifyApiKey(token);
    const isDevTestKey =
      process.env.NODE_ENV !== 'production' && token === 'ss_test_key_mock_12345';
    if (!userId && !isDevTestKey) {
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
