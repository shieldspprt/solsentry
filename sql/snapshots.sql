-- ============================================
-- SolSentry: protocol risk time-series snapshots
-- Enables trend analysis (7d/30d deltas), the single highest-value
-- decision input that point-in-time scoring cannot provide.
-- Run via: node scripts/migrate.js  (or apply directly)
-- ============================================

CREATE TABLE IF NOT EXISTS protocol_metric_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol_slug TEXT NOT NULL,
  composite_score NUMERIC NOT NULL,
  audit_governance_score NUMERIC,
  liquidation_rekt_score NUMERIC,
  mev_bot_density_score NUMERIC,
  whale_concentration_score NUMERIC,
  oracle_depeg_score NUMERIC,
  business_efficiency_score NUMERIC,
  web_community_score NUMERIC,
  -- How much of the model was actually grounded when this row was written.
  -- A score captured at 20% coverage is not comparable to one at 70%, so the
  -- trend consumer needs this to avoid reading a coverage change as a risk change.
  weight_covered_pct NUMERIC,
  tvl_usd NUMERIC,
  confidence NUMERIC,
  model_version TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The hour bucket this row belongs to, written explicitly by the caller.
  -- date_trunc() over a timestamptz is only STABLE (its result depends on the
  -- session TimeZone), so Postgres rejects it in an index expression:
  --   "functions in index expressions must be marked IMMUTABLE"
  -- A plain column also gives ON CONFLICT a real unique constraint to target,
  -- which an expression index cannot provide to PostgREST's upsert.
  captured_hour TIMESTAMPTZ NOT NULL,
  CONSTRAINT protocol_metric_snapshots_slug_hour_key UNIQUE (protocol_slug, captured_hour)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_slug_time
  ON protocol_metric_snapshots(protocol_slug, captured_at DESC);

-- Adopt the new shape on databases created before captured_hour existed.
ALTER TABLE protocol_metric_snapshots
  ADD COLUMN IF NOT EXISTS captured_hour TIMESTAMPTZ;
ALTER TABLE protocol_metric_snapshots
  ADD COLUMN IF NOT EXISTS weight_covered_pct NUMERIC;
UPDATE protocol_metric_snapshots
  SET captured_hour = date_trunc('hour', captured_at)
  WHERE captured_hour IS NULL;

DO $$
BEGIN
  ALTER TABLE protocol_metric_snapshots ALTER COLUMN captured_hour SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE protocol_metric_snapshots
    ADD CONSTRAINT protocol_metric_snapshots_slug_hour_key UNIQUE (protocol_slug, captured_hour);
EXCEPTION WHEN duplicate_table THEN NULL;
        WHEN duplicate_object THEN NULL;
END $$;
