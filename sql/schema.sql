-- ============================================
-- AgentGate Database Schema
-- Version: 1.0.0
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL DEFAULT ('ag_' || replace(uuid_generate_v4()::text, '-', '')),
  plan TEXT NOT NULL DEFAULT 'free',
  x402_wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: agents
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL DEFAULT 'custom',
  wallet_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: protocols
-- ============================================
CREATE TABLE IF NOT EXISTS protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  program_ids TEXT[] NOT NULL DEFAULT '{}',
  tvl_usd NUMERIC,
  tvl_change_24h NUMERIC,
  audit_status TEXT DEFAULT 'unknown',
  auditors TEXT[] DEFAULT '{}',
  audit_date DATE,
  exploit_history JSONB DEFAULT '[]',
  oracle_provider TEXT,
  oracle_health TEXT DEFAULT 'unknown',
  risk_score NUMERIC,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: risk_checks
-- ============================================
CREATE TABLE IF NOT EXISTS risk_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  protocol_slug TEXT NOT NULL,
  action TEXT NOT NULL,
  asset TEXT,
  amount_usd NUMERIC,
  risk_score NUMERIC NOT NULL,
  risk_level TEXT NOT NULL,
  risk_factors JSONB NOT NULL DEFAULT '{}',
  recommendation TEXT,
  response_time_ms INTEGER,
  x402_paid BOOLEAN DEFAULT false,
  x402_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: positions
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  protocol_slug TEXT NOT NULL,
  position_type TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  amount_usd NUMERIC,
  entry_price NUMERIC,
  current_price NUMERIC,
  health_factor NUMERIC,
  liquidation_price NUMERIC,
  pnl_usd NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: policies
-- ============================================
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rules JSONB NOT NULL DEFAULT '{
    "max_single_tx_usd": 1000,
    "max_daily_volume_usd": 10000,
    "max_position_size_usd": 5000,
    "max_drawdown_pct": 15,
    "allowed_protocols": ["kamino", "jupiter", "drift", "orca", "raydium", "meteora", "marinade", "jito"],
    "blocked_protocols": [],
    "allowed_actions": ["lend", "borrow", "swap", "lp", "stake"],
    "blocked_actions": [],
    "min_risk_score": 5.0,
    "auto_deleverage_health_factor": 1.2,
    "cooldown_after_loss_hours": 24,
    "max_open_positions": 10,
    "require_oracle_healthy": true,
    "require_audited": false
  }',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: policy_violations
-- ============================================
CREATE TABLE IF NOT EXISTS policy_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  rule_violated TEXT NOT NULL,
  action_attempted TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'warning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: alerts
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: x402_payments
-- ============================================
CREATE TABLE IF NOT EXISTS x402_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  amount_usdc NUMERIC NOT NULL,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_risk_checks_agent ON risk_checks(agent_id);
CREATE INDEX IF NOT EXISTS idx_risk_checks_user ON risk_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_checks_created ON risk_checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_positions_agent ON positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_policy_violations_agent ON policy_violations(agent_id);
CREATE INDEX IF NOT EXISTS idx_protocols_slug ON protocols(slug);

-- ============================================
-- SEED PROTOCOLS
-- ============================================
INSERT INTO protocols (slug, name, category, program_ids, audit_status, auditors, oracle_provider, risk_score) VALUES
('kamino', 'Kamino Finance', 'lending', ARRAY['6LtLMovXri1PGVYrS4UfLS5WZZKPv3779e5v94vL8f65'], 'audited', ARRAY['OtterSec','Neodyme'], 'pyth', 8.5),
('drift', 'Drift Protocol', 'perps', ARRAY['dRifTKGMS62nXiXYdYXxQPhuEGfqySUR36v232w3W6x'], 'audited', ARRAY['OtterSec','Halborn'], 'pyth', 8.2),
('jupiter', 'Jupiter', 'dex', ARRAY['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'], 'audited', ARRAY['OtterSec'], 'pyth', 9.2),
('orca', 'Orca', 'dex', ARRAY['whirLbxic2xrFuFvyfuNhUfcvX4WzL3Hyq89nAgyXAL'], 'audited', ARRAY['OtterSec','Neodyme'], 'pyth', 9.0),
('raydium', 'Raydium', 'dex', ARRAY['675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'], 'audited', ARRAY['OtterSec'], 'pyth', 8.0),
('meteora', 'Meteora', 'dex', ARRAY['LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'], 'audited', ARRAY['OtterSec'], 'pyth', 8.4),
('marinade', 'Marinade Finance', 'staking', ARRAY['MarBGuTtEwyd1bcsQmAcvM5ftJLrgSpM9vC6xWwa1Bu'], 'audited', ARRAY['OtterSec','Neodyme'], 'pyth', 9.4),
('jito', 'Jito', 'staking', ARRAY['Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4gF3f14kr'], 'audited', ARRAY['OtterSec'], 'pyth', 9.1)
ON CONFLICT (slug) DO UPDATE SET
  risk_score = EXCLUDED.risk_score,
  last_updated = now();
