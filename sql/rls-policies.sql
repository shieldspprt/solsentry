-- ============================================
-- AgentGate Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE x402_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

-- Protocols are publicly readable
DROP POLICY IF EXISTS "Protocols are publicly readable" ON protocols;
CREATE POLICY "Protocols are publicly readable" ON protocols FOR SELECT USING (true);

-- Users can view & update their own record
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Agents belong to users
DROP POLICY IF EXISTS "Users can manage own agents" ON agents;
CREATE POLICY "Users can manage own agents" ON agents FOR ALL USING (auth.uid() = user_id);

-- Risk checks belong to users
DROP POLICY IF EXISTS "Users can view own risk checks" ON risk_checks;
CREATE POLICY "Users can view own risk checks" ON risk_checks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own risk checks" ON risk_checks;
CREATE POLICY "Users can insert own risk checks" ON risk_checks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Positions belong to users
DROP POLICY IF EXISTS "Users can manage own positions" ON positions;
CREATE POLICY "Users can manage own positions" ON positions FOR ALL USING (auth.uid() = user_id);

-- Policies belong to users
DROP POLICY IF EXISTS "Users can manage own policies" ON policies;
CREATE POLICY "Users can manage own policies" ON policies FOR ALL USING (auth.uid() = user_id);

-- Policy violations belong to users via agent ownership
DROP POLICY IF EXISTS "Users can view own violations" ON policy_violations;
CREATE POLICY "Users can view own violations" ON policy_violations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM agents WHERE agents.id = policy_violations.agent_id AND agents.user_id = auth.uid()
  )
);

-- Alerts belong to users
DROP POLICY IF EXISTS "Users can manage own alerts" ON alerts;
CREATE POLICY "Users can manage own alerts" ON alerts FOR ALL USING (auth.uid() = user_id);

-- x402 payments belong to users
DROP POLICY IF EXISTS "Users can view own payments" ON x402_payments;
CREATE POLICY "Users can view own payments" ON x402_payments FOR SELECT USING (auth.uid() = user_id);
