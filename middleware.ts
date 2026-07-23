import { NextRequest, NextResponse } from 'next/server';

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-SolSentry-API-Key, X-SolSentry-Agent',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Allow static assets & public paths without auth
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Rate limiting & auth check for /api/* routes
  if (pathname.startsWith('/api/')) {
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

    // Allow development access or valid token/session
    if (!token && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Missing API key. Provide Authorization: Bearer <key> or X-SolSentry-API-Key header.' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
