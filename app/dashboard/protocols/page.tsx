import React from 'react';
import { ProtocolsView } from '../../../components/features/ProtocolsView';
import { DEFAULT_SOLANA_PROTOCOLS } from '../../../lib/default-protocols';

export default function ProtocolsPage() {
  return <ProtocolsView protocols={DEFAULT_SOLANA_PROTOCOLS} />;
}
