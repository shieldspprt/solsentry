import React from 'react';
import { TxSimulatorView } from '../../../components/features/TxSimulatorView';

export const metadata = {
  title: 'Transaction Pre-Execution Simulator | SolSentry',
  description: 'Simulate serialized Solana transactions to calculate net balance deltas and drainer patterns.',
};

export default function SimulatorPage() {
  return <TxSimulatorView />;
}
