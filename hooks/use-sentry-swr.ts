'use client';

import useSWR from 'swr';
import { ProtocolRecord, PositionRecord, AgentRecord, InstitutionalFactorsBreakdown } from '../lib/types';

export interface ScoredProtocol {
  protocol: ProtocolRecord;
  breakdown: InstitutionalFactorsBreakdown;
  sourcesLive: string[];
  sourcesUnavailable: string[];
}

export interface ScoredProtocolsResponse {
  asOf: string;
  registrySource: 'database' | 'bundled';
  registryError: string | null;
  count: number;
  protocols: ScoredProtocol[];
}

// The scored index. Grounding runs server-side, so these breakdowns carry real
// provenance — unlike computing the score in the browser, which can only ever
// produce the scorer's ungrounded baseline.
export function useScoredProtocols(fallbackData?: ScoredProtocolsResponse) {
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load scored protocol index');
    return (await res.json()) as ScoredProtocolsResponse;
  };

  const { data, error, isLoading, mutate } = useSWR<ScoredProtocolsResponse>(
    '/api/v1/protocols/scored',
    fetcher,
    { fallbackData, revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    scored: data?.protocols || [],
    asOf: data?.asOf || null,
    registrySource: data?.registrySource || null,
    registryError: data?.registryError || null,
    isLoading,
    isError: Boolean(error),
    mutate,
  };
}

// Positions only exist for a real wallet. Without one there is nothing to
// fetch, so the hook stays idle rather than requesting a sample set.
export function usePositions(walletAddress?: string | null) {
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to read positions');
    const json = await res.json();
    return (json?.rawPositions || []) as PositionRecord[];
  };

  const { data, error, isLoading, mutate } = useSWR<PositionRecord[]>(
    walletAddress ? `/api/v1/positions/read?wallet=${encodeURIComponent(walletAddress)}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  return {
    positions: data || [],
    hasWallet: Boolean(walletAddress),
    isLoading,
    isError: Boolean(error),
    mutate,
  };
}

export function useAgents() {
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    const json = await res.json();
    // 503 carries { error, message, agents: [] } when the store is unreachable.
    if (!res.ok) throw new Error(json?.message || 'Agent store unavailable');
    return (Array.isArray(json) ? json : []) as AgentRecord[];
  };

  const { data, error, isLoading, mutate } = useSWR<AgentRecord[]>('/api/v1/agents', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    agents: data || [],
    isLoading,
    isError: Boolean(error),
    errorMessage: error instanceof Error ? error.message : null,
    mutate,
  };
}

export function useProtocolRisk(protocolSlug: string, fallbackData?: InstitutionalFactorsBreakdown) {
  const fetcher = async () => {
    const res = await fetch('/api/v1/risk-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolSlug }),
    });
    if (!res.ok) throw new Error('Risk check failed');
    return res.json();
  };

  const { data, error, isLoading, mutate } = useSWR<InstitutionalFactorsBreakdown>(
    protocolSlug ? `risk_check_${protocolSlug}` : null,
    fetcher,
    {
      fallbackData,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    }
  );

  return {
    riskData: data || fallbackData,
    isLoading,
    isError: Boolean(error),
    mutate,
  };
}
