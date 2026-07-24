'use client';

import useSWR from 'swr';
import { ProtocolRecord, PositionRecord, AgentRecord, InstitutionalFactorsBreakdown } from '../lib/types';

export function useProtocols(fallbackData?: ProtocolRecord[]) {
  const { data, error, isLoading, mutate } = useSWR<ProtocolRecord[]>('/api/v1/protocols', {
    fallbackData,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    protocols: data || fallbackData || [],
    isLoading,
    isError: Boolean(error),
    mutate,
  };
}

export function usePositions(fallbackData?: PositionRecord[]) {
  const { data, error, isLoading, mutate } = useSWR<PositionRecord[]>('/api/v1/positions/read', {
    fallbackData,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    positions: data || fallbackData || [],
    isLoading,
    isError: Boolean(error),
    mutate,
  };
}

export function useAgents(fallbackData?: AgentRecord[]) {
  const { data, error, isLoading, mutate } = useSWR<AgentRecord[]>('/api/v1/agents', {
    fallbackData,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    agents: data || fallbackData || [],
    isLoading,
    isError: Boolean(error),
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
