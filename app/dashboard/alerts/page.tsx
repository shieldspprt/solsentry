import React from 'react';
import { AlertsView } from '../../../components/features/AlertsView';
import { DEFAULT_SOLANA_ALERTS } from '../../../lib/default-alerts';

export default function AlertsPage() {
  return <AlertsView alerts={DEFAULT_SOLANA_ALERTS} />;
}
