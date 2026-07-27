/**
 * Browser-safe helpers for Solana JSON-RPC WebSocket subscriptions.
 *
 * We deliberately subscribe from the browser instead of trying to upgrade a
 * Next.js route. Route handlers (and the Netlify Next runtime used here) do
 * not own a long-lived HTTP server, so accepting WebSocket upgrades there
 * would work locally but fail after deployment. The RPC provider terminates
 * the durable socket and this app only receives public slot metadata.
 */

const PUBLIC_MAINNET_WS = 'wss://api.mainnet-beta.solana.com';

// Keep these property reads explicit. Next.js replaces NEXT_PUBLIC_* values in
// browser bundles at build time; passing `process.env` through dynamically does
// not reliably expose them to client code.
const publicEnvironment = {
  NEXT_PUBLIC_SOLANA_WS_URL: process.env.NEXT_PUBLIC_SOLANA_WS_URL,
  NEXT_PUBLIC_HELIUS_RPC_URL: process.env.NEXT_PUBLIC_HELIUS_RPC_URL,
};

/**
 * Turn a conventional Solana HTTP RPC URL into its WebSocket counterpart.
 * Returns null for malformed URLs or non-web protocols. Credentials are not
 * accepted: a public NEXT_PUBLIC_ URL must use a query-string API key instead.
 */
export function toSolanaWebSocketUrl(rpcUrl?: string): string | null {
  if (!rpcUrl) return null;

  try {
    const url = new URL(rpcUrl);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:') url.protocol = 'wss:';
    else if (url.protocol === 'http:') url.protocol = 'ws:';
    else if (url.protocol !== 'wss:' && url.protocol !== 'ws:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Select a public RPC socket. Explicit WS configuration wins; an HTTP Helius
 * endpoint is converted automatically so deployments need only configure one
 * RPC URL. The public cluster endpoint is a functional, rate-limited fallback.
 */
export function getSolanaWebSocketUrl(environment: Record<string, string | undefined> = publicEnvironment): string {
  const explicit = toSolanaWebSocketUrl(environment.NEXT_PUBLIC_SOLANA_WS_URL);
  if (explicit) return explicit;

  const fromRpc = toSolanaWebSocketUrl(environment.NEXT_PUBLIC_HELIUS_RPC_URL);
  return fromRpc ?? PUBLIC_MAINNET_WS;
}

export interface SolanaSlotNotification {
  slot: number;
  parent: number;
  root: number;
}

/** Narrow, runtime-checked shape of a Solana `slotNotification` payload. */
export function parseSlotNotification(message: unknown): SolanaSlotNotification | null {
  if (!message || typeof message !== 'object') return null;
  const candidate = message as {
    method?: unknown;
    params?: { result?: { slot?: unknown; parent?: unknown; root?: unknown } };
  };
  const result = candidate.params?.result;
  if (
    candidate.method !== 'slotNotification' ||
    !result ||
    typeof result.slot !== 'number' ||
    typeof result.parent !== 'number' ||
    typeof result.root !== 'number' ||
    !Number.isSafeInteger(result.slot) ||
    !Number.isSafeInteger(result.parent) ||
    !Number.isSafeInteger(result.root) ||
    result.slot < 0 || result.parent < 0 || result.root < 0
  ) {
    return null;
  }

  return { slot: result.slot, parent: result.parent, root: result.root };
}
