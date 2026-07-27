-- ============================================
-- SolSentry: durable anomaly state and webhook subscriptions
-- Run via: node scripts/migrate.js (or apply directly in Supabase)
-- ============================================

-- A compact JSON snapshot of rolling median/MAD values, EWMA moments, and the
-- previous observation. One row replaces an unbounded five-second sample log.
CREATE TABLE IF NOT EXISTS oracle_anomaly_detector_state (
  monitor_id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deterministic event IDs make this table the distributed idempotency gate for
-- alerts and webhook fanout across serverless instances.
CREATE TABLE IF NOT EXISTS oracle_anomaly_events (
  id TEXT PRIMARY KEY,
  feed TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  event JSONB NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oracle_anomaly_events_observed
  ON oracle_anomaly_events(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_oracle_anomaly_events_feed
  ON oracle_anomaly_events(feed, observed_at DESC);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  url TEXT NOT NULL CHECK (length(url) <= 2048),
  events TEXT[] NOT NULL DEFAULT ARRAY['liquidation_risk', 'depeg', 'oracle_anomaly']::TEXT[],
  wallet_address TEXT,
  threshold_hf NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_subscriptions_events_supported CHECK (
    events <@ ARRAY[
      'liquidation_risk',
      'health_factor_low',
      'depeg',
      'protocol_exploit',
      'oracle_down',
      'oracle_anomaly'
    ]::TEXT[]
    AND cardinality(events) > 0
  )
);
DO $$
BEGIN
  ALTER TABLE webhook_subscriptions
    ADD CONSTRAINT webhook_subscriptions_user_url_key UNIQUE(user_id, url);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active
  ON webhook_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_events
  ON webhook_subscriptions USING GIN(events);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anomaly_event_id TEXT NOT NULL REFERENCES oracle_anomaly_events(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (length(url) <= 2048),
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed')),
  status_code INTEGER,
  error TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(anomaly_event_id, url)
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_attempted
  ON webhook_deliveries(attempted_at DESC);

-- Monotonic state write: a delayed invocation cannot overwrite a snapshot from
-- a newer sample bucket. SECURITY DEFINER is restricted to the service role.
CREATE OR REPLACE FUNCTION persist_oracle_anomaly_state(
  p_monitor_id TEXT,
  p_state JSONB,
  p_observed_at TIMESTAMPTZ
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO oracle_anomaly_detector_state (monitor_id, state, observed_at, updated_at)
  VALUES (p_monitor_id, p_state, p_observed_at, now())
  ON CONFLICT (monitor_id) DO UPDATE
    SET state = EXCLUDED.state,
        observed_at = EXCLUDED.observed_at,
        updated_at = now()
    WHERE oracle_anomaly_detector_state.observed_at < EXCLUDED.observed_at;
END;
$$;

REVOKE ALL ON FUNCTION persist_oracle_anomaly_state(TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION persist_oracle_anomaly_state(TEXT, JSONB, TIMESTAMPTZ) TO service_role;

ALTER TABLE oracle_anomaly_detector_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_anomaly_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: all access goes through authenticated API
-- routes using the service-role client. The service role bypasses RLS.
