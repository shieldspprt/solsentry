import React from 'react';
import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { ProtocolDetailView } from '../../../../components/features/ProtocolDetailView';
import { ProtocolRecord } from '../../../../lib/types';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../../lib/default-protocols';

export const revalidate = 60;

export interface ProtocolDetailPageProps {
  params: {
    slug: string;
  };
}

export default async function ProtocolDetailPage({ params }: ProtocolDetailPageProps) {
  const targetSlug = (params?.slug || '').toLowerCase();

  let protocol: ProtocolRecord | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from('protocols')
      .select('*')
      .eq('slug', targetSlug)
      .maybeSingle();

    if (data) {
      protocol = data as unknown as ProtocolRecord;
    }
  } catch {
    // Fallback
  }

  if (!protocol) {
    protocol = DEFAULT_SOLANA_PROTOCOLS.find((p) => p.slug === targetSlug) || null;
  }

  if (!protocol) {
    notFound();
  }

  return <ProtocolDetailView protocol={protocol} />;
}
