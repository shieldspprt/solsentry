import React from 'react';
import { PositionsView } from '../../../components/features/PositionsView';
import { DEFAULT_SOLANA_POSITIONS } from '../../../lib/default-positions';

export default function PositionsPage() {
  return <PositionsView positions={DEFAULT_SOLANA_POSITIONS} />;
}
