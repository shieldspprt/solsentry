import { ProtocolRecord } from './types';
import registry from './protocol-registry.json';

// Bundled protocol registry: identity, program IDs and audit history — the facts
// that do not change hour to hour. Loaded from protocol-registry.json, which
// scripts/seed-protocols.js also reads, so the app and the DB seed cannot drift
// apart (they previously held separate lists whose program IDs disagreed).
//
// Everything measurable is null here on purpose. TVL comes from DeFiLlama and
// risk_score from the scorer at request time; a bundled number would be a stale
// constant dressed as a measurement, which is exactly what this codebase is
// being cleaned of. The UI renders null as "—".
export const DEFAULT_SOLANA_PROTOCOLS: ProtocolRecord[] = registry.protocols.map((p) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  category: p.category as ProtocolRecord['category'],
  program_ids: p.program_ids,
  tvl_usd: null,
  tvl_change_24h: null,
  audit_status: p.audit_status as ProtocolRecord['audit_status'],
  auditors: p.auditors,
  audit_date: p.audit_date,
  exploit_history: [],
  oracle_provider: p.oracle_provider as ProtocolRecord['oracle_provider'],
  oracle_health: 'unknown',
  risk_score: null,
  last_updated: new Date(0).toISOString(),
  created_at: new Date(0).toISOString(),
}));
