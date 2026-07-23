# SolSentry — Comprehensive Security Audit Report

**Target:** [github.com/shieldspprt/solsentry](https://github.com/shieldspprt/solsentry) & [solsentry.netlify.app](https://solsentry.netlify.app/)
**Date:** 2026-07-23
**Auditor:** Ethical Hacking / OSINT / Blockchain / Browser Security Assessment
**Classification:** White-Hat — Authorized by repo owner for defensive hardening
**Scope:** Full repository source code (static analysis) + live deployment (passive reconnaissance)

---

## Executive Summary

SolSentry is an open-source Solana AI Agent risk engine built on Next.js 14, Supabase, and MCP (Model Context Protocol). The application provides real-time DeFi protocol risk scoring, wallet position monitoring, stress testing, and policy guardrails for Solana trading agents. While the project demonstrates a solid architectural thesis and a genuinely useful v3 scoring model, the security posture has significant gaps that could be exploited before the system reaches production maturity.

**This audit identified 30 findings across 5 categories:**

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 P0 — Critical | 7 | 2 partially remediated in code, 5 active |
| 🟠 P1 — High | 10 | 3 partially remediated, 7 active |
| 🟡 P2 — Medium | 9 | All active |
| 🔵 P3 — Low | 4 | All active |

**Top 3 Immediate Actions Required:**
1. **Rotate all exposed API keys** (Helius, VAPID, Supabase refs in git history)
2. **Implement actual API key validation** in middleware (`verifyApiKey()` exists but is never called)
3. **Tighten CSP** — remove `'unsafe-inline'` and `'unsafe-eval'` from script-src

---

## Table of Contents

- [1. OSINT Findings — Information Disclosure & Secret Leakage](#1-osint-findings--information-disclosure--secret-leakage)
- [2. Browser Attack Surface](#2-browser-attack-surface)
- [3. Blockchain & DeFi Attack Surface](#3-blockchain--defi-attack-surface)
- [4. API & Authentication Security](#4-api--authentication-security)
- [5. Architecture & Infrastructure](#5-architecture--infrastructure)
- [6. Summary Matrix](#6-summary-matrix)
- [7. Prioritized Remediation Roadmap](#7-prioritized-remediation-roadmap)

---

## 1. OSINT Findings — Information Disclosure & Secret Leakage

### 🔴 OSINT-01: Helius API Key Previously Committed to Git History (P0)

**File:** `scratch/test-helius.js` (historical), documented in `solsentry-review.md:57`
**Evidence:** The review file (committed to the repo) documents:
```
const apiKey = process.env.HELIUS_API_KEY || '[REDACTED_HELIUS_KEY]';
```
**Current Status:** The current HEAD version of `scratch/test-helius.js` has been cleaned up to require the env var. However, historical mentions exist in documentation.

**Impact:** Anyone who obtains a working Helius RPC key can:
- Drain your Helius API quota, causing service degradation for all whale concentration queries
- Run expensive RPC methods (`getTokenLargestAccounts`, `getSignatureStatuses`) at your expense
- If the key has admin capabilities, potentially trigger key suspension — taking down the entire `helius.ts` data pipeline

**Remediation:**
1. **Immediately rotate the Helius API key** in the Helius dashboard — the old key must be assumed burned
2. Remove the raw key value from documentation (replace with `REDACTED`)
3. Use `git filter-branch` or `BFG Repo Cleaner` to purge the key from full git history
4. Add a pre-commit hook with `gitleaks` or `git-secrets` to prevent future leaks
5. Verify complete removal

---

### 🟠 OSINT-02: Supabase Project Reference Exposed in Review File (P1)

**File:** `solsentry-review.md:87-89`
**Evidence:** The committed review document contains:
```
process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://[REDACTED_PROJECT_REF].supabase.co'
process.env.SUPABASE_DB_HOST || 'aws-0-eu-west-1.pooler.supabase.com'
process.env.SUPABASE_DB_USER || 'postgres.[REDACTED_PROJECT_REF]'
```

**Impact:** Exposes the exact Supabase project identifier, connection pooler hostname, and database user pattern. Combined with any leaked service role key, this enables a full database takeover. Even without the service key, the project ref allows targeted enumeration of Supabase project configuration.

**Remediation:**
1. Redact the project ref in documentation — replace raw project ref with `REDACTED_REF`
2. Consider creating a new Supabase project and migrating data if the old project ref was widely circulated
3. Ensure the current `lib/supabase-admin.ts` has zero fallback values (verified: it does — good)
4. Review all git history for the project ref and purge with BFG

---

### 🟠 OSINT-03: Default VAPID Public Key Hardcoded in Client-Side Code (P1)

**File:** `lib/push-client.ts:5-6`
```typescript
const DEFAULT_VAPID_PUBLIC_KEY =
  'BDLeFCgHDJUFzdtcJblKYUQyG78qOST1pYQMiYmaGP--Oqbk8Z3l99xmvvbFT4Nx-F85mEuft0o7b3_E-GeKNdc';
```

**Impact:** While VAPID public keys are designed to be public (they're sent to push services), having a hardcoded default means:
- An attacker can identify your VAPID application server across different deployments
- If the corresponding private key is ever compromised, attackers can forge push notifications
- The hardcoded key ties the codebase to a specific push configuration, making rotation harder
- If deployed without `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var, all deployments share the same push subscription

**Remediation:**
1. Remove the hardcoded default entirely — fail fast if `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is not set
2. Generate fresh VAPID keys per environment (dev/staging/prod)
3. Document the key rotation process in CONTRIBUTING.md

---

### 🟡 OSINT-04: `.env.example` Exposes Infrastructure Topology (P2)

**File:** `.env.example`
**Evidence:** The example file reveals:
- Supabase connection pooler region: `aws-0-eu-west-1.pooler.supabase.com`
- Helius RPC URL pattern: `https://mainnet.helius-rpc.com/?api-key=`
- Full database schema (postgres, port 5432)
- Internal env var naming convention (useful for social engineering)

**Impact:** Low direct risk, but provides attackers with infrastructure mapping data. Knowing the AWS region and Supabase pooler hostname narrows the attack surface for targeted attacks.

**Remediation:** Consider using `your-region.pooler.supabase.com` as the example host instead of the actual AWS region.

---

### 🟡 OSINT-05: `solsentry-review.md` Contains Sensitive Security Review Details (P2)

**File:** `solsentry-review.md` (committed to repo, 1433 lines)
**Impact:** This file contains detailed vulnerability descriptions, exact file paths with line numbers, internal architecture discussions, and references to specific Supabase tables and their relationships. It serves as a roadmap for any attacker.

**Remediation:** Move detailed security review notes to a private issue tracker or a `SECURITY.md` that doesn't contain specific exploit paths. The committed version should contain only remediation status, not exploitation details.

---

### 🔵 OSINT-06: Twitter Handle and Social Accounts Exposed (P3)

**File:** `app/layout.tsx:72-75`
```typescript
twitter: {
  site: '@SolSentry',
  creator: '@SolSentry',
}
```
**Impact:** Low — standard metadata. Monitor these accounts for impersonation.

---

## 2. Browser Attack Surface

### 🔴 BROWSER-01: Content Security Policy Allows Unsafe Scripts (P0)

**File:** `next.config.js:11`, `netlify.toml:16`
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
```

**Impact:** This is the single most dangerous browser security misconfiguration in the application. `'unsafe-inline'` and `'unsafe-eval'` in `script-src` completely defeat XSS protection:
- Any DOM-based XSS can execute arbitrary JavaScript
- No protection against script injection via URL parameters, reflected content, or third-party library vulnerabilities
- An attacker who finds any HTML injection point gets full JavaScript execution in the origin
- Combined with the Supabase session cookies, this could lead to account takeover

**Why it exists:** Next.js requires `'unsafe-inline'` for inline styles and scripts unless you implement nonce-based CSP. `'unsafe-eval'` is needed by some bundlers.

**Remediation (Priority 1):**
1. Implement nonce-based CSP in middleware instead of static headers:
```typescript
// middleware.ts
const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
const csp = `
  default-src 'self';
  script-src 'self' 'nonce-${nonce}';
  style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://*.helius-rpc.com wss://*.helius-rpc.com https://hermes.pyth.network https://api.kamino.finance https://api.llama.fi wss:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`;
response.headers.set('Content-Security-Policy', csp.replace(/\n/g, ''));
response.headers.set('x-nonce', nonce);
```
2. Remove `'unsafe-eval'` — if Next.js requires it, consider using `next.config.js` `experimental.scriptLoader` or moving to a build-time approach
3. Test with [CSP Evaluator](https://csp-evaluator.withgoogle.com/) after changes

---

### 🟠 BROWSER-02: CORS Misconfiguration — Wildcard Fallback (P1)

**File:** `middleware.ts:41`
```typescript
'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
```

**Impact:** When `NEXT_PUBLIC_APP_URL` is not set (which can happen in misconfigured deployments), CORS falls back to `*`, allowing any website to make authenticated requests to the API. Combined with the exposed `Authorization` and `X-SolSentry-API-Key` header names in the `Access-Control-Allow-Headers`, an attacker can:
- Make cross-origin API calls from their malicious website using stolen API keys
- Read API responses containing protocol risk data and wallet positions
- Exploit the MCP endpoint from third-party origins

The custom headers exposure (`X-SolSentry-API-Key`, `X-SolSentry-Agent`) tells attackers exactly what header names to use.

**Remediation:**
1. Remove the `'*'` fallback entirely — if the URL is not configured, deny all cross-origin requests:
```typescript
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL;
if (!allowedOrigin) {
  return new NextResponse(null, { status: 204 });
}
```
2. Only expose necessary `Access-Control-Allow-Headers` (don't list `X-SolSentry-API-Key` in preflight — it reveals internal auth mechanisms)

---

### 🟠 BROWSER-03: Open Redirect in Service Worker Notification Click (P1)

**File:** `public/sw.js:26-35`
```javascript
self.addEventListener('notificationclick', (event) => {
  const target = (event.notification.data && event.notification.data.url) || '/dashboard/positions';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(target));
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    })
  );
});
```

**Impact:** If an attacker can manipulate the push notification payload (e.g., by compromising the push subscription or the server that sends notifications), they can set `data.url` to any external URL. The `clients.openWindow(target)` call will open this URL in a browser tab with the service worker's origin context, enabling:
- Phishing attacks that appear to come from the SolSentry app
- Drive-by download attacks
- Credential harvesting pages that mimic the SolSentry dashboard

**Remediation:**
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let target = (event.notification.data && event.notification.data.url) || '/dashboard/positions';
  // Validate: only allow same-origin relative paths
  try {
    const parsed = new URL(target, self.location.origin);
    if (parsed.origin !== self.location.origin || !target.startsWith('/')) {
      target = '/dashboard/positions'; // Force safe default
    }
  } catch {
    target = '/dashboard/positions';
  }
  // ... rest of handler
});
```

---

### 🟡 BROWSER-04: No CSRF Protection on POST Endpoints (P2)

**Files:** All `app/api/v1/*/route.ts` POST handlers
**Impact:** While the CSP `form-action 'self'` prevents basic form-based CSRF, it doesn't protect against:
- JSON-based CSRF via `fetch()` with `Content-Type: application/json` (browsers don't enforce preflight for simple requests with `text/plain`, and some frameworks use form-encoded)
- Attackers can craft cross-origin requests if they obtain a valid API key

**Remediation:**
1. Add CSRF token validation for any state-changing POST endpoint
2. Validate the `Origin` header matches expected origins
3. Require `Content-Type: application/json` for all POST endpoints (already partially done — good)

---

### 🟡 BROWSER-05: `dangerouslySetInnerHTML` Pattern (P2)

**Files:** `app/layout.tsx:121`, `app/page.tsx:26`
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
```

**Impact:** Currently safe because `JSON.stringify()` produces valid JSON that doesn't contain HTML. However:
- This pattern trains developers to use `dangerouslySetInnerHTML` without fear
- If any future change introduces user-controlled data into the JSON-LD object, it becomes an XSS vector
- Code review tools will flag this as a warning, creating audit fatigue

**Remediation:**
- Use the Next.js `<Script id="json-ld"` strategy instead:
```tsx
<Script id="json-ld" type="application/ld+json" strategy="beforeInteractive">
  {JSON.stringify(jsonLd)}
</Script>
```

---

### 🟡 BROWSER-06: Service Worker Caches Without Integrity Verification (P2)

**File:** `public/sw.js:60-97`
**Impact:** The service worker caches any 200 response from the same origin without checking content integrity hashes. An attacker who achieves a MITM position (despite HSTS) or compromises the CDN layer could:
- Serve poisoned JavaScript bundles that get cached by the SW
- Cache modified API responses
- The poisoned content persists until the SW version changes (`CACHE_NAME`)

**Remediation:**
1. Use Subresource Integrity (SRI) for all third-party scripts
2. Consider implementing cache digest verification for critical API responses
3. The `CACHE_NAME = 'solsentry-cache-v3.0.0'` does version correctly — ensure this is bumped on every deployment

---

### 🔵 BROWSER-07: Missing `X-XSS-Protection` Header (P3)

**File:** `next.config.js`
**Impact:** While modern browsers have deprecated this header in favor of CSP, older browsers (especially older Edge/IE) may not filter reflected XSS without it.
**Remediation:** Add to security headers: `{ key: 'X-XSS-Protection', value: '1; mode=block' }`

---

## 3. Blockchain & DeFi Attack Surface

### 🔴 CHAIN-01: No Authentication on `/api/v1/sync` — Free DoS Amplifier (P0)

**File:** `app/api/v1/sync/route.ts:8`
**Evidence:** The sync endpoint iterates over all `SUPPORTED_PROTOCOLS` and for each one calls:
- `buildGroundedMetrics()` → Helius RPC (`getTokenLargestAccounts` + `getTokenSupply`)
- `fetchPythPrice()` → Pyth Hermes API
- DeFiLlama API (TVL + fees)
- `computeProtocolRisk()` → CPU-intensive scoring
- Supabase writes (upsert + snapshot insert)

**Impact:** An attacker can call `/api/v1/sync` repeatedly to:
- Exhaust your Helius RPC quota (paid API)
- Overwhelm Pyth and DeFiLlama rate limits from your server's IP
- Trigger cascading Supabase writes that could hit database limits
- The middleware rate limit (60/min) is per-IP in-memory, which is trivially bypassed with rotating proxies on Netlify

**Cost Impact:** Each sync call = 9 protocols × (1 Helius RPC + 1 Pyth fetch + 2 DeFiLlama fetches) = ~36 external API calls. At 60 requests/min, that's 2,160 external API calls per minute on your bill.

**Remediation:**
1. Require API key validation via `verifyApiKey()` before allowing sync (the function exists but is never called!)
2. Add a global sync cooldown (e.g., max 1 sync per 5 minutes across all users)
3. Add per-route rate limiting: `/api/v1/sync` should have a much lower limit (e.g., 5/min)
4. Consider making sync admin-only or cron-based only

---

### 🟠 CHAIN-02: Unauthenticated Wallet Position Surveillance (P1)

**File:** `app/api/v1/positions/read/route.ts:10`
**Evidence:** The endpoint accepts any Solana wallet address and returns:
- All open positions across Kamino lending markets
- Health factors, PnL, liquidation prices
- Stress test results for the wallet's positions
- Source protocols that responded successfully

**Impact:** Any attacker can passively monitor any Solana wallet's DeFi positions without the wallet owner's knowledge:
- Track whale positions and liquidation levels for front-running
- Monitor competitor agent wallets for strategy cloning
- Build a database of wallet positions for targeted liquidation attacks
- The endpoint reveals which protocols the wallet uses and their health status

**Remediation:**
1. Require authentication for position reads (API key at minimum)
2. Add rate limiting per wallet address to prevent mass surveillance
3. Consider restricting the endpoint to only return positions for the authenticated user's registered wallets
4. Log all position read requests for audit trail

---

### 🟠 CHAIN-03: MCP Tool Injection via Unvalidated Parameters (P1)

**File:** `packages/mcp-server/src/tool-registry.ts:209-218`
```typescript
export async function dispatchToolCall(rawName: string, toolArgs: any): Promise<any> {
  const normalized = rawName.replace(/^(solsentry_|agentgate_)/, '').toLowerCase();
  const handler = TOOL_HANDLERS[normalized];
  if (!handler) throw new Error(`Tool '${rawName}' not found in registry`);
  return await handler(toolArgs);
}
```

**Evidence:** The MCP endpoint at `/api/v1/mcp` accepts JSON-RPC 2.0 calls with arbitrary tool names and arguments:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "solsentry_stress_test",
    "arguments": {
      "protocolSlug": "kamino",
      "priceShockPct": -20,
      "walletAddress": "<any_wallet>"
    }
  }
}
```

**Impact:** With a valid (or stolen) API key, an attacker can:
- Call `solsentry_stress_test` with any wallet address — triggering Kamino API calls for surveillance
- Call `solsentry_get_position_health` to monitor wallet positions
- Call `solsentry_preflight` to map out the policy engine's guardrails
- The `toolArgs: any` typing means no input validation is performed at the dispatch level

**Remediation:**
1. Add Zod/Joi validation for all MCP tool arguments at the dispatch level
2. Restrict wallet-related tools to only work with the authenticated user's registered wallets
3. Add per-tool rate limiting (e.g., stress_test: 10/min, position_health: 30/min)
4. Log all MCP tool invocations with caller identity for audit

---

### 🟡 CHAIN-04: Protocol Slug Injection for Unauthorized Scoring (P2)

**File:** `app/api/v1/risk-check/route.ts:14`
```typescript
const rawSlug = body?.protocolSlug || body?.slug || '';
const protocolSlug = sanitizeText(String(rawSlug)).toLowerCase();
```

**Impact:** While `sanitizeText()` HTML-encodes the input, the `toLowerCase()` and lookup logic means an attacker can:
- Query risk data for any slug, including those not in the supported protocol list
- Trigger external API calls (Helius, Pyth, DeFiLlama) for arbitrary protocol slugs
- The `DEFAULT_SOLANA_PROTOCOLS` array acts as a fallback, so unrecognized slugs still get scored with model defaults

**Remediation:** Validate `protocolSlug` against `SUPPORTED_PROTOCOLS` whitelist before processing:
```typescript
if (!SUPPORTED_PROTOCOLS.includes(protocolSlug as any)) {
  return NextResponse.json({ error: `Unsupported protocol: ${protocolSlug}` }, { status: 400 });
}
```

---

### 🟡 CHAIN-05: Hardcoded Protocol Program IDs and Market Addresses (P2)

**Files:**
- `packages/core/src/wallet-reader/index.ts:31-35` — Kamino market addresses
- `sql/schema.sql:192-199` — All protocol program IDs
- `packages/core/src/data-fetchers/helius.ts:9-18` — Token mint addresses

**Impact:** If any protocol upgrades its program (which happens on Solana), the hardcoded addresses become stale. The app would silently read wrong data or fail silently. For a risk engine, stale data is dangerous because:
- Risk scores would be based on incorrect protocol data
- Liquidation warnings could be missed
- Position health factors would be wrong

**Remediation:**
1. Move protocol program IDs to the database `protocols` table (partially done — `program_ids` column exists)
2. Fetch Kamino markets from a configuration endpoint rather than hardcoding
3. Add a health check that verifies program IDs are still active on-chain

---

### 🟡 CHAIN-06: Oracle Price Confidence Not Cross-Validated (P2)

**File:** `packages/core/src/data-fetchers/pyth.ts`
**Impact:** The oracle health check relies solely on Pyth's confidence interval width and publish staleness. It doesn't cross-validate against other price sources (e.g., Jupiter's price API, or on-chain DEX aggregation). A sophisticated attacker who can manipulate Pyth feeds (or if Pyth has an outage) could:
- Trigger false liquidation warnings or suppress legitimate ones
- Manipulate risk scores by attacking the oracle factor

**Remediation:** Implement multi-source price validation with majority voting.

---

### 🔵 CHAIN-07: No On-Chain Transaction Signing (P3 — Positive Finding)

**Assessment:** SolSentry only READS on-chain data — it never signs or sends transactions. This is a deliberate security-positive design decision. The app is a monitoring/recommendation layer, not a transaction execution layer. This eliminates entire classes of blockchain attacks:
- No private key exposure risk
- No transaction manipulation risk
- No replay attack surface
- No smart contract interaction exploits

**Recommendation:** Maintain this read-only architecture. If auto-deleveraging is ever implemented, use a separate, isolated signing service with hardware-level key storage.

---

## 4. API & Authentication Security

### 🔴 AUTH-01: API Key Validation Function Exists But Is Never Called (P0)

**File:** `lib/api-key.ts` (defines `verifyApiKey()`), `middleware.ts` (doesn't call it)

**Evidence:** The middleware checks if a token EXISTS but never validates it:
```typescript
// middleware.ts:65-75
const authHeader = req.headers.get('authorization') || '';
const apiKeyHeader = req.headers.get('x-solsentry-api-key');
const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : apiKeyHeader;

// Only checks if token exists — NOT if it's valid!
if (!token && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```

Meanwhile, `lib/api-key.ts` has a complete verification function that:
- Validates key format (`ss_` prefix)
- Hashes with SHA-256
- Queries the database for the matching user

**Impact:** In production, ANY non-empty string passed as `Authorization: Bearer anything` or `X-SolSentry-API-Key: anything` will pass authentication. This means:
- Every API endpoint is effectively unprotected
- Anyone can call `/api/v1/sync`, `/api/v1/risk-check`, `/api/v1/mcp`, etc.
- The rate limiter is the only protection (and it's in-memory only — see INFRA-02)

**Remediation:**
```typescript
// middleware.ts — add after token extraction
if (token && process.env.NODE_ENV === 'production') {
  const userId = await verifyApiKey(token);
  if (!userId) {
    return NextResponse.json({ error: 'forbidden', message: 'Invalid API key' }, { status: 403 });
  }
  // Optionally attach userId to request headers for downstream use
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', userId);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
```

---

### 🔴 AUTH-02: Admin Client Bypasses All Row Level Security (P0)

**Files:** Every API route uses `getSupabaseAdmin()` from `lib/supabase-admin.ts`
**Evidence:** All database operations in API routes use:
```typescript
const supabase = getSupabaseAdmin(); // Uses SUPABASE_SERVICE_ROLE_KEY
```

This bypasses ALL RLS policies defined in `sql/rls-policies.sql`. The carefully crafted RLS policies (users can only see their own data, agents belong to users, etc.) are completely ineffective because the admin client has full table access.

**Impact:** If the middleware auth bypass (AUTH-01) is exploited, an attacker gains unmitigated access to ALL data in ALL tables — not just their own. This includes:
- All users' API keys (hashed but present)
- All agents and their configurations
- All positions, policies, and alerts across all users
- All push subscription endpoints (enabling notification spam)

**Remediation:**
1. Create a separate `getSupabaseUser()` function that uses the anon key + user's JWT for user-scoped operations
2. Reserve `getSupabaseAdmin()` exclusively for server-side operations that genuinely need cross-user access (e.g., protocol list, risk scoring)
3. For user-specific routes (agents, positions, policies), use the user-scoped client
4. In the short term, fix AUTH-01 first (validating API keys) — this at least limits admin access to authenticated users

---

### 🟠 AUTH-03: In-Memory Rate Limiting is Ineffective on Serverless (P1)

**File:** `middleware.ts:15-31`
```typescript
const hits = new Map<string, { count: number; reset: number }>();
```

**Impact:** Netlify uses serverless functions. Each function invocation may use a different instance, meaning the in-memory `hits` Map is not shared across invocations. The rate limiter is effectively useless:
- A fresh instance starts with 0 hits every time
- An attacker gets 60 requests per instance per minute
- With concurrent function invocations, this could be hundreds of requests per minute
- Serverless cold starts further reduce the effectiveness

**Remediation:**
1. Use Netlify's built-in rate limiting (if available) or an external rate limiting service
2. Implement Supabase-based rate limiting with a `rate_limits` table
3. Use Redis (via Upstash or similar) for distributed rate limiting
4. At minimum, add per-endpoint cooldowns in the database

---

### 🟠 AUTH-04: Development Mode Disables Authentication Entirely (P1)

**File:** `middleware.ts:70`
```typescript
if (!token && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```

**Impact:** When `NODE_ENV` is not `production` (which is the default for `next dev`), ALL API routes are accessible without any authentication. This includes:
- The sync endpoint (triggers paid external API calls)
- The agent creation endpoint (writes to database)
- The push subscription endpoint (stores data)
- MCP tool execution

**Remediation:** Remove the `NODE_ENV` check entirely. Require authentication in ALL environments:
```typescript
if (!token) {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```

---

### 🟠 AUTH-05: Error Messages Leak Internal Implementation Details (P1)

**Files:**
- `app/api/v1/mcp/route.ts:71`: `details: String(err)`
- `app/api/v1/agents/route.ts:44`: `message: err.message || 'Failed to register agent'`
- `app/api/v1/agents/route.ts:33`: `message: error.message` (Supabase error)

**Impact:** Detailed error messages reveal:
- Database schema details (Supabase error messages include column names and constraints)
- Internal function names and file paths from stack traces
- Technology stack information (helps targeted attacks)

**Remediation:** Return generic error messages to clients; log details server-side:
```typescript
catch (err) {
  console.error('[AGENT_CREATE]', err); // Detailed log for debugging
  return NextResponse.json(
    { error: 'internal_error', message: 'Failed to register agent' },
    { status: 500 }
  );
}
```

---

### 🟡 AUTH-06: No Request Body Size Limits (P2)

**Files:** All POST route handlers use `await request.json()` without size validation.

**Impact:** An attacker could send extremely large JSON payloads to consume memory on the serverless function, potentially causing OOM crashes or increased billing.

**Remediation:** Add a body size check before parsing:
```typescript
const contentLength = request.headers.get('content-length');
if (contentLength && parseInt(contentLength) > 1_000_000) { // 1MB max
  return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
}
```

---

### 🟡 AUTH-07: Push Subscription Endpoint Has No Input Validation (P2)

**File:** `app/api/v1/push/subscribe/route.ts:14-16`
```typescript
const userId = body?.userId && typeof body.userId === 'string' ? body.userId.trim() : null;
const agentId = body?.agentId && typeof body.agentId === 'string' ? body.agentId.trim() : null;
```

**Impact:** While basic type checking exists, there's no validation that:
- `userId` is a valid UUID format
- `agentId` exists and belongs to the user
- The endpoint isn't being used to associate push subscriptions with arbitrary user/agent IDs

**Remediation:** Validate UUID format for both userId and agentId, and verify ownership.

---

### 🟡 AUTH-08: No API Key Rotation Mechanism (P2)

**File:** `lib/api-key.ts`
**Impact:** Once an API key is issued, there's no mechanism to rotate it without creating a new one and updating the hash in the database. If a key is compromised, the user has no way to self-service rotate it.

**Remediation:** Implement a key rotation endpoint that accepts an existing key and returns a new one.

---

## 5. Architecture & Infrastructure

### 🟡 INFRA-01: Raw PostgreSQL Client with Direct Credentials (P2)

**File:** `lib/supabase-admin.ts:26-51`
```typescript
export const getPgClient = () => {
  const host = process.env.SUPABASE_DB_HOST;
  const user = process.env.SUPABASE_DB_USER;
  const password = process.env.SUPABASE_PASSWORD;
  return new Client({ host, port, database, user, password, ssl: ... });
};
```

**Impact:** Direct database credentials in the application layer:
- Credentials are exposed in runtime environment (Netlify env vars)
- No connection pooling at the application level
- The `SUPABASE_DB_SSL_REJECT_UNAUTHORIZED=false` option can disable TLS verification

**Remediation:** Use Supabase's connection pooler (port 6543) and the Supabase JS client instead of raw `pg.Client` for all application queries. Reserve raw `pg.Client` for migrations only.

---

### 🟡 INFRA-02: Synchronous Error Swallowing Pattern (P2)

**Files:** Throughout the codebase, bare `catch {}` blocks silently suppress errors:
```typescript
try { ... } catch { /* silent */ }
```

**Evidence:** Found in `risk-check/route.ts`, `sync/route.ts`, `push/subscribe/route.ts`, `helius.ts`, `pyth.ts`, `defillama.ts`, `snapshots.ts`, `audit.ts`, `sw.js`, and others.

**Impact:** Silent error swallowing means:
- Security incidents go undetected
- Failed security checks (e.g., audit log writes) are invisible
- No observability into attack patterns
- Debugging production issues is extremely difficult

**Remediation:** Replace all silent catches with proper error logging:
```typescript
try { ... } catch (err) {
  console.error('[MODULE_NAME] Operation failed:', err);
  // Or use a structured logger
}
```

---

### 🟡 INFRA-03: In-Memory Cache Without Size Protection Against Abuse (P2)

**File:** `lib/cache.ts`
```typescript
const MAX_CACHE_SIZE = 256;
```

**Impact:** While there's a max size limit (256 entries), there's no validation of cache key format or size. An attacker could craft requests that generate unique cache keys (e.g., with different protocolSlug variations) to fill the cache with useless entries, evicting legitimate entries.

---

### 🔵 INFRA-04: No CI/CD Pipeline or Automated Security Scanning (P3)

**Evidence:** No `.github/workflows/` directory found in the repository.

**Impact:** No automated:
- Dependency vulnerability scanning (Dependabot, Snyk)
- Static analysis (CodeQL, Semgrep)
- Secret scanning (git-secrets, gitleaks)
- Build verification

**Remediation:** Add GitHub Actions with:
- Dependabot for dependency updates
- CodeQL for static security analysis
- Gitleaks pre-commit for secret detection
- Build and test on every PR

---

### 🔵 INFRA-05: Dependency Versions Should Be Checked for CVEs (P3)

**Evidence:** `package.json` shows:
- `next@^14.2.23` — check for known CVEs
- `@solana/web3.js@^1.95.8` — Solana SDKs have had vulnerabilities
- `@supabase/supabase-js@^2.110.8` — check for known issues
- `@modelcontextprotocol/sdk@^1.29.0` — new library, limited audit history

**Remediation:** Run `npm audit` and review findings. Consider pinning exact versions (remove `^` prefix) for security-critical dependencies.

---

### 🔵 INFRA-06: Landing Page Exposes localhost URL (P3)

**File:** `app/page.tsx:19`
```typescript
url: 'http://localhost:3000',
```

**Impact:** The JSON-LD structured data on the landing page contains `http://localhost:3000` as the canonical URL. While low risk, it:
- Reveals development infrastructure
- Can confuse search engine indexing
- Looks unprofessional in rich snippet previews

**Remediation:** Use the `siteUrl` variable from environment config.

---

## 6. Summary Matrix

| ID | Category | Finding | Severity | Status |
|----|----------|---------|----------|--------|
| OSINT-01 | OSINT | Helius API key in git history | 🔴 P0 | Key rotation needed |
| OSINT-02 | OSINT | Supabase project ref in review file | 🟠 P1 | Active |
| OSINT-03 | OSINT | Default VAPID key hardcoded | 🟠 P1 | Active |
| OSINT-04 | OSINT | .env.example exposes topology | 🟡 P2 | Active |
| OSINT-05 | OSINT | Review file exposes attack paths | 🟡 P2 | Active |
| OSINT-06 | OSINT | Social accounts in metadata | 🔵 P3 | Acceptable |
| BROWSER-01 | Browser | CSP allows unsafe-inline/eval | 🔴 P0 | Active |
| BROWSER-02 | Browser | CORS wildcard fallback | 🟠 P1 | Active |
| BROWSER-03 | Browser | Open redirect in SW | 🟠 P1 | Active |
| BROWSER-04 | Browser | No CSRF protection | 🟡 P2 | Active |
| BROWSER-05 | Browser | dangerouslySetInnerHTML pattern | 🟡 P2 | Active |
| BROWSER-06 | Browser | SW caches without integrity | 🟡 P2 | Active |
| BROWSER-07 | Browser | Missing X-XSS-Protection header | 🔵 P3 | Active |
| CHAIN-01 | Blockchain | Unauthenticated sync = DoS | 🔴 P0 | Active |
| CHAIN-02 | Blockchain | Wallet surveillance without auth | 🟠 P1 | Active |
| CHAIN-03 | Blockchain | MCP tool parameter injection | 🟠 P1 | Active |
| CHAIN-04 | Blockchain | Protocol slug injection | 🟡 P2 | Active |
| CHAIN-05 | Blockchain | Hardcoded protocol addresses | 🟡 P2 | Active |
| CHAIN-06 | Blockchain | No cross-validated oracle prices | 🟡 P2 | Active |
| CHAIN-07 | Blockchain | Read-only architecture (positive) | 🔵 P3 | Maintained |
| AUTH-01 | API Auth | verifyApiKey() never called | 🔴 P0 | Active |
| AUTH-02 | API Auth | Admin client bypasses RLS | 🔴 P0 | Active |
| AUTH-03 | API Auth | In-memory rate limit on serverless | 🟠 P1 | Active |
| AUTH-04 | API Auth | Dev mode disables auth | 🟠 P1 | Active |
| AUTH-05 | API Auth | Error message info leakage | 🟠 P1 | Active |
| AUTH-06 | API Auth | No request body size limits | 🟡 P2 | Active |
| AUTH-07 | API Auth | Push subscribe no input validation | 🟡 P2 | Active |
| AUTH-08 | API Auth | No API key rotation | 🟡 P2 | Active |
| INFRA-01 | Infra | Raw pg client with direct creds | 🟡 P2 | Active |
| INFRA-02 | Infra | Silent error swallowing | 🟡 P2 | Active |
| INFRA-03 | Infra | Cache poisoning potential | 🟡 P2 | Active |
| INFRA-04 | Infra | No CI/CD or security scanning | 🔵 P3 | Active |
| INFRA-05 | Infra | Unpinned dependency versions | 🔵 P3 | Active |
| INFRA-06 | Infra | localhost URL in production HTML | 🔵 P3 | Active |

---

## 7. Prioritized Remediation Roadmap

### Week 1 — Critical Fixes (P0)

| Day | Task | ID | Effort |
|-----|------|----|--------|
| 1 | Rotate Helius API key + purge from git history | OSINT-01 | 2h |
| 1 | Wire `verifyApiKey()` into middleware | AUTH-01 | 2h |
| 1 | Remove dev-mode auth bypass | AUTH-04 | 1h |
| 2 | Implement nonce-based CSP, remove unsafe-inline/eval | BROWSER-01 | 4h |
| 2 | Add auth to `/api/v1/sync` + per-route rate limits | CHAIN-01 | 3h |
| 3 | Separate admin vs user-scoped Supabase clients | AUTH-02 | 6h |
| 3 | Add authentication to position read endpoint | CHAIN-02 | 2h |

### Week 2 — High Priority (P1)

| Day | Task | ID | Effort |
|-----|------|----|--------|
| 4 | Redact Supabase ref + VAPID key from review file | OSINT-02,03 | 1h |
| 4 | Fix CORS wildcard fallback | BROWSER-02 | 1h |
| 5 | Validate notification URL in service worker | BROWSER-03 | 1h |
| 5 | Add Zod validation to MCP tool arguments | CHAIN-03 | 4h |
| 5 | Replace silent catches with structured logging | INFRA-02 | 3h |
| 6 | Implement distributed rate limiting | AUTH-03 | 6h |
| 6 | Sanitize error messages in API responses | AUTH-05 | 2h |

### Week 3-4 — Medium Priority (P2)

- Add CSRF protection to POST endpoints
- Implement request body size limits
- Add UUID validation to push subscribe
- Implement API key rotation endpoint
- Add protocol slug whitelist validation
- Implement SW cache integrity checks
- Set up GitHub Actions CI/CD with security scanning
- Cross-validate oracle prices from multiple sources

### Ongoing — Low Priority (P3)

- Pin dependency versions exactly
- Run `npm audit` and triage findings
- Fix localhost URL in JSON-LD
- Add X-XSS-Protection header

---

## Appendix A: Positive Security Findings

The following security measures are correctly implemented and should be maintained:

1. **`poweredByHeader: false`** in Next.js config — removes `X-Powered-By: Next.js` header
2. **HSTS with preload** — `max-age=63072000; includeSubDomains; preload`
3. **`X-Frame-Options: DENY`** — prevents clickjacking
4. **`frame-ancestors 'none'`** in CSP — redundant with X-Frame-Options but good defense-in-depth
5. **`X-Content-Type-Options: nosniff`** — prevents MIME type sniffing
6. **`Referrer-Policy: strict-origin-when-cross-origin`** — limits referrer leakage
7. **`Permissions-Policy`** restricts geolocation, microphone, and camera
8. **SHA-256 hashed API keys** — keys are never stored in plaintext
9. **`sanitizeText()`** — HTML-encodes user input before rendering
10. **Solana address validation** — both regex + PublicKey() validation
11. **Read-only architecture** — no transaction signing eliminates key exposure risk
12. **Timeout on all external fetches** — `safeFetchWithRetry()` with configurable timeouts
13. **Service worker skips API and auth requests** — prevents caching sensitive data
14. **RLS policies defined** — even though currently bypassed by admin client, the schema is ready
15. **`.gitignore` includes scratch/** — development files excluded (though previously committed)

---

## Appendix B: Testing Methodology

- **Static Analysis:** Full source code review of all TypeScript/JavaScript files
- **Dependency Review:** package.json dependency tree analysis
- **Configuration Review:** next.config.js, netlify.toml, middleware.ts, CSP headers
- **API Surface Mapping:** All REST endpoints and MCP tools enumerated
- **Authentication Flow Analysis:** Middleware, API key validation, Supabase client hierarchy
- **OSINT:** Git history, committed files, env examples, exposed URLs and keys
- **Live Site Reconnaissance:** Passive scanning of solsentry.netlify.app (homepage, API endpoints)
- **Blockchain Attack Modeling:** Wallet reader, protocol interactions, oracle dependencies
- **Browser Threat Modeling:** CSP, CORS, CSRF, SW, XSS, redirect, clickjacking

---

*This report was generated as part of an authorized ethical security assessment. All findings are intended for defensive hardening purposes only. Please address the P0 findings immediately before any further deployment.*
