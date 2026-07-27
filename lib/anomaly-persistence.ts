import { SupabaseClient } from '@supabase/supabase-js';
import { AnomalyEvent } from './types';
import { getSupabaseAdmin } from './supabase-admin';
import { OnlineAnomalyDetectorState } from '../packages/core/src/anomaly-detector';

export const WEBHOOK_EVENT_TYPES = [
  'liquidation_risk',
  'health_factor_low',
  'depeg',
  'protocol_exploit',
  'oracle_down',
  'oracle_anomaly',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export interface WebhookSubscriptionRecord {
  id: string;
  user_id: string | null;
  agent_id: string | null;
  url: string;
  events: WebhookEventType[];
  wallet_address: string | null;
  threshold_hf: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewWebhookSubscription {
  user_id: string | null;
  agent_id: string | null;
  url: string;
  events: WebhookEventType[];
  wallet_address: string | null;
  threshold_hf: number | null;
}

export interface WebhookDeliveryResult {
  ok: boolean;
  statusCode: number | null;
  error: string | null;
}

export interface AnomalyPersistence {
  loadDetectorState(monitorId: string): Promise<OnlineAnomalyDetectorState | null>;
  saveDetectorState(monitorId: string, state: OnlineAnomalyDetectorState, observedAt: string): Promise<void>;
  /** Returns true only for the process that inserted this event first. */
  claimAnomalyEvent(event: AnomalyEvent): Promise<boolean>;
  listWebhookUrls(event: WebhookEventType): Promise<string[]>;
  createWebhookSubscription(input: NewWebhookSubscription): Promise<WebhookSubscriptionRecord>;
  listWebhookSubscriptions(userId: string): Promise<WebhookSubscriptionRecord[]>;
  recordWebhookDelivery(eventId: string, url: string, result: WebhookDeliveryResult): Promise<void>;
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

export class SupabaseAnomalyPersistence implements AnomalyPersistence {
  constructor(private readonly supabase: SupabaseClient) {}

  async loadDetectorState(monitorId: string): Promise<OnlineAnomalyDetectorState | null> {
    const { data, error } = await this.supabase
      .from('oracle_anomaly_detector_state')
      .select('state')
      .eq('monitor_id', monitorId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load anomaly detector state: ${error.message}`);
    return (data?.state as OnlineAnomalyDetectorState | null) ?? null;
  }

  async saveDetectorState(
    monitorId: string,
    state: OnlineAnomalyDetectorState,
    observedAt: string
  ): Promise<void> {
    // The SQL function performs a monotonic upsert: a delayed serverless
    // invocation cannot overwrite a newer snapshot with stale state.
    const { error } = await this.supabase.rpc('persist_oracle_anomaly_state', {
      p_monitor_id: monitorId,
      p_state: state,
      p_observed_at: observedAt,
    });
    if (error) throw new Error(`Failed to persist anomaly detector state: ${error.message}`);
  }

  async claimAnomalyEvent(event: AnomalyEvent): Promise<boolean> {
    const { error } = await this.supabase.from('oracle_anomaly_events').insert({
      id: event.id,
      feed: event.feed,
      severity: event.severity,
      score: event.score,
      event,
      observed_at: event.timestamp,
    });
    if (isUniqueViolation(error)) return false;
    if (error) throw new Error(`Failed to persist anomaly event: ${error.message}`);
    return true;
  }

  async listWebhookUrls(event: WebhookEventType): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('webhook_subscriptions')
      .select('url')
      .eq('is_active', true)
      .contains('events', [event]);
    if (error) throw new Error(`Failed to load webhook subscriptions: ${error.message}`);
    return (data ?? []).map((row) => row.url).filter((url): url is string => typeof url === 'string');
  }

  async createWebhookSubscription(input: NewWebhookSubscription): Promise<WebhookSubscriptionRecord> {
    // One active callback per authenticated user and URL. The database unique
    // constraint makes concurrent re-subscriptions atomic. Development calls
    // without an attributed user insert separate rows because PostgreSQL treats
    // NULLs as distinct.
    const { data, error } = await this.supabase
      .from('webhook_subscriptions')
      .upsert(
        {
          ...input,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,url' }
      )
      .select('*')
      .single();
    if (error || !data) throw new Error(`Failed to persist webhook subscription: ${error?.message ?? 'no row returned'}`);
    return data as WebhookSubscriptionRecord;
  }

  async listWebhookSubscriptions(userId: string): Promise<WebhookSubscriptionRecord[]> {
    const { data, error } = await this.supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to list webhook subscriptions: ${error.message}`);
    return (data ?? []) as WebhookSubscriptionRecord[];
  }

  async recordWebhookDelivery(eventId: string, url: string, result: WebhookDeliveryResult): Promise<void> {
    const { error } = await this.supabase.from('webhook_deliveries').upsert(
      {
        anomaly_event_id: eventId,
        url,
        status: result.ok ? 'delivered' : 'failed',
        status_code: result.statusCode,
        error: result.error,
        attempted_at: new Date().toISOString(),
      },
      { onConflict: 'anomaly_event_id,url' }
    );
    if (error) throw new Error(`Failed to record webhook delivery: ${error.message}`);
  }
}

let defaultPersistence: AnomalyPersistence | null | undefined;

export function hasAnomalyPersistenceConfiguration(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getAnomalyPersistence(): AnomalyPersistence | null {
  if (defaultPersistence !== undefined) return defaultPersistence;
  defaultPersistence = hasAnomalyPersistenceConfiguration()
    ? new SupabaseAnomalyPersistence(getSupabaseAdmin())
    : null;
  return defaultPersistence;
}

/** Test helper; production callers use the environment-backed singleton. */
export function setAnomalyPersistenceForTests(persistence: AnomalyPersistence | null | undefined): void {
  defaultPersistence = persistence;
}
