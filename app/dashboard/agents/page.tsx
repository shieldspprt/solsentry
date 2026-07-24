import React from 'react';
import { AgentsView } from '../../../components/features/AgentsView';
import { DEFAULT_SOLANA_AGENTS } from '../../../lib/default-agents';

export default function AgentsPage() {
  return <AgentsView initialAgents={DEFAULT_SOLANA_AGENTS} />;
}
