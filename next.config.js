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
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.helius-rpc.com wss://*.helius-rpc.com https://hermes.pyth.network https://api.kamino.finance https://api.llama.fi wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
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
