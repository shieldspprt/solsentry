-- ============================================
-- AgentGate: protocol risk time-series snapshots
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
  web_community_score NUMERIC,
  business_efficiency_score NUMERIC,
  tvl_usd NUMERIC,
  confidence NUMERIC,
  model_version TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_slug_time
  ON protocol_metric_snapshots(protocol_slug, captured_at DESC);

-- One row per protocol per hour keeps the series compact while preserving
-- enough resolution for 7d/30d trend deltas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_slug_hour
  ON protocol_metric_snapshots(protocol_slug, date_trunc('hour', captured_at));
