import { safeFetchWithRetry } from '../../../../lib/safe-fetch';

// Realized exploit history from DeFiLlama's hacks dataset.
//
// This is the tail risk the model previously omitted entirely: the engine rated
// Drift 7.4/10 and said nothing about a $295M admin-key compromise 114 days
// earlier. Audits, TVL and holder concentration all describe how a protocol
// looks; this describes what has actually happened to it.
//
// Unlike the other factors it can force a verdict rather than being averaged
// away — a nine-figure loss inside the last few months should not be diluted to
// a fraction of a point by six healthy-looking co-factors.

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let allIncidents: { data: RawHack[]; at: number } | null = null;
let inFlight: Promise<RawHack[] | null> | null = null;

interface RawHack {
  date: number; // unix seconds
  name?: string;
  classification?: string;
  technique?: string;
  amount?: number | null;
  chain?: string[];
  targetType?: string;
  source?: string;
  returnedFunds?: number | null;
  parentProtocolId?: string;
}

export interface ProtocolIncident {
  name: string;
  /** ISO date of the incident. */
  occurred_at: string;
  age_days: number;
  amount_usd: number | null;
  technique: string | null;
  classification: string | null;
  source_url: string | null;
}

export interface ProtocolIncidentHistory {
  slug: string;
  incidents: ProtocolIncident[];
  /** Most recent incident, or null if the protocol has never been exploited. */
  most_recent: ProtocolIncident | null;
  total_lost_usd: number;
  as_of: string;
}

async function fetchAllHacks(): Promise<RawHack[] | null> {
  if (allIncidents && Date.now() - allIncidents.at < CACHE_TTL_MS) return allIncidents.data;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await safeFetchWithRetry('https://api.llama.fi/hacks', { timeoutMs: 15000 });
      if (!res || !res.ok) return null;
      const json = await res.json();
      if (!Array.isArray(json)) return null;
      allIncidents = { data: json as RawHack[], at: Date.now() };
      return allIncidents.data;
    } catch {
      return null;
    } finally {
      setTimeout(() => {
        inFlight = null;
      }, 0);
    }
  })();
  return inFlight;
}

// DeFiLlama tags each hack with parentProtocolId ("parent#raydium"), which maps
// onto our slugs directly for most protocols. A couple differ.
const PARENT_ID_OVERRIDES: Record<string, string> = {
  pumpfun: 'pump',
};

export async function fetchProtocolIncidents(slug: string): Promise<ProtocolIncidentHistory | null> {
  const hacks = await fetchAllHacks();
  if (!hacks) return null;

  const parentKey = PARENT_ID_OVERRIDES[slug] || slug;
  const now = Date.now();

  const matched = hacks.filter((h) => {
    const parent = String(h.parentProtocolId || '').replace('parent#', '').toLowerCase();
    if (parent) return parent === parentKey;
    // Fall back to the display name only when no parent id is present, and
    // require a word-boundary match so "drift" does not swallow "Driftwood".
    const name = String(h.name || '').toLowerCase();
    return new RegExp(`\\b${parentKey}\\b`).test(name);
  });

  const incidents: ProtocolIncident[] = matched
    .map((h) => {
      const occurredMs = h.date * 1000;
      return {
        name: h.name || 'Unnamed incident',
        occurred_at: new Date(occurredMs).toISOString(),
        age_days: Math.max(0, Math.floor((now - occurredMs) / DAY_MS)),
        amount_usd: typeof h.amount === 'number' && Number.isFinite(h.amount) ? h.amount : null,
        technique: h.technique || null,
        classification: h.classification || null,
        source_url: h.source || null,
      };
    })
    .sort((a, b) => a.age_days - b.age_days);

  return {
    slug,
    incidents,
    most_recent: incidents[0] || null,
    total_lost_usd: incidents.reduce((sum, i) => sum + (i.amount_usd || 0), 0),
    as_of: new Date().toISOString(),
  };
}

// --- Scoring -----------------------------------------------------------------
// Thresholds are explicit constants rather than a tuned black box, so a reader
// can disagree with them and see exactly what to change.

/** Inside this window an exploit is treated as bearing on the protocol today. */
export const RECENT_INCIDENT_DAYS = 180;
/** A loss at or above this inside the recent window forces a block verdict. */
export const SEVERE_LOSS_USD = 10_000_000;
/** A loss at or above this inside the recent window caps the verdict at avoid. */
export const MATERIAL_LOSS_USD = 1_000_000;
/** Beyond this an incident is history: it informs the score but cannot gate it. */
const FULLY_DECAYED_DAYS = 1095; // 3 years

export interface IncidentAssessment {
  score: number; // 0..10, higher = safer
  /** Hard verdict gate, applied on top of the composite. */
  gate: 'block' | 'avoid' | null;
  warnings: string[];
  rationale: string;
}

function severityOf(amountUsd: number | null): number {
  // Log-scaled: $100k ≈ 2, $1M ≈ 4, $10M ≈ 6, $100M ≈ 8, $1B ≈ 10.
  if (!amountUsd || amountUsd <= 0) return 3; // an exploit with an unreported figure still counts
  return Math.max(0, Math.min(10, 2 * (Math.log10(amountUsd) - 3)));
}

function ageWeight(ageDays: number): number {
  if (ageDays <= RECENT_INCIDENT_DAYS) return 1;
  if (ageDays >= FULLY_DECAYED_DAYS) return 0.1;
  const span = FULLY_DECAYED_DAYS - RECENT_INCIDENT_DAYS;
  return 1 - 0.9 * ((ageDays - RECENT_INCIDENT_DAYS) / span);
}

export function assessIncidents(history: ProtocolIncidentHistory): IncidentAssessment {
  const warnings: string[] = [];

  if (history.incidents.length === 0) {
    return {
      score: 10,
      gate: null,
      warnings,
      rationale: 'No exploit on record in the DeFiLlama hacks dataset.',
    };
  }

  // Penalties accumulate but each older incident matters progressively less.
  const penalty = history.incidents.reduce(
    (sum, i) => sum + severityOf(i.amount_usd) * ageWeight(i.age_days),
    0
  );
  const score = Math.max(0, Math.min(10, 10 - penalty));

  let gate: IncidentAssessment['gate'] = null;
  const recent = history.incidents.filter((i) => i.age_days <= RECENT_INCIDENT_DAYS);
  for (const i of recent) {
    const amount = i.amount_usd;
    const usd = amount != null ? `$${(amount / 1_000_000).toFixed(1)}M` : 'an undisclosed sum';
    if (amount != null && amount >= SEVERE_LOSS_USD) {
      gate = 'block';
      warnings.push(
        `${i.name} lost ${usd} to "${i.technique || 'an exploit'}" ${i.age_days} days ago — within the ${RECENT_INCIDENT_DAYS}-day window`
      );
    } else if (amount != null && amount >= MATERIAL_LOSS_USD) {
      if (gate !== 'block') gate = 'avoid';
      warnings.push(`${i.name} lost ${usd} to "${i.technique || 'an exploit'}" ${i.age_days} days ago`);
    } else {
      warnings.push(`${i.name} was exploited ${i.age_days} days ago (${usd})`);
    }
  }

  const mr = history.most_recent!;
  const rationale =
    `${history.incidents.length} recorded exploit(s), ${
      history.total_lost_usd > 0 ? `$${(history.total_lost_usd / 1_000_000).toFixed(1)}M` : 'an undisclosed amount'
    } lost in total. Most recent: ${mr.name}, ${mr.age_days} days ago` +
    (mr.technique ? ` (${mr.technique})` : '') +
    '.';

  return { score: Math.round(score * 10) / 10, gate, warnings, rationale };
}
