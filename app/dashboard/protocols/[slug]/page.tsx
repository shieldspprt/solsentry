import React from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { ProtocolDetailView } from '../../../../components/features/ProtocolDetailView';
import { ProtocolRecord } from '../../../../lib/types';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';
import { computeProtocolRisk } from '../../../../packages/core/src/risk-scorer';
import { buildGroundedMetrics } from '../../../../packages/core/src/data-fetchers/grounded-metrics';

export const revalidate = 60;

export interface ProtocolDetailPageProps {
  params: {
    slug: string;
  };
}

export default async function ProtocolDetailPage({ params }: ProtocolDetailPageProps) {
  const targetSlug = (params?.slug || '').toLowerCase();

  let protocol: ProtocolRecord | null = null;
  let registryError: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('protocols').select('*').eq('slug', targetSlug).maybeSingle();
    if (error) registryError = error.message;
    if (data) protocol = data as unknown as ProtocolRecord;
  } catch (err: any) {
    registryError = err?.message || 'protocol store unreachable';
  }

  if (!protocol) {
    protocol = DEFAULT_SOLANA_PROTOCOLS.find((p) => p.slug === targetSlug) || null;
  }

  if (!protocol) {
    notFound();
  }

  // Ground on the server. The browser cannot reach Pyth, Helius, DeFiLlama or
  // GitHub, so scoring client-side could only ever produce an ungrounded
  // baseline in which every data-driven factor reads "not measured".
  let sourcesLive: string[] = [];
  let sourcesUnavailable: string[] = [];
  let breakdown;
  try {
    const grounded = await buildGroundedMetrics(protocol);
    protocol = { ...protocol, tvl_usd: grounded.tvl_usd ?? protocol.tvl_usd };
    breakdown = computeProtocolRisk(
      { ...protocol, institutional_metrics: grounded.metrics },
      { provenance: grounded.provenance }
    );
    sourcesLive = grounded.sources_live;
    sourcesUnavailable = grounded.sources_unavailable;
  } catch {
    breakdown = computeProtocolRisk(protocol);
    sourcesUnavailable = ['all'];
  }

  return (
    <ProtocolDetailView
      protocol={protocol}
      breakdown={breakdown}
      sourcesLive={sourcesLive}
      sourcesUnavailable={sourcesUnavailable}
      registryError={registryError}
    />
  );
}
