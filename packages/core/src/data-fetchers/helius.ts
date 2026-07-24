import { safeFetchWithRetry } from '../../../../lib/safe-fetch';

function getHeliusRpcUrl(): string | null {
  return process.env.NEXT_PUBLIC_HELIUS_RPC_URL || process.env.HELIUS_RPC_URL || null;
}

// Governance/token mints for protocols that have a liquid token. Holder
// concentration of the token is a live, verifiable proxy for whale/dump risk.
export const PROTOCOL_TOKEN_MINTS: Record<string, string> = {
  jupiter: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  raydium: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  orca: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  drift: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7',
  jito: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  marinade: 'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey',
  kamino: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS',
  meteora: 'METAewgxyPbgwsseH8T16a39CQ5VyVxZi9zXiDPY18m',
  pumpfun: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
};

export interface HolderConcentrationData {
  mint: string;
  top10_pct: number; // % of supply held by top 10 accounts
  largest_holder_pct: number;
  accounts_sampled: number;
  as_of: string;
}

// Live top-holder concentration via Helius RPC (getTokenLargestAccounts +
// getTokenSupply). Returns null when no RPC key or token mint is available.
export async function fetchTokenHolderConcentration(
  protocolSlug: string
): Promise<HolderConcentrationData | null> {
  const rpcUrl = getHeliusRpcUrl();
  const mint = PROTOCOL_TOKEN_MINTS[protocolSlug];
  if (!rpcUrl || !mint) return null;

  try {
    const rpc = async (method: string, params: unknown[]) => {
      const res = await safeFetchWithRetry(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        timeoutMs: 3000,
      });
      if (!res) return null;
      const json = await res.json();
      return json?.result;
    };

    const [largest, supply] = await Promise.all([
      rpc('getTokenLargestAccounts', [mint]),
      rpc('getTokenSupply', [mint]),
    ]);

    const totalSupply = Number(supply?.value?.uiAmount || 0);
    const accounts: Array<{ uiAmount: number }> = largest?.value || [];
    if (!totalSupply || accounts.length === 0) return null;

    const top10 = accounts.slice(0, 10).reduce((sum, a) => sum + Number(a.uiAmount || 0), 0);
    const largestHolder = Number(accounts[0]?.uiAmount || 0);

    return {
      mint,
      top10_pct: Math.round((top10 / totalSupply) * 1000) / 10,
      largest_holder_pct: Math.round((largestHolder / totalSupply) * 1000) / 10,
      accounts_sampled: accounts.length,
      as_of: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export interface SolanaEpochData {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  epochProgressPct: number;
  absoluteSlot: number;
  blockHeight: number;
  /** Round-trip time of the getEpochInfo call itself, uncached. */
  slotLatencyMs: number;
  fetchedAt: string;
}

// Returns null when the RPC cannot be reached. There is deliberately no
// fallback epoch: a stale hardcoded epoch rendered as "live" telemetry is worse
// than an honest "unavailable" state.
export async function fetchSolanaEpochInfo(): Promise<SolanaEpochData | null> {
  // No hardcoded API keys. Falls back to the public Solana RPC when no Helius
  // key is configured (lower rate limits, but no secret leaked in source).
  const rpcUrl = getHeliusRpcUrl() || 'https://api.mainnet-beta.solana.com';

  try {
    const startTime = Date.now();
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getEpochInfo',
      }),
      // No fetch cache: a cached response would make `rpcLatencyMs` measure a
      // memory read rather than the network round-trip it claims to report.
      cache: 'no-store',
    });

    const latency = Date.now() - startTime;
    const json = await response.json();
    const result = json?.result;

    if (result) {
      const epochProgressPct = Math.round((result.slotIndex / result.slotsInEpoch) * 1000) / 10;
      return {
        epoch: result.epoch,
        slotIndex: result.slotIndex,
        slotsInEpoch: result.slotsInEpoch,
        epochProgressPct,
        absoluteSlot: result.absoluteSlot,
        blockHeight: result.blockHeight,
        slotLatencyMs: latency,
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch {
    // fall through to null
  }

  return null;
}
