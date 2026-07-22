import { PositionRecord } from '../../../../lib/types';

// ============================================
// On-chain wallet position reader
// Reads a Solana wallet's REAL leveraged positions (with live health factors)
// from protocol public APIs and normalises them into PositionRecord[] so the
// existing position monitor + stress engine operate on real data.
// ============================================

export interface WalletReadResult {
  wallet: string;
  positions: PositionRecord[];
  sources_live: string[]; // protocols successfully read
  sources_failed: string[]; // protocols that errored / were unavailable
  as_of: string;
}

export interface WalletAdapter {
  slug: string;
  read: (wallet: string) => Promise<PositionRecord[]>;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Kamino lending markets. The API's /kamino-market list returns only the
// primary; the isolated markets are well-known constant pubkeys.
const KAMINO_MARKETS = [
  '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF', // Main
  'DxXdAyu3kCjnyggvHmY5nAwg5cRbbmdyX3npfDMjjMek', // JLP
  'ByYiZxp8QrdN9qbdtaAiePN8AAr3qvTPppNJDpf5DVJ5', // Altcoin
];

interface KaminoRefreshedStats {
  userTotalDeposit: string;
  userTotalBorrow: string;
  loanToValue: string;
  liquidationLtv: string;
  netAccountValue: string;
  leverage: string;
}

interface KaminoObligation {
  obligationAddress: string;
  refreshedStats: KaminoRefreshedStats;
}

// Real live health factor from Kamino's on-chain refreshed stats:
// HF = liquidationLtv / currentLtv  (>1 safe; <=1 liquidatable).
export const kaminoAdapter: WalletAdapter = {
  slug: 'kamino',
  read: async (wallet: string): Promise<PositionRecord[]> => {
    const positions: PositionRecord[] = [];
    for (const market of KAMINO_MARKETS) {
      try {
        const res = await fetch(
          `https://api.kamino.finance/kamino-market/${market}/users/${wallet}/obligations`,
          { next: { revalidate: 30 } }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const obligations: KaminoObligation[] = Array.isArray(data) ? data : data?.obligations || [];

        for (const o of obligations) {
          const rs = o.refreshedStats;
          if (!rs) continue;
          const deposit = Number(rs.userTotalDeposit) || 0;
          const borrow = Number(rs.userTotalBorrow) || 0;
          const ltv = Number(rs.loanToValue) || 0;
          const liqLtv = Number(rs.liquidationLtv) || 0;
          const netValue = Number(rs.netAccountValue) || 0;

          // Skip dust / empty obligations.
          if (deposit < 0.01 && borrow < 0.01) continue;

          const hasDebt = borrow > 0.01;
          const healthFactor = hasDebt && ltv > 0 ? Math.round((liqLtv / ltv) * 100) / 100 : null;

          positions.push({
            id: o.obligationAddress,
            agent_id: wallet,
            user_id: wallet,
            protocol_slug: 'kamino',
            position_type: hasDebt ? 'borrow' : 'lend',
            asset: 'multi-asset',
            amount: 0,
            amount_usd: Math.round((hasDebt ? borrow : deposit) * 100) / 100,
            entry_price: null,
            current_price: null,
            health_factor: healthFactor,
            liquidation_price: null,
            pnl_usd: Math.round(netValue * 100) / 100,
            status: 'open',
            last_checked: nowIso(),
            created_at: nowIso(),
            updated_at: nowIso(),
          });
        }
      } catch {
        // try next market
      }
    }
    return positions;
  },
};

// Drift perp/spot positions require the Drift SDK to deserialize on-chain User
// accounts (the public data API is gated). Registered here as a pending adapter
// so it slots into the same pipeline once the SDK integration is added.
export const driftAdapter: WalletAdapter = {
  slug: 'drift',
  read: async (): Promise<PositionRecord[]> => [],
};

const ADAPTERS: WalletAdapter[] = [kaminoAdapter, driftAdapter];

// Basic Solana base58 pubkey sanity check (32-44 chars, base58 alphabet).
export function isValidSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

export async function readWalletPositions(wallet: string): Promise<WalletReadResult> {
  const sourcesLive: string[] = [];
  const sourcesFailed: string[] = [];
  const all: PositionRecord[] = [];

  const results = await Promise.all(
    ADAPTERS.map(async (a) => {
      try {
        const positions = await a.read(wallet);
        return { slug: a.slug, positions, ok: true };
      } catch {
        return { slug: a.slug, positions: [] as PositionRecord[], ok: false };
      }
    })
  );

  for (const r of results) {
    if (r.ok) {
      if (r.positions.length > 0) sourcesLive.push(r.slug);
      all.push(...r.positions);
    } else {
      sourcesFailed.push(r.slug);
    }
  }

  return {
    wallet,
    positions: all,
    sources_live: sourcesLive,
    sources_failed: sourcesFailed,
    as_of: nowIso(),
  };
}
