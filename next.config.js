const isDev = process.env.NODE_ENV !== 'production';

// Next.js compiles client modules with `eval-source-map` in development, so
// every chunk is wrapped in eval(). Without 'unsafe-eval' the browser silently
// refuses to execute any of it: chunks download with HTTP 200, React never
// hydrates, and the whole dashboard renders as inert server HTML — no buttons,
// no SWR refresh, no live data. Production builds contain no eval, so the
// directive is added in development only and the shipped policy is unchanged.
const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          `script-src ${scriptSrc}`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "connect-src 'self' https://*.supabase.co https://*.helius-rpc.com wss://*.helius-rpc.com https://hermes.pyth.network https://api.kamino.finance https://api.llama.fi https://api.github.com wss:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ];
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/sw.js', headers: [ { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }, { key: 'Service-Worker-Allowed', value: '/' } ] },
      { source: '/manifest.json', headers: [ { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' } ] },
      { source: '/api/:path*', headers: [ { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' } ] },
    ];
  },
};

module.exports = nextConfig;
