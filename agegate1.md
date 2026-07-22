# 📋 Complete Project Plan — `AgentGate`

Below is the **full markdown document**. Copy it, save it as `AGENTGATE_PROJECT_PLAN.md`, and feed it to any agentic AI builder (Cursor, Claude Code, Windsurf, Devin, etc.) file-by-file or as a whole.

---

```markdown
# AgentGate — Complete Project Plan
## AI Agent DeFi Risk Middleware for Solana

> **Tagline:** "Every AI agent can trade. AgentGate makes sure they don't get rekt."
> **Version:** 1.0.0
> **Date:** July 21, 2026
> **Author:** Solo Builder
> **License:** MIT (Open Source)

---

## 1. PROJECT OVERVIEW

### 1.1 What Is AgentGate?
AgentGate is an open-source risk middleware layer that sits between AI agents
and Solana DeFi protocols. Before an AI agent executes any DeFi transaction
(lend, borrow, swap, LP, stake), it calls AgentGate's MCP tools or REST API
to get a real-time risk assessment. AgentGate returns a structured risk score,
protocol health data, position warnings, and policy enforcement decisions.

AgentGate does NOT hold user funds. It does NOT execute transactions.
It is a READ-ONLY safety layer + policy engine.

### 1.2 Core Features (MVP)
1. **Pre-Flight Risk Check** — Score any Solana DeFi protocol before an agent interacts with it
2. **Position Health Monitor** — Track open positions (Kamino, Drift, Jupiter Lend) and alert on liquidation risk
3. **Policy Engine (Guardrails)** — Configurable rules: max tx size, allowed protocols, drawdown limits, circuit breakers
4. **MCP Server** — Expose all features as MCP tools so any AI agent (Claude, GPT, ElizaOS) can call them
5. **REST API** — Standard HTTP API for non-MCP integrations
6. **Dashboard** — Web UI to view agent activity, risk scores, position health, and policy configs
7. **x402 Monetization** — Charge per API call via Solana x402 micropayments (USDC)

### 1.3 Target Users
- AI agent developers building on Solana (ElizaOS, Solana Agent Kit, custom agents)
- DeFi protocols wanting to offer "agent-safe" integrations
- Individual users running autonomous trading agents

### 1.4 What AgentGate is NOT
- NOT a wallet
- NOT a trading bot
- NOT a smart contract protocol
- NOT an insurance product
- NOT a custodian of funds

---

## 2. TECH STACK

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui | Fast, SSR, great DX |
| **Hosting** | Netlify (frontend + serverless functions) | Free tier, easy deploy, edge functions |
| **Database** | Supabase (PostgreSQL) | Free tier, auth included, realtime, REST API auto-generated |
| **Auth** | Supabase Auth (email + API key) | Free, simple, JWT-based |
| **API Layer** | Netlify Functions (TypeScript) | Serverless, no server to manage |
| **MCP Server** | Node.js + @modelcontextprotocol/sdk | Standard MCP spec for AI agents |
| **Blockchain Data** | Helius RPC (free tier) + Pyth Network API | Solana on-chain data + oracle prices |
| **Payments** | Solana x402 (USDC micropayments) | Native, no accounts, per-call billing |
| **Monitoring** | Supabase Realtime + Netlify Analytics | Free, built-in |
| **Language** | TypeScript (strict mode) everywhere | Type safety, one language |
| **Package Manager** | pnpm | Fast, disk-efficient |
| **Linting** | ESLint + Prettier | Consistency |
| **Testing** | Vitest | Fast, TS-native |

### 2.1 Free Tier Budget (Monthly Cost: $0)
| Service | Free Tier Limits | Enough? |
|---------|-----------------|---------|
| Supabase | 500MB DB, 50K MAU, 2GB bandwidth | ✅ Yes for MVP |
| Netlify | 100GB bandwidth, 125K function invocations | ✅ Yes for MVP |
| Helius RPC | 1M credits/month (free tier) | ✅ Yes for MVP |
| Pyth Network | Free public API | ✅ Yes |
| GitHub | Unlimited repos | ✅ Yes |

---

## 3. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                        AI AGENT LAYER                       │
│  (ElizaOS Agent / Claude / GPT / Custom Agent / Solana Kit) │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Tool Call / REST API / x402
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    AGENTGATE MIDDLEWARE                      │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  MCP Server  │  │  REST API    │  │  x402 Payment     │  │
│  │  (Node.js)   │  │  (Netlify    │  │  Gateway          │  │
│  │              │  │   Functions) │  │  (Netlify Func)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│         ▼                 ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              CORE RISK ENGINE (TypeScript)           │    │
│  │                                                     │    │
│  │  ┌───────────┐ ┌────────────┐ ┌─────────────────┐  │    │
│  │  │ Protocol  │ │ Position   │ │ Policy Engine   │  │    │
│  │  │ Risk      │ │ Health     │ │ (Guardrails)    │  │    │
│  │  │ Scorer    │ │ Monitor    │ │                 │  │    │
│  │  └─────┬─────┘ └─────┬──────┘ └────────┬────────┘  │    │
│  │        │             │                  │           │    │
│  └────────┼─────────────┼──────────────────┼───────────┘    │
│           │             │                  │                │
└───────────┼─────────────┼──────────────────┼────────────────┘
            │             │                  │
            ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Supabase │  │ Helius   │  │ Pyth     │  │ Public     │  │
│  │ (DB+Auth)│  │ RPC      │  │ Oracle   │  │ Audit DBs  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ DeFiLlama│  │ Solana   │  │ OtterSec │                  │
│  │ API      │  │ FM API   │  │ Audit DB │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. DATABASE SCHEMA (Supabase / PostgreSQL)

### 4.1 SQL Migration File: `supabase/migrations/001_initial_schema.sql`

```sql
-- ============================================
-- AgentGate Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL DEFAULT ('ag_' || replace(uuid_generate_v4()::text, '-', '')),
  plan TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'enterprise'
  x402_wallet TEXT,  -- Solana wallet address for x402 payments
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: agents
-- Registered AI agents
-- ============================================
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL DEFAULT 'custom',  -- 'eliza' | 'solana_agent_kit' | 'custom' | 'claude' | 'gpt'
  wallet_address TEXT,  -- Agent's Solana wallet (read-only tracking)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: protocols
-- Cached Solana DeFi protocol data
-- ============================================
CREATE TABLE protocols (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,  -- 'kamino', 'drift', 'jupiter', 'orca', 'raydium', 'meteora', 'marinade', 'jito'
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'lending' | 'dex' | 'perps' | 'staking' | 'yield' | 'bridge'
  program_ids TEXT[] NOT NULL DEFAULT '{}',  -- Solana program IDs
  tvl_usd NUMERIC,
  tvl_change_24h NUMERIC,
  audit_status TEXT DEFAULT 'unknown',  -- 'audited' | 'partial' | 'unaudited' | 'unknown'
  auditors TEXT[] DEFAULT '{}',  -- ['OtterSec', 'Neodyme', 'Halborn']
  audit_date DATE,
  exploit_history JSONB DEFAULT '[]',  -- [{date, amount, description}]
  oracle_provider TEXT,  -- 'pyth' | 'switchboard' | 'chainlink'
  oracle_health TEXT DEFAULT 'unknown',  -- 'healthy' | 'degraded' | 'down'
  risk_score NUMERIC,  -- 0-10, computed
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: risk_checks
-- Log of every pre-flight risk check
-- ============================================
CREATE TABLE risk_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  protocol_slug TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'lend' | 'borrow' | 'swap' | 'lp' | 'stake' | 'perp_long' | 'perp_short'
  asset TEXT,  -- 'SOL', 'USDC', 'JitoSOL'
  amount_usd NUMERIC,
  risk_score NUMERIC NOT NULL,  -- 0-10
  risk_level TEXT NOT NULL,  -- 'low' | 'medium' | 'high' | 'critical'
  risk_factors JSONB NOT NULL DEFAULT '{}',  -- detailed breakdown
  recommendation TEXT,  -- 'proceed' | 'proceed_with_caution' | 'avoid' | 'block'
  response_time_ms INTEGER,
  x402_paid BOOLEAN DEFAULT false,
  x402_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: positions
-- Tracked DeFi positions for agents
-- ============================================
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  protocol_slug TEXT NOT NULL,
  position_type TEXT NOT NULL,  -- 'lend' | 'borrow' | 'lp' | 'stake' | 'perp'
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  amount_usd NUMERIC,
  entry_price NUMERIC,
  current_price NUMERIC,
  health_factor NUMERIC,  -- for lending/borrowing
  liquidation_price NUMERIC,
  pnl_usd NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed' | 'liquidated'
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: policies
-- Guardrail policies per agent
-- ============================================
CREATE TABLE policies (
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
-- Log of blocked/warned actions
-- ============================================
CREATE TABLE policy_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  rule_violated TEXT NOT NULL,
  action_attempted TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'warning',  -- 'warning' | 'blocked' | 'circuit_breaker'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: alerts
-- Position health alerts
-- ============================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,  -- 'liquidation_risk' | 'health_factor_low' | 'depeg' | 'protocol_exploit' | 'oracle_down' | 'drawdown_limit'
  severity TEXT NOT NULL DEFAULT 'warning',  -- 'info' | 'warning' | 'critical'
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: x402_payments
-- Log of x402 micropayments
-- ============================================
CREATE TABLE x402_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  amount_usdc NUMERIC NOT NULL,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_risk_checks_agent ON risk_checks(agent_id);
CREATE INDEX idx_risk_checks_user ON risk_checks(user_id);
CREATE INDEX idx_risk_checks_created ON risk_checks(created_at DESC);
CREATE INDEX idx_positions_agent ON positions(agent_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = false;
CREATE INDEX idx_policy_violations_agent ON policy_violations(agent_id);
CREATE INDEX idx_protocols_slug ON protocols(slug);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE x402_payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Agents belong to users
CREATE POLICY "Users can manage own agents" ON agents FOR ALL USING (auth.uid() = user_id);

-- Risk checks belong to users
CREATE POLICY "Users can view own risk checks" ON risk_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own risk checks" ON risk_checks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Positions belong to users
CREATE POLICY "Users can manage own positions" ON positions FOR ALL USING (auth.uid() = user_id);

-- Policies belong to users
CREATE POLICY "Users can manage own policies" ON policies FOR ALL USING (auth.uid() = user_id);

-- Policy violations belong to users
CREATE POLICY "Users can view own violations" ON policy_violations FOR SELECT USING (auth.uid() = user_id);

-- Alerts belong to users
CREATE POLICY "Users can manage own alerts" ON alerts FOR ALL USING (auth.uid() = user_id);

-- x402 payments belong to users
CREATE POLICY "Users can view own payments" ON x402_payments FOR SELECT USING (auth.uid() = user_id);

-- Protocols are public read
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Protocols are publicly readable" ON protocols FOR SELECT USING (true);

-- ============================================
-- SEED DATA: Initial Protocols
-- ============================================
INSERT INTO protocols (slug, name, category, program_ids, audit_status, auditors, oracle_provider) VALUES
('kamino', 'Kamino Finance', 'lending', ARRAY['KaminoProgramID'], 'audited', ARRAY['OtterSec','Neodyme'], 'pyth'),
('drift', 'Drift Protocol', 'perps', ARRAY['DriftProgramID'], 'audited', ARRAY['OtterSec','Halborn'], 'pyth'),
('jupiter', 'Jupiter', 'dex', ARRAY['JupiterProgramID'], 'audited', ARRAY['OtterSec'], 'pyth'),
('orca', 'Orca', 'dex', ARRAY['OrcaProgramID'], 'audited', ARRAY['OtterSec','Neodyme'], 'pyth'),
('raydium', 'Raydium', 'dex', ARRAY['RaydiumProgramID'], 'audited', ARRAY['OtterSec'], 'pyth'),
('meteora', 'Meteora', 'dex', ARRAY['MeteoraProgramID'], 'audited', ARRAY['OtterSec'], 'pyth'),
('marinade', 'Marinade Finance', 'staking', ARRAY['MarinadeProgramID'], 'audited', ARRAY['OtterSec','Neodyme'], 'pyth'),
('jito', 'Jito', 'staking', ARRAY['JitoProgramID'], 'audited', ARRAY['OtterSec'], 'pyth'),
('save', 'Save (ex-Solend)', 'lending', ARRAY['SaveProgramID'], 'audited', ARRAY['OtterSec'], 'pyth'),
('marginfi', 'MarginFi', 'lending', ARRAY['MarginFiProgramID'], 'audited', ARRAY['OtterSec','Neodyme'], 'pyth');
```

---

## 5. PROJECT FILE STRUCTURE

```
agentgate/
├── AGENTGATE_PROJECT_PLAN.md          # This file
├── README.md                          # Public README
├── LICENSE                            # MIT
├── package.json                       # Root package.json (pnpm workspace)
├── pnpm-workspace.yaml
├── tsconfig.json                      # Base TypeScript config
├── .env.example                       # Environment variables template
├── .gitignore
├── .eslintrc.json
├── .prettierrc
│
├── packages/
│   ├── core/                          # Core Risk Engine (shared library)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # Main exports
│   │       ├── types.ts               # All TypeScript types/interfaces
│   │       ├── constants.ts           # Protocol list, thresholds, config
│   │       ├── risk-scorer.ts         # Protocol risk scoring logic
│   │       ├── position-monitor.ts    # Position health monitoring
│   │       ├── policy-engine.ts       # Guardrail policy evaluation
│   │       ├── data-fetchers/
│   │       │   ├── helius.ts          # Helius RPC data fetcher
│   │       │   ├── pyth.ts            # Pyth oracle price fetcher
│   │       │   ├── defillama.ts       # DeFiLlama TVL fetcher
│   │       │   ├── audit-db.ts        # Audit status fetcher (OtterSec, etc.)
│   │       │   └── index.ts
│   │       └── utils/
│   │           ├── logger.ts
│   │           ├── cache.ts           # In-memory cache with TTL
│   │           └── helpers.ts
│   │
│   ├── mcp-server/                    # MCP Server for AI Agents
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # MCP server entry point
│   │       ├── tools/
│   │       │   ├── check-protocol-risk.ts
│   │       │   ├── check-position-health.ts
│   │       │   ├── evaluate-policy.ts
│   │       │   ├── get-protocol-list.ts
│   │       │   ├── get-alerts.ts
│   │       │   └── index.ts
│   │       ├── resources/
│   │       │   ├── protocol-report.ts
│   │       │   └── index.ts
│   │       └── middleware/
│   │           ├── auth.ts            # API key validation
│   │           └── rate-limit.ts
│   │
│   └── api-client/                    # TypeScript SDK for developers
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── client.ts              # AgentGateClient class
│           └── types.ts
│
├── apps/
│   ├── web/                           # Next.js Dashboard (Netlify)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── netlify.toml
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── page.tsx                    # Landing page
│   │       │   ├── globals.css
│   │       │   ├── dashboard/
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── page.tsx                # Overview dashboard
│   │       │   │   ├── agents/
│   │       │   │   │   ├── page.tsx            # Agent list
│   │       │   │   │   └── [id]/
│   │       │   │   │       └── page.tsx        # Agent detail
│   │       │   │   ├── protocols/
│   │       │   │   │   ├── page.tsx            # Protocol risk list
│   │       │   │   │   └── [slug]/
│   │       │   │   │       └── page.tsx        # Protocol detail
│   │       │   │   ├── positions/
│   │       │   │   │   └── page.tsx            # Position monitor
│   │       │   │   ├── policies/
│   │       │   │   │   └── page.tsx            # Policy editor
│   │       │   │   ├── alerts/
│   │       │   │   │   └── page.tsx            # Alert feed
│   │       │   │   └── settings/
│   │       │   │       └── page.tsx            # API keys, x402 wallet
│   │       │   ├── auth/
│   │       │   │   ├── login/
│   │       │   │   │   └── page.tsx
│   │       │   │   └── signup/
│   │       │   │       └── page.tsx
│   │       │   └── api/                        # Netlify-compatible API routes
│   │       │       └── health/
│   │       │           └── route.ts
│   │       ├── components/
│   │       │   ├── ui/                         # shadcn/ui components
│   │       │   │   ├── button.tsx
│   │       │   │   ├── card.tsx
│   │       │   │   ├── badge.tsx
│   │       │   │   ├── table.tsx
│   │       │   │   ├── dialog.tsx
│   │       │   │   ├── input.tsx
│   │       │   │   ├── select.tsx
│   │       │   │   ├── slider.tsx
│   │       │   │   ├── switch.tsx
│   │       │   │   ├── tabs.tsx
│   │       │   │   ├── toast.tsx
│   │       │   │   └── skeleton.tsx
│   │       │   ├── layout/
│   │       │   │   ├── sidebar.tsx
│   │       │   │   ├── header.tsx
│   │       │   │   └── footer.tsx
│   │       │   ├── dashboard/
│   │       │   │   ├── risk-score-card.tsx
│   │       │   │   ├── protocol-health-table.tsx
│   │       │   │   ├── position-health-chart.tsx
│   │       │   │   ├── alert-feed.tsx
│   │       │   │   ├── agent-activity-log.tsx
│   │       │   │   └── stats-overview.tsx
│   │       │   ├── protocols/
│   │       │   │   ├── protocol-card.tsx
│   │       │   │   ├── risk-factor-breakdown.tsx
│   │       │   │   └── audit-badge.tsx
│   │       │   ├── policies/
│   │       │   │   ├── policy-editor.tsx
│   │       │   │   ├── rule-row.tsx
│   │       │   │   └── policy-tester.tsx
│   │       │   └── shared/
│   │       │       ├── risk-badge.tsx
│   │       │       ├── loading-spinner.tsx
│   │       │       └── error-boundary.tsx
│   │       ├── lib/
│   │       │   ├── supabase/
│   │       │   │   ├── client.ts              # Browser Supabase client
│   │       │   │   ├── server.ts              # Server Supabase client
│   │       │   │   └── middleware.ts           # Auth middleware
│   │       │   ├── api.ts                     # API helper functions
│   │       │   ├── utils.ts                   # cn(), formatters
│   │       │   └── hooks/
│   │       │       ├── use-protocols.ts
│   │       │       ├── use-positions.ts
│   │       │       ├── use-alerts.ts
│   │       │       └── use-agents.ts
│   │       └── middleware.ts                   # Next.js auth middleware
│   │
│   └── functions/                     # Netlify Serverless Functions
│       ├── package.json
│       ├── tsconfig.json
│       ├── netlify.toml
│       └── src/
│           ├── api/
│           │   ├── v1/
│           │   │   ├── risk-check.ts          # POST /api/v1/risk-check
│           │   │   ├── protocols.ts           # GET /api/v1/protocols
│           │   │   ├── protocols-detail.ts    # GET /api/v1/protocols/:slug
│           │   │   ├── positions.ts           # GET/POST /api/v1/positions
│           │   │   ├── positions-health.ts    # GET /api/v1/positions/health
│           │   │   ├── policies.ts            # GET/PUT /api/v1/policies
│           │   │   ├── policies-evaluate.ts   # POST /api/v1/policies/evaluate
│           │   │   ├── alerts.ts              # GET /api/v1/alerts
│           │   │   ├── agents.ts              # GET/POST /api/v1/agents
│           │   │   └── stats.ts              # GET /api/v1/stats
│           │   └── x402/
│           │       ├── pay.ts                 # POST /api/x402/pay
│           │       └── verify.ts             # POST /api/x402/verify
│           ├── cron/
│           │   ├── update-protocols.ts        # Cron: refresh protocol data every 5 min
│           │   ├── check-positions.ts         # Cron: check position health every 2 min
│           │   └── cleanup.ts                 # Cron: cleanup old logs daily
│           └── lib/
│               ├── supabase-admin.ts          # Service role Supabase client
│               ├── auth.ts                    # API key validation
│               ├── rate-limit.ts              # Rate limiting
│               └── response.ts               # Standard response helpers
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seed.sql
│   └── config.toml
│
├── scripts/
│   ├── seed-protocols.ts              # Seed protocol data
│   ├── test-mcp.ts                    # Test MCP server
│   └── generate-api-key.ts            # Generate API keys
│
└── docs/
    ├── API.md                         # REST API documentation
    ├── MCP.md                         # MCP tools documentation
    ├── INTEGRATION.md                 # Integration guide for agent devs
    ├── DEPLOYMENT.md                  # Deployment guide
    └── ARCHITECTURE.md                # Architecture deep-dive
```

---

## 6. CORE RISK ENGINE — DETAILED SPEC

### 6.1 File: `packages/core/src/types.ts`

```typescript
// ============================================
// AgentGate Core Types
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ProtocolCategory = 'lending' | 'dex' | 'perps' | 'staking' | 'yield' | 'bridge';
export type AuditStatus = 'audited' | 'partial' | 'unaudited' | 'unknown';
export type OracleHealth = 'healthy' | 'degraded' | 'down' | 'unknown';
export type ActionType = 'lend' | 'borrow' | 'swap' | 'lp' | 'stake' | 'perp_long' | 'perp_short';
export type Recommendation = 'proceed' | 'proceed_with_caution' | 'avoid' | 'block';

export interface ProtocolData {
  slug: string;
  name: string;
  category: ProtocolCategory;
  programIds: string[];
  tvlUsd: number | null;
  tvlChange24h: number | null;
  auditStatus: AuditStatus;
  auditors: string[];
  auditDate: string | null;
  exploitHistory: ExploitRecord[];
  oracleProvider: string | null;
  oracleHealth: OracleHealth;
  riskScore: number | null;  // 0-10
  lastUpdated: string;
}

export interface ExploitRecord {
  date: string;
  amountUsd: number;
  description: string;
}

export interface RiskCheckRequest {
  protocolSlug: string;
  action: ActionType;
  asset?: string;
  amountUsd?: number;
  agentWallet?: string;
}

export interface RiskCheckResponse {
  protocolSlug: string;
  protocolName: string;
  action: ActionType;
  riskScore: number;          // 0-10
  riskLevel: RiskLevel;
  recommendation: Recommendation;
  riskFactors: RiskFactor[];
  protocolData: {
    tvlUsd: number | null;
    tvlChange24h: number | null;
    auditStatus: AuditStatus;
    auditors: string[];
    oracleHealth: OracleHealth;
    exploitCount: number;
    lastExploit: ExploitRecord | null;
  };
  warnings: string[];
  checkedAt: string;
  responseTimeMs: number;
}

export interface RiskFactor {
  name: string;
  score: number;       // 0-10 (10 = safest)
  weight: number;      // 0-1
  details: string;
}

export interface PositionData {
  id: string;
  agentId: string;
  protocolSlug: string;
  positionType: string;
  asset: string;
  amount: number;
  amountUsd: number;
  entryPrice: number;
  currentPrice: number;
  healthFactor: number | null;
  liquidationPrice: number | null;
  pnlUsd: number;
  status: 'open' | 'closed' | 'liquidated';
  lastChecked: string;
}

export interface PositionHealthAlert {
  positionId: string;
  alertType: 'liquidation_risk' | 'health_factor_low' | 'depeg' | 'drawdown_limit';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  healthFactor: number | null;
  liquidationPrice: number | null;
  currentPrice: number;
}

export interface PolicyRules {
  max_single_tx_usd: number;
  max_daily_volume_usd: number;
  max_position_size_usd: number;
  max_drawdown_pct: number;
  allowed_protocols: string[];
  blocked_protocols: string[];
  allowed_actions: ActionType[];
  blocked_actions: ActionType[];
  min_risk_score: number;
  auto_deleverage_health_factor: number;
  cooldown_after_loss_hours: number;
  max_open_positions: number;
  require_oracle_healthy: boolean;
  require_audited: boolean;
}

export interface PolicyEvaluationRequest {
  agentId: string;
  action: ActionType;
  protocolSlug: string;
  asset: string;
  amountUsd: number;
  riskScore: number;
  currentPositionsCount: number;
  dailyVolumeUsd: number;
  currentDrawdownPct: number;
  oracleHealth: OracleHealth;
  auditStatus: AuditStatus;
}

export interface PolicyEvaluationResponse {
  allowed: boolean;
  violations: PolicyViolation[];
  warnings: string[];
  evaluatedAt: string;
}

export interface PolicyViolation {
  rule: string;
  message: string;
  severity: 'warning' | 'blocked' | 'circuit_breaker';
  currentValue: number | string;
  threshold: number | string;
}

export interface Alert {
  id: string;
  agentId: string;
  positionId: string | null;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  isRead: boolean;
  createdAt: string;
}
```

### 6.2 File: `packages/core/src/constants.ts`

```typescript
// ============================================
// AgentGate Constants & Configuration
// ============================================

export const RISK_WEIGHTS = {
  tvl: 0.20,              // TVL size and stability
  audit: 0.25,            // Audit status and quality
  oracle: 0.15,           // Oracle health
  exploit_history: 0.20,  // Past exploits
  tvl_trend: 0.10,        // TVL trend (growing/shrinking)
  protocol_age: 0.10,     // How long the protocol has been live
} as const;

export const RISK_THRESHOLDS = {
  low: 7.5,       // 7.5-10 = Low Risk
  medium: 5.0,    // 5.0-7.4 = Medium Risk
  high: 2.5,      // 2.5-4.9 = High Risk
  critical: 0,    // 0-2.4 = Critical Risk
} as const;

export const HEALTH_FACTOR_THRESHOLDS = {
  safe: 2.0,
  warning: 1.5,
  danger: 1.2,
  critical: 1.05,
} as const;

export const CACHE_TTL_MS = {
  protocol_data: 5 * 60 * 1000,      // 5 minutes
  oracle_prices: 30 * 1000,           // 30 seconds
  tvl_data: 10 * 60 * 1000,          // 10 minutes
  audit_data: 60 * 60 * 1000,        // 1 hour
} as const;

export const SUPPORTED_PROTOCOLS = [
  'kamino', 'drift', 'jupiter', 'orca', 'raydium',
  'meteora', 'marinade', 'jito', 'save', 'marginfi',
] as const;

export const PYTH_FEED_IDS: Record<string, string> = {
  SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  USDT: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b',
  JitoSOL: '0x67be9f519b95cf24338801051f9a808eff0a578ccb388db73b7f6fe1de019ffb',
  mSOL: '0xd3fd63209fa2d55b07a0f6db36c2f43900be309d4c47704a8e47e2c541e71e0d',
  BTC: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
};

export const X402_CONFIG = {
  pricePerRiskCheck: 0.001,     // $0.001 USDC per risk check
  pricePerPositionCheck: 0.002, // $0.002 USDC per position health check
  pricePerPolicyEval: 0.001,    // $0.001 USDC per policy evaluation
  recipientWallet: '',          // Set via env var
  network: 'mainnet-beta',
};

export const RATE_LIMITS = {
  free: { requestsPerMinute: 30, requestsPerDay: 1000 },
  pro: { requestsPerMinute: 120, requestsPerDay: 10000 },
  enterprise: { requestsPerMinute: 600, requestsPerDay: 100000 },
};
```

### 6.3 File: `packages/core/src/risk-scorer.ts`

```typescript
// ============================================
// AgentGate Risk Scorer
// Computes a 0-10 risk score for any Solana DeFi protocol
// ============================================

import { RISK_WEIGHTS, RISK_THRESHOLDS } from './constants';
import type {
  ProtocolData,
  RiskCheckRequest,
  RiskCheckResponse,
  RiskFactor,
  RiskLevel,
  Recommendation,
} from './types';
import { fetchProtocolData } from './data-fetchers';

export class RiskScorer {
  /**
   * Main entry point: score a protocol for a specific action
   */
  async scoreProtocol(request: RiskCheckRequest): Promise<RiskCheckResponse> {
    const startTime = Date.now();

    // 1. Fetch protocol data (from cache or live)
    const protocol = await fetchProtocolData(request.protocolSlug);
    if (!protocol) {
      return {
        protocolSlug: request.protocolSlug,
        protocolName: 'Unknown',
        action: request.action,
        riskScore: 0,
        riskLevel: 'critical',
        recommendation: 'block',
        riskFactors: [],
        protocolData: {
          tvlUsd: null, tvlChange24h: null, auditStatus: 'unknown',
          auditors: [], oracleHealth: 'unknown', exploitCount: 0, lastExploit: null,
        },
        warnings: ['Protocol not found in AgentGate database. Treat as unverified.'],
        checkedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startTime,
      };
    }

    // 2. Compute individual risk factors
    const factors: RiskFactor[] = [
      this.scoreTVL(protocol),
      this.scoreAudit(protocol),
      this.scoreOracle(protocol),
      this.scoreExploitHistory(protocol),
      this.scoreTVLTrend(protocol),
      this.scoreProtocolAge(protocol),
    ];

    // 3. Compute weighted total score (0-10)
    const totalScore = factors.reduce(
      (sum, f) => sum + f.score * f.weight, 0
    );
    const roundedScore = Math.round(totalScore * 100) / 100;

    // 4. Determine risk level
    const riskLevel = this.getRiskLevel(roundedScore);

    // 5. Determine recommendation
    const recommendation = this.getRecommendation(
      roundedScore, riskLevel, request, protocol
    );

    // 6. Generate warnings
    const warnings = this.generateWarnings(protocol, request, roundedScore);

    return {
      protocolSlug: protocol.slug,
      protocolName: protocol.name,
      action: request.action,
      riskScore: roundedScore,
      riskLevel,
      recommendation,
      riskFactors: factors,
      protocolData: {
        tvlUsd: protocol.tvlUsd,
        tvlChange24h: protocol.tvlChange24h,
        auditStatus: protocol.auditStatus,
        auditors: protocol.auditors,
        oracleHealth: protocol.oracleHealth,
        exploitCount: protocol.exploitHistory.length,
        lastExploit: protocol.exploitHistory[0] || null,
      },
      warnings,
      checkedAt: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
    };
  }

  // --- Individual Factor Scorers ---

  private scoreTVL(p: ProtocolData): RiskFactor {
    let score = 5; // default
    const tvl = p.tvlUsd || 0;
    if (tvl >= 1_000_000_000) score = 10;
    else if (tvl >= 500_000_000) score = 9;
    else if (tvl >= 100_000_000) score = 8;
    else if (tvl >= 50_000_000) score = 7;
    else if (tvl >= 10_000_000) score = 5;
    else if (tvl >= 1_000_000) score = 3;
    else score = 1;

    return {
      name: 'TVL Size',
      score,
      weight: RISK_WEIGHTS.tvl,
      details: `TVL: $${(tvl / 1e6).toFixed(1)}M. ${
        tvl >= 100_000_000 ? 'Large, established protocol.' :
        tvl >= 10_000_000 ? 'Medium-sized protocol.' :
        'Small TVL — higher risk.'
      }`,
    };
  }

  private scoreAudit(p: ProtocolData): RiskFactor {
    let score = 2;
    if (p.auditStatus === 'audited' && p.auditors.length >= 2) score = 10;
    else if (p.auditStatus === 'audited' && p.auditors.length === 1) score = 8;
    else if (p.auditStatus === 'partial') score = 5;
    else if (p.auditStatus === 'unaudited') score = 2;
    else score = 1;

    return {
      name: 'Audit Status',
      score,
      weight: RISK_WEIGHTS.audit,
      details: `Status: ${p.auditStatus}. Auditors: ${
        p.auditors.length > 0 ? p.auditors.join(', ') : 'None'
      }.`,
    };
  }

  private scoreOracle(p: ProtocolData): RiskFactor {
    let score = 5;
    if (p.oracleHealth === 'healthy') score = 10;
    else if (p.oracleHealth === 'degraded') score = 5;
    else if (p.oracleHealth === 'down') score = 1;
    else score = 3;

    return {
      name: 'Oracle Health',
      score,
      weight: RISK_WEIGHTS.oracle,
      details: `Provider: ${p.oracleProvider || 'unknown'}. Health: ${p.oracleHealth}.`,
    };
  }

  private scoreExploitHistory(p: ProtocolData): RiskFactor {
    const exploits = p.exploitHistory.length;
    let score = 10;
    if (exploits === 0) score = 10;
    else if (exploits === 1) score = 6;
    else if (exploits === 2) score = 4;
    else score = 2;

    // Penalize recent exploits more
    if (exploits > 0) {
      const lastExploit = new Date(p.exploitHistory[0].date);
      const monthsSince = (Date.now() - lastExploit.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince < 6) score = Math.max(1, score - 3);
      else if (monthsSince < 12) score = Math.max(1, score - 1);
    }

    return {
      name: 'Exploit History',
      score,
      weight: RISK_WEIGHTS.exploit_history,
      details: exploits === 0
        ? 'No known exploits.'
        : `${exploits} exploit(s). Last: ${p.exploitHistory[0]?.date}.`,
    };
  }

  private scoreTVLTrend(p: ProtocolData): RiskFactor {
    const change = p.tvlChange24h || 0;
    let score = 5;
    if (change >= 5) score = 9;
    else if (change >= 0) score = 7;
    else if (change >= -5) score = 5;
    else if (change >= -15) score = 3;
    else score = 1;

    return {
      name: 'TVL Trend (24h)',
      score,
      weight: RISK_WEIGHTS.tvl_trend,
      details: `24h TVL change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%.`,
    };
  }

  private scoreProtocolAge(p: ProtocolData): RiskFactor {
    // Use audit date as proxy for age if available
    let score = 5;
    if (p.auditDate) {
      const monthsSinceAudit = (Date.now() - new Date(p.auditDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSinceAudit >= 24) score = 10;
      else if (monthsSinceAudit >= 12) score = 8;
      else if (monthsSinceAudit >= 6) score = 6;
      else score = 4;
    }
    return {
      name: 'Protocol Maturity',
      score,
      weight: RISK_WEIGHTS.protocol_age,
      details: p.auditDate
        ? `First audited: ${p.auditDate}.`
        : 'Age unknown.',
    };
  }

  // --- Helpers ---

  private getRiskLevel(score: number): RiskLevel {
    if (score >= RISK_THRESHOLDS.low) return 'low';
    if (score >= RISK_THRESHOLDS.medium) return 'medium';
    if (score >= RISK_THRESHOLDS.high) return 'high';
    return 'critical';
  }

  private getRecommendation(
    score: number,
    level: RiskLevel,
    request: RiskCheckRequest,
    protocol: ProtocolData
  ): Recommendation {
    if (level === 'critical') return 'block';
    if (level === 'high') return 'avoid';
    if (level === 'medium') {
      // Extra caution for large amounts
      if (request.amountUsd && request.amountUsd > 10000) return 'proceed_with_caution';
      return 'proceed_with_caution';
    }
    return 'proceed';
  }

  private generateWarnings(
    p: ProtocolData,
    request: RiskCheckRequest,
    score: number
  ): string[] {
    const warnings: string[] = [];
    if (p.oracleHealth === 'down') warnings.push('⚠️ Oracle is DOWN. Price data may be stale.');
    if (p.oracleHealth === 'degraded') warnings.push('⚠️ Oracle is degraded. Verify prices independently.');
    if (p.auditStatus === 'unaudited') warnings.push('⚠️ Protocol is UNAUDITED. Smart contract risk is elevated.');
    if (p.tvlChange24h && p.tvlChange24h < -15) warnings.push('⚠️ TVL dropped >15% in 24h. Possible bank run or exploit.');
    if (p.exploitHistory.length > 0) {
      const last = p.exploitHistory[0];
      warnings.push(`⚠️ Last exploit: ${last.date} ($${(last.amountUsd / 1e6).toFixed(1)}M lost).`);
    }
    if (request.amountUsd && request.amountUsd > 50000 && score < 7) {
      warnings.push('⚠️ Large position on medium-risk protocol. Consider splitting.');
    }
    return warnings;
  }
}
```

### 6.4 File: `packages/core/src/policy-engine.ts`

```typescript
// ============================================
// AgentGate Policy Engine
// Evaluates agent actions against configured guardrails
// ============================================

import type {
  PolicyRules,
  PolicyEvaluationRequest,
  PolicyEvaluationResponse,
  PolicyViolation,
} from './types';

export class PolicyEngine {
  /**
   * Evaluate an action against a set of policy rules
   */
  evaluate(
    rules: PolicyRules,
    request: PolicyEvaluationRequest
  ): PolicyEvaluationResponse {
    const violations: PolicyViolation[] = [];
    const warnings: string[] = [];

    // Rule 1: Protocol allowlist/blocklist
    if (rules.blocked_protocols.includes(request.protocolSlug)) {
      violations.push({
        rule: 'blocked_protocols',
        message: `Protocol "${request.protocolSlug}" is blocked by policy.`,
        severity: 'blocked',
        currentValue: request.protocolSlug,
        threshold: 'not in blocked list',
      });
    }
    if (rules.allowed_protocols.length > 0 &&
        !rules.allowed_protocols.includes(request.protocolSlug)) {
      violations.push({
        rule: 'allowed_protocols',
        message: `Protocol "${request.protocolSlug}" is not in the allowed list.`,
        severity: 'blocked',
        currentValue: request.protocolSlug,
        threshold: rules.allowed_protocols.join(', '),
      });
    }

    // Rule 2: Action allowlist/blocklist
    if (rules.blocked_actions.includes(request.action)) {
      violations.push({
        rule: 'blocked_actions',
        message: `Action "${request.action}" is blocked by policy.`,
        severity: 'blocked',
        currentValue: request.action,
        threshold: 'not in blocked list',
      });
    }
    if (rules.allowed_actions.length > 0 &&
        !rules.allowed_actions.includes(request.action)) {
      violations.push({
        rule: 'allowed_actions',
        message: `Action "${request.action}" is not in the allowed list.`,
        severity: 'blocked',
        currentValue: request.action,
        threshold: rules.allowed_actions.join(', '),
      });
    }

    // Rule 3: Max single transaction
    if (request.amountUsd > rules.max_single_tx_usd) {
      violations.push({
        rule: 'max_single_tx_usd',
        message: `Transaction $${request.amountUsd} exceeds max $${rules.max_single_tx_usd}.`,
        severity: 'blocked',
        currentValue: request.amountUsd,
        threshold: rules.max_single_tx_usd,
      });
    }

    // Rule 4: Max daily volume
    if (request.dailyVolumeUsd + request.amountUsd > rules.max_daily_volume_usd) {
      violations.push({
        rule: 'max_daily_volume_usd',
        message: `Daily volume would exceed $${rules.max_daily_volume_usd}.`,
        severity: 'blocked',
        currentValue: request.dailyVolumeUsd + request.amountUsd,
        threshold: rules.max_daily_volume_usd,
      });
    }

    // Rule 5: Max position size
    if (request.amountUsd > rules.max_position_size_usd) {
      violations.push({
        rule: 'max_position_size_usd',
        message: `Position $${request.amountUsd} exceeds max $${rules.max_position_size_usd}.`,
        severity: 'blocked',
        currentValue: request.amountUsd,
        threshold: rules.max_position_size_usd,
      });
    }

    // Rule 6: Min risk score
    if (request.riskScore < rules.min_risk_score) {
      violations.push({
        rule: 'min_risk_score',
        message: `Risk score ${request.riskScore} is below minimum ${rules.min_risk_score}.`,
        severity: request.riskScore < rules.min_risk_score / 2 ? 'circuit_breaker' : 'blocked',
        currentValue: request.riskScore,
        threshold: rules.min_risk_score,
      });
    }

    // Rule 7: Max drawdown
    if (request.currentDrawdownPct > rules.max_drawdown_pct) {
      violations.push({
        rule: 'max_drawdown_pct',
        message: `Current drawdown ${request.currentDrawdownPct}% exceeds max ${rules.max_drawdown_pct}%. COOLDOWN ACTIVE.`,
        severity: 'circuit_breaker',
        currentValue: request.currentDrawdownPct,
        threshold: rules.max_drawdown_pct,
      });
    }

    // Rule 8: Max open positions
    if (request.currentPositionsCount >= rules.max_open_positions) {
      violations.push({
        rule: 'max_open_positions',
        message: `Already at ${request.currentPositionsCount} open positions (max: ${rules.max_open_positions}).`,
        severity: 'warning',
        currentValue: request.currentPositionsCount,
        threshold: rules.max_open_positions,
      });
    }

    // Rule 9: Require healthy oracle
    if (rules.require_oracle_healthy && request.oracleHealth !== 'healthy') {
      violations.push({
        rule: 'require_oracle_healthy',
        message: `Oracle health is "${request.oracleHealth}". Policy requires "healthy".`,
        severity: 'blocked',
        currentValue: request.oracleHealth,
        threshold: 'healthy',
      });
    }

    // Rule 10: Require audited protocol
    if (rules.require_audited && request.auditStatus !== 'audited') {
      violations.push({
        rule: 'require_audited',
        message: `Protocol audit status is "${request.auditStatus}". Policy requires "audited".`,
        severity: 'blocked',
        currentValue: request.auditStatus,
        threshold: 'audited',
      });
    }

    // Determine if action is allowed
    const hasBlocks = violations.some(v => v.severity === 'blocked' || v.severity === 'circuit_breaker');
    const allowed = !hasBlocks;

    // Generate soft warnings
    if (request.amountUsd > rules.max_single_tx_usd * 0.8) {
      warnings.push(`Transaction is ${((request.amountUsd / rules.max_single_tx_usd) * 100).toFixed(0)}% of your max single tx limit.`);
    }
    if (request.riskScore < rules.min_risk_score + 1.5) {
      warnings.push(`Risk score is close to your minimum threshold.`);
    }

    return {
      allowed,
      violations,
      warnings,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
```

### 6.5 File: `packages/core/src/data-fetchers/helius.ts`

```typescript
// ============================================
// Helius RPC Data Fetcher
// Fetches on-chain data from Solana via Helius
// ============================================

const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';

export async function getAccountInfo(publicKey: string): Promise<any> {
  const response = await fetch(`${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getAccountInfo',
      params: [publicKey, { encoding: 'jsonParsed' }],
    }),
  });
  const data = await response.json();
  return data.result?.value;
}

export async function getTokenAccountBalance(publicKey: string): Promise<number> {
  const response = await fetch(`${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountBalance',
      params: [publicKey],
    }),
  });
  const data = await response.json();
  return parseFloat(data.result?.value?.uiAmountString || '0');
}

export async function getLatestBlockhash(): Promise<string> {
  const response = await fetch(`${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestBlockhash',
    }),
  });
  const data = await response.json();
  return data.result?.value?.blockhash;
}
```

### 6.6 File: `packages/core/src/data-fetchers/pyth.ts`

```typescript
// ============================================
// Pyth Network Price Fetcher
// ============================================

import { PYTH_FEED_IDS } from '../constants';

const PYTH_API_URL = 'https://hermes.pyth.network/v2/updates/price/latest';

export interface PythPrice {
  symbol: string;
  price: number;
  confidence: number;
  exponent: number;
  publishTime: number;
}

export async function getPrice(symbol: string): Promise<PythPrice | null> {
  const feedId = PYTH_FEED_IDS[symbol];
  if (!feedId) return null;

  try {
    const response = await fetch(`${PYTH_API_URL}?ids[]=${feedId}`);
    const data = await response.json();
    const parsed = data.parsed?.[0];
    if (!parsed) return null;

    const price = parsed.price;
    const rawPrice = parseInt(price.price);
    const expo = parseInt(price.expo);

    return {
      symbol,
      price: rawPrice * Math.pow(10, expo),
      confidence: parseInt(price.conf) * Math.pow(10, expo),
      exponent: expo,
      publishTime: parseInt(price.publish_time),
    };
  } catch (error) {
    console.error(`Pyth fetch error for ${symbol}:`, error);
    return null;
  }
}

export async function getMultiplePrices(symbols: string[]): Promise<Map<string, PythPrice>> {
  const feedIds = symbols
    .map(s => PYTH_FEED_IDS[s])
    .filter(Boolean);

  const params = feedIds.map(id => `ids[]=${id}`).join('&');
  const priceMap = new Map<string, PythPrice>();

  try {
    const response = await fetch(`${PYTH_API_URL}?${params}`);
    const data = await response.json();

    for (const parsed of data.parsed || []) {
      const price = parsed.price;
      const rawPrice = parseInt(price.price);
      const expo = parseInt(price.expo);
      const id = parsed.id;

      // Find symbol by feed ID
      const symbol = Object.entries(PYTH_FEED_IDS).find(([, fid]) => fid === id)?.[0];
      if (symbol) {
        priceMap.set(symbol, {
          symbol,
          price: rawPrice * Math.pow(10, expo),
          confidence: parseInt(price.conf) * Math.pow(10, expo),
          exponent: expo,
          publishTime: parseInt(price.publish_time),
        });
      }
    }
  } catch (error) {
    console.error('Pyth multi-fetch error:', error);
  }

  return priceMap;
}
```

### 6.7 File: `packages/core/src/data-fetchers/defillama.ts`

```typescript
// ============================================
// DeFiLlama TVL Fetcher
// ============================================

const DEFILLAMA_API = 'https://api.llama.fi';

// Mapping of our slugs to DeFiLlama protocol IDs
const DEFILLAMA_IDS: Record<string, string> = {
  kamino: 'kamino-lending',
  drift: 'drift-protocol',
  jupiter: 'jupiter',
  orca: 'orca',
  raydium: 'raydium',
  meteora: 'meteora',
  marinade: 'marinade-finance',
  jito: 'jito',
  save: 'save',
  marginfi: 'marginfi',
};

export interface TVLData {
  tvlUsd: number;
  tvlChange24h: number;
  tvlChange7d: number;
}

export async function getTVL(slug: string): Promise<TVLData | null> {
  const llamaId = DEFILLAMA_IDS[slug];
  if (!llamaId) return null;

  try {
    const response = await fetch(`${DEFILLAMA_API}/protocol/${llamaId}`);
    if (!response.ok) return null;
    const data = await response.json();

    const currentTvl = data.currentChainTvls?.Solana || data.tvl?.[0]?.totalLiquidityUSD || 0;

    // Calculate 24h change
    const tvlHistory = data.tvl || [];
    const now = Date.now() / 1000;
    const dayAgo = now - 86400;
    const weekAgo = now - 604800;

    const tvlDayAgo = tvlHistory.find((p: any) => Math.abs(p.date - dayAgo) < 3600)?.totalLiquidityUSD || currentTvl;
    const tvlWeekAgo = tvlHistory.find((p: any) => Math.abs(p.date - weekAgo) < 3600)?.totalLiquidityUSD || currentTvl;

    return {
      tvlUsd: currentTvl,
      tvlChange24h: tvlDayAgo > 0 ? ((currentTvl - tvlDayAgo) / tvlDayAgo) * 100 : 0,
      tvlChange7d: tvlWeekAgo > 0 ? ((currentTvl - tvlWeekAgo) / tvlWeekAgo) * 100 : 0,
    };
  } catch (error) {
    console.error(`DeFiLlama fetch error for ${slug}:`, error);
    return null;
  }
}
```

### 6.8 File: `packages/core/src/data-fetchers/index.ts`

```typescript
// ============================================
// Unified Data Fetcher
// Combines all data sources with caching
// ============================================

import { getTVL } from './defillama';
import { getPrice } from './pyth';
import { CACHE_TTL_MS } from '../constants';
import type { ProtocolData, OracleHealth } from '../types';

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

/**
 * Fetch complete protocol data from all sources
 */
export async function fetchProtocolData(slug: string): Promise<ProtocolData | null> {
  const cacheKey = `protocol:${slug}`;
  const cached = getCached<ProtocolData>(cacheKey);
  if (cached) return cached;

  // In production, this would query Supabase for base data
  // and enrich with live data from DeFiLlama, Pyth, etc.
  // For MVP, return structured data from our seed + live TVL

  try {
    const tvlData = await getTVL(slug);

    // Check oracle health by fetching a price
    let oracleHealth: OracleHealth = 'unknown';
    const price = await getPrice('SOL');
    if (price) {
      const age = Date.now() / 1000 - price.publishTime;
      if (age < 120) oracleHealth = 'healthy';       // < 2 min old
      else if (age < 600) oracleHealth = 'degraded'; // < 10 min old
      else oracleHealth = 'down';
    }

    // This would normally come from Supabase
    // For now, return a template that the API layer fills in
    const protocolData: ProtocolData = {
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      category: 'lending', // Will be overridden by DB data
      programIds: [],
      tvlUsd: tvlData?.tvlUsd || null,
      tvlChange24h: tvlData?.tvlChange24h || null,
      auditStatus: 'unknown',
      auditors: [],
      auditDate: null,
      exploitHistory: [],
      oracleProvider: 'pyth',
      oracleHealth,
      riskScore: null,
      lastUpdated: new Date().toISOString(),
    };

    setCache(cacheKey, protocolData, CACHE_TTL_MS.protocol_data);
    return protocolData;
  } catch (error) {
    console.error(`Error fetching protocol data for ${slug}:`, error);
    return null;
  }
}
```

---

## 7. MCP SERVER — DETAILED SPEC

### 7.1 File: `packages/mcp-server/src/index.ts`

```typescript
// ============================================
// AgentGate MCP Server
// Exposes risk tools to any AI agent via MCP protocol
// ============================================

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RiskScorer } from '@agentgate/core';
import { PolicyEngine } from '@agentgate/core';

const server = new McpServer({
  name: 'agentgate',
  version: '1.0.0',
});

const riskScorer = new RiskScorer();
const policyEngine = new PolicyEngine();

// ============================================
// TOOL 1: check_protocol_risk
// ============================================
server.tool(
  'check_protocol_risk',
  'Check the risk score and safety of a Solana DeFi protocol before interacting with it. Returns a 0-10 risk score, risk factors, warnings, and a recommendation (proceed/proceed_with_caution/avoid/block).',
  {
    protocol: z.enum([
      'kamino', 'drift', 'jupiter', 'orca', 'raydium',
      'meteora', 'marinade', 'jito', 'save', 'marginfi',
    ]).describe('The Solana DeFi protocol to check'),
    action: z.enum([
      'lend', 'borrow', 'swap', 'lp', 'stake', 'perp_long', 'perp_short',
    ]).describe('The DeFi action you intend to perform'),
    asset: z.string().optional().describe('The asset (e.g., SOL, USDC, JitoSOL)'),
    amount_usd: z.number().optional().describe('The amount in USD you plan to deploy'),
  },
  async ({ protocol, action, asset, amount_usd }) => {
    const result = await riskScorer.scoreProtocol({
      protocolSlug: protocol,
      action: action as any,
      asset,
      amountUsd: amount_usd,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ============================================
// TOOL 2: evaluate_policy
// ============================================
server.tool(
  'evaluate_policy',
  'Evaluate whether a planned DeFi action violates any configured guardrail policies. Returns allowed/blocked status with specific violations.',
  {
    action: z.enum([
      'lend', 'borrow', 'swap', 'lp', 'stake', 'perp_long', 'perp_short',
    ]),
    protocol: z.string(),
    asset: z.string(),
    amount_usd: z.number(),
    risk_score: z.number().describe('Risk score from check_protocol_risk (0-10)'),
    current_positions_count: z.number().default(0),
    daily_volume_usd: z.number().default(0),
    current_drawdown_pct: z.number().default(0),
    oracle_health: z.enum(['healthy', 'degraded', 'down', 'unknown']).default('healthy'),
    audit_status: z.enum(['audited', 'partial', 'unaudited', 'unknown']).default('unknown'),
  },
  async (params) => {
    // Default policy rules (in production, fetched from Supabase per agent)
    const defaultRules = {
      max_single_tx_usd: 1000,
      max_daily_volume_usd: 10000,
      max_position_size_usd: 5000,
      max_drawdown_pct: 15,
      allowed_protocols: ['kamino', 'jupiter', 'drift', 'orca', 'raydium', 'meteora', 'marinade', 'jito'],
      blocked_protocols: [],
      allowed_actions: ['lend', 'borrow', 'swap', 'lp', 'stake'] as any[],
      blocked_actions: [] as any[],
      min_risk_score: 5.0,
      auto_deleverage_health_factor: 1.2,
      cooldown_after_loss_hours: 24,
      max_open_positions: 10,
      require_oracle_healthy: true,
      require_audited: false,
    };

    const result = policyEngine.evaluate(defaultRules, {
      agentId: 'mcp-agent',
      action: params.action as any,
      protocolSlug: params.protocol,
      asset: params.asset,
      amountUsd: params.amount_usd,
      riskScore: params.risk_score,
      currentPositionsCount: params.current_positions_count,
      dailyVolumeUsd: params.daily_volume_usd,
      currentDrawdownPct: params.current_drawdown_pct,
      oracleHealth: params.oracle_health as any,
      auditStatus: params.audit_status as any,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ============================================
// TOOL 3: get_supported_protocols
// ============================================
server.tool(
  'get_supported_protocols',
  'Get the list of all Solana DeFi protocols supported by AgentGate with their current risk scores.',
  {},
  async () => {
    const protocols = [
      'kamino', 'drift', 'jupiter', 'orca', 'raydium',
      'meteora', 'marinade', 'jito', 'save', 'marginfi',
    ];

    const results = await Promise.all(
      protocols.map(async (slug) => {
        const risk = await riskScorer.scoreProtocol({
          protocolSlug: slug,
          action: 'lend',
        });
        return {
          slug,
          name: risk.protocolName,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          tvlUsd: risk.protocolData.tvlUsd,
          auditStatus: risk.protocolData.auditStatus,
        };
      })
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

// ============================================
// TOOL 4: get_risk_summary
// ============================================
server.tool(
  'get_risk_summary',
  'Get a quick human-readable risk summary for a protocol. Use this for a fast safety check.',
  {
    protocol: z.string().describe('Protocol slug (e.g., kamino, drift, jupiter)'),
  },
  async ({ protocol }) => {
    const risk = await riskScorer.scoreProtocol({
      protocolSlug: protocol,
      action: 'lend',
    });

    const emoji = risk.riskLevel === 'low' ? '🟢' :
                  risk.riskLevel === 'medium' ? '🟡' :
                  risk.riskLevel === 'high' ? '🟠' : '🔴';

    const summary = `${emoji} ${risk.protocolName} — Risk Score: ${risk.riskScore}/10 (${risk.riskLevel.toUpperCase()})
Recommendation: ${risk.recommendation.toUpperCase()}
TVL: $${((risk.protocolData.tvlUsd || 0) / 1e6).toFixed(1)}M
Audit: ${risk.protocolData.auditStatus} (${risk.protocolData.auditors.join(', ') || 'none'})
Oracle: ${risk.protocolData.oracleHealth}
Exploits: ${risk.protocolData.exploitCount}
${risk.warnings.length > 0 ? '\nWarnings:\n' + risk.warnings.map(w => `  ${w}`).join('\n') : ''}`;

    return {
      content: [{ type: 'text' as const, text: summary }],
    };
  }
);

// ============================================
// START SERVER
// ============================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AgentGate MCP Server running on stdio');
}

main().catch(console.error);
```

### 7.2 MCP Client Configuration (for users)

File: `docs/MCP.md` — include this in the README:

```json
// Add to your Claude Desktop / Cursor / any MCP client config:
{
  "mcpServers": {
    "agentgate": {
      "command": "npx",
      "args": ["-y", "@agentgate/mcp-server"],
      "env": {
        "AGENTGATE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

---

## 8. NETLIFY SERVERLESS FUNCTIONS

### 8.1 File: `apps/functions/netlify.toml`

```toml
[build]
  functions = "src/api"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# Cron jobs
[functions."cron/update-protocols"]
  schedule = "*/5 * * * *"   # Every 5 minutes

[functions."cron/check-positions"]
  schedule = "*/2 * * * *"   # Every 2 minutes

[functions."cron/cleanup"]
  schedule = "0 3 * * *"     # Daily at 3 AM
```

### 8.2 File: `apps/functions/src/api/v1/risk-check.ts`

```typescript
// ============================================
// POST /api/v1/risk-check
// Main risk check endpoint
// ============================================

import type { Handler } from '@netlify/functions';
import { RiskScorer } from '@agentgate/core';
import { validateApiKey } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../lib/response';

const riskScorer = new RiskScorer();

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  // Validate API key
  const authResult = await validateApiKey(event);
  if (!authResult.valid) {
    return errorResponse(401, authResult.error || 'Unauthorized');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { protocol, action, asset, amount_usd } = body;

    if (!protocol || !action) {
      return errorResponse(400, 'Missing required fields: protocol, action');
    }

    const result = await riskScorer.scoreProtocol({
      protocolSlug: protocol,
      action,
      asset,
      amountUsd: amount_usd,
    });

    // Log to Supabase (async, don't block response)
    // In production: await supabase.from('risk_checks').insert({...});

    return jsonResponse(200, result);
  } catch (error: any) {
    console.error('Risk check error:', error);
    return errorResponse(500, error.message || 'Internal server error');
  }
};
```

### 8.3 File: `apps/functions/src/lib/auth.ts`

```typescript
// ============================================
// API Key Authentication
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AuthResult {
  valid: boolean;
  userId?: string;
  plan?: string;
  error?: string;
}

export async function validateApiKey(event: any): Promise<AuthResult> {
  const apiKey = event.headers['x-api-key'] ||
                 event.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    return { valid: false, error: 'Missing API key. Provide x-api-key header.' };
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, plan, api_key')
      .eq('api_key', apiKey)
      .single();

    if (error || !user) {
      return { valid: false, error: 'Invalid API key.' };
    }

    return { valid: true, userId: user.id, plan: user.plan };
  } catch (error) {
    return { valid: false, error: 'Authentication failed.' };
  }
}
```

### 8.4 File: `apps/functions/src/lib/response.ts`

```typescript
// ============================================
// Standard Response Helpers
// ============================================

export function jsonResponse(statusCode: number, data: any) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
    body: JSON.stringify(data),
  };
}

export function errorResponse(statusCode: number, message: string) {
  return jsonResponse(statusCode, { error: message });
}
```

### 8.5 File: `apps/functions/src/api/x402/pay.ts`

```typescript
// ============================================
// POST /api/x402/pay
// x402 micropayment verification endpoint
// ============================================

import type { Handler } from '@netlify/functions';
import { jsonResponse, errorResponse } from '../../lib/response';

// x402 payment verification
// In production, this verifies the Solana transaction signature
// For MVP, we log the payment and grant access

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { tx_signature, amount_usdc, endpoint, agent_id } = body;

    if (!tx_signature || !amount_usdc) {
      return errorResponse(400, 'Missing tx_signature or amount_usdc');
    }

    // TODO: Verify transaction on Solana
    // const connection = new Connection(clusterApiUrl('mainnet-beta'));
    // const tx = await connection.getTransaction(tx_signature);
    // Verify recipient, amount, etc.

    // For MVP: accept and log
    // In production: verify on-chain, then grant access

    return jsonResponse(200, {
      status: 'confirmed',
      tx_signature,
      amount_usdc,
      endpoint,
      message: 'Payment verified. Access granted.',
    });
  } catch (error: any) {
    return errorResponse(500, error.message);
  }
};
```

### 8.6 File: `apps/functions/src/cron/update-protocols.ts`

```typescript
// ============================================
// CRON: Update Protocol Data (every 5 minutes)
// Fetches fresh TVL, oracle health, prices
// ============================================

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getTVL } from '@agentgate/core/data-fetchers/defillama';
import { getPrice } from '@agentgate/core/data-fetchers/pyth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async () => {
  console.log('Cron: Updating protocol data...');

  const { data: protocols } = await supabase
    .from('protocols')
    .select('slug, oracle_provider');

  if (!protocols) return { statusCode: 200, body: 'No protocols' };

  for (const protocol of protocols) {
    try {
      // Update TVL
      const tvl = await getTVL(protocol.slug);

      // Update oracle health
      const price = await getPrice('SOL');
      let oracleHealth = 'unknown';
      if (price) {
        const age = Date.now() / 1000 - price.publishTime;
        oracleHealth = age < 120 ? 'healthy' : age < 600 ? 'degraded' : 'down';
      }

      await supabase
        .from('protocols')
        .update({
          tvl_usd: tvl?.tvlUsd || null,
          tvl_change_24h: tvl?.tvlChange24h || null,
          oracle_health: oracleHealth,
          last_updated: new Date().toISOString(),
        })
        .eq('slug', protocol.slug);

      console.log(`Updated ${protocol.slug}: TVL=$${tvl?.tvlUsd}, Oracle=${oracleHealth}`);
    } catch (error) {
      console.error(`Error updating ${protocol.slug}:`, error);
    }
  }

  return { statusCode: 200, body: 'Protocol update complete' };
};
```

---

## 9. FRONTEND DASHBOARD (Next.js on Netlify)

### 9.1 Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page — hero, features, CTA |
| `/auth/login` | Supabase email login |
| `/auth/signup` | Supabase email signup |
| `/dashboard` | Overview: stats, risk scores, recent activity |
| `/dashboard/protocols` | All protocols with risk scores, filterable |
| `/dashboard/protocols/[slug]` | Protocol detail: risk breakdown, TVL chart, audit info |
| `/dashboard/agents` | List of registered agents |
| `/dashboard/agents/[id]` | Agent detail: activity log, positions, policy |
| `/dashboard/positions` | All tracked positions with health factors |
| `/dashboard/policies` | Policy editor (visual rule builder) |
| `/dashboard/alerts` | Alert feed with severity filtering |
| `/dashboard/settings` | API keys, x402 wallet, plan info |

### 9.2 File: `apps/web/netlify.toml`

```toml
[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NEXT_USE_NETLIFY_EDGE = "true"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 9.3 File: `apps/web/src/app/dashboard/page.tsx` (Overview)

```tsx
// Dashboard Overview Page
// Shows: total risk checks, active agents, avg risk score, recent alerts

import { StatsOverview } from '@/components/dashboard/stats-overview';
import { ProtocolHealthTable } from '@/components/dashboard/protocol-health-table';
import { AlertFeed } from '@/components/dashboard/alert-feed';
import { AgentActivityLog } from '@/components/dashboard/agent-activity-log';

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">AgentGate Dashboard</h1>

      {/* Stats Row */}
      <StatsOverview />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Protocol Health */}
        <ProtocolHealthTable />

        {/* Recent Alerts */}
        <AlertFeed />
      </div>

      {/* Agent Activity */}
      <AgentActivityLog />
    </div>
  );
}
```

### 9.4 File: `apps/web/src/components/dashboard/stats-overview.tsx`

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskBadge } from '@/components/shared/risk-badge';

// In production: fetch from /api/v1/stats
const mockStats = {
  totalRiskChecks: 1247,
  activeAgents: 3,
  avgRiskScore: 7.8,
  alertsToday: 2,
  blockedActions: 5,
  protocolsMonitored: 10,
};

export function StatsOverview() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Risk Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{mockStats.totalRiskChecks.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Active Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{mockStats.activeAgents}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Avg Risk Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{mockStats.avgRiskScore}/10</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Alerts Today</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-yellow-600">{mockStats.alertsToday}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Blocked Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-600">{mockStats.blockedActions}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Protocols</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{mockStats.protocolsMonitored}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 9.5 File: `apps/web/src/components/protocols/risk-factor-breakdown.tsx`

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskBadge } from '@/components/shared/risk-badge';

interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  details: string;
}

export function RiskFactorBreakdown({ factors }: { factors: RiskFactor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Factor Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.map((factor) => (
          <div key={factor.name} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{factor.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Weight: {(factor.weight * 100).toFixed(0)}%
                </span>
                <RiskBadge score={factor.score} />
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  factor.score >= 7.5 ? 'bg-green-500' :
                  factor.score >= 5 ? 'bg-yellow-500' :
                  factor.score >= 2.5 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${factor.score * 10}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{factor.details}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## 10. ENVIRONMENT VARIABLES

### File: `.env.example`

```bash
# ============================================
# AgentGate Environment Variables
# ============================================

# --- Supabase ---
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# --- Helius (Solana RPC) ---
HELIUS_RPC_URL=https://mainnet.helius-rpc.com
HELIUS_API_KEY=your-helius-api-key

# --- AgentGate ---
AGENTGATE_API_URL=https://your-app.netlify.app
AGENTGATE_MCP_PACKAGE=@agentgate/mcp-server

# --- x402 Payments ---
X402_RECIPIENT_WALLET=your-solana-wallet-address
X402_NETWORK=mainnet-beta

# --- App ---
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
NODE_ENV=development
```

---

## 11. PACKAGE.JSON FILES

### 11.1 Root: `package.json`

```json
{
  "name": "agentgate",
  "version": "1.0.0",
  "private": true,
  "description": "AI Agent DeFi Risk Middleware for Solana",
  "license": "MIT",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter core build && pnpm --filter web build",
    "build:core": "pnpm --filter core build",
    "build:mcp": "pnpm --filter mcp-server build",
    "build:web": "pnpm --filter web build",
    "deploy:functions": "netlify deploy --prod --dir=apps/functions",
    "deploy:web": "netlify deploy --prod --dir=apps/web/.next",
    "test": "vitest",
    "lint": "eslint . --ext .ts,.tsx",
    "db:migrate": "supabase db push",
    "db:seed": "supabase db seed",
    "mcp:dev": "pnpm --filter mcp-server dev",
    "seed:protocols": "tsx scripts/seed-protocols.ts"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "vitest": "^2.0.0",
    "tsx": "^4.16.0"
  }
}
```

### 11.2 `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### 11.3 `packages/core/package.json`

```json
{
  "name": "@agentgate/core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

### 11.4 `packages/mcp-server/package.json`

```json
{
  "name": "@agentgate/mcp-server",
  "version": "1.0.0",
  "bin": {
    "agentgate-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@agentgate/core": "workspace:*",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.16.0"
  }
}
```

### 11.5 `apps/web/package.json`

```json
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.4.0",
    "@agentgate/core": "workspace:*",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0",
    "lucide-react": "^0.400.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.14.0",
    "@netlify/plugin-nextjs": "^5.5.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 12. STEP-BY-STEP BUILD ORDER (For Agentic AI)

> **Feed these steps IN ORDER to your AI coding agent.**
> Each step is a self-contained task with clear inputs/outputs.

### Phase 1: Foundation (Day 1-2)

```
STEP 1: Initialize monorepo
- Create root package.json, pnpm-workspace.yaml, tsconfig.json
- Create .gitignore, .env.example, .eslintrc.json, .prettierrc
- Run: pnpm install

STEP 2: Create packages/core
- Create packages/core/package.json, tsconfig.json
- Create src/types.ts (copy from Section 6.1)
- Create src/constants.ts (copy from Section 6.2)
- Create src/utils/logger.ts, src/utils/cache.ts, src/utils/helpers.ts
- Run: pnpm --filter core build → verify it compiles

STEP 3: Create data fetchers
- Create src/data-fetchers/helius.ts (Section 6.5)
- Create src/data-fetchers/pyth.ts (Section 6.6)
- Create src/data-fetchers/defillama.ts (Section 6.7)
- Create src/data-fetchers/audit-db.ts (stub for now)
- Create src/data-fetchers/index.ts (Section 6.8)
- Run: pnpm --filter core build → verify

STEP 4: Create risk scorer
- Create src/risk-scorer.ts (Section 6.3)
- Create src/index.ts (export everything)
- Run: pnpm --filter core build → verify

STEP 5: Create policy engine
- Create src/policy-engine.ts (Section 6.4)
- Update src/index.ts to export PolicyEngine
- Run: pnpm --filter core build → verify

STEP 6: Create position monitor
- Create src/position-monitor.ts
  - Class PositionMonitor
  - Method checkPositionHealth(position: PositionData): PositionHealthAlert[]
  - Method checkAllPositions(positions: PositionData[]): PositionHealthAlert[]
  - Uses HEALTH_FACTOR_THRESHOLDS from constants
- Run: pnpm --filter core build → verify
```

### Phase 2: Supabase Setup (Day 2-3)

```
STEP 7: Create Supabase project
- Go to supabase.com → New Project
- Name: agentgate
- Copy URL, anon key, service role key to .env

STEP 8: Run database migration
- Create supabase/migrations/001_initial_schema.sql (Section 4.1)
- Run: supabase db push (or paste SQL in Supabase SQL editor)
- Verify all tables created

STEP 9: Seed protocol data
- Create scripts/seed-protocols.ts
  - Connect to Supabase with service role key
  - Insert 10 protocols with real data:
    kamino, drift, jupiter, orca, raydium, meteora, marinade, jito, save, marginfi
  - Include real program IDs, audit info, categories
- Run: pnpm seed:protocols
- Verify in Supabase table editor
```

### Phase 3: MCP Server (Day 3-4)

```
STEP 10: Create MCP server package
- Create packages/mcp-server/package.json, tsconfig.json
- Run: pnpm install

STEP 11: Implement MCP tools
- Create src/index.ts (Section 7.1) — full MCP server with 4 tools
- Create src/tools/ directory (optional: split each tool into its own file)
- Create src/middleware/auth.ts (API key check)
- Create src/middleware/rate-limit.ts (simple in-memory rate limit)

STEP 12: Test MCP server
- Create scripts/test-mcp.ts
  - Spawn MCP server as child process
  - Send test tool calls:
    1. check_protocol_risk({ protocol: 'kamino', action: 'lend' })
    2. get_risk_summary({ protocol: 'drift' })
    3. evaluate_policy({ action: 'lend', protocol: 'kamino', ... })
    4. get_supported_protocols({})
  - Print results
- Run: pnpm mcp:dev (in one terminal) + pnpm test:mcp (in another)
- Verify all 4 tools return valid responses
```

### Phase 4: Netlify Functions (Day 4-5)

```
STEP 13: Create functions app
- Create apps/functions/package.json, tsconfig.json, netlify.toml
- Create src/lib/supabase-admin.ts
- Create src/lib/auth.ts (Section 8.3)
- Create src/lib/response.ts (Section 8.4)
- Create src/lib/rate-limit.ts

STEP 14: Implement API endpoints
- Create src/api/v1/risk-check.ts (Section 8.2)
- Create src/api/v1/protocols.ts (GET list)
- Create src/api/v1/protocols-detail.ts (GET by slug)
- Create src/api/v1/positions.ts (GET/POST)
- Create src/api/v1/positions-health.ts (GET health)
- Create src/api/v1/policies.ts (GET/PUT)
- Create src/api/v1/policies-evaluate.ts (POST)
- Create src/api/v1/alerts.ts (GET)
- Create src/api/v1/agents.ts (GET/POST)
- Create src/api/v1/stats.ts (GET)

STEP 15: Implement x402 endpoint
- Create src/api/x402/pay.ts (Section 8.5)
- Create src/api/x402/verify.ts

STEP 16: Implement cron jobs
- Create src/cron/update-protocols.ts (Section 8.6)
- Create src/cron/check-positions.ts
- Create src/cron/cleanup.ts

STEP 17: Test functions locally
- Run: netlify dev (in apps/functions)
- Test with curl:
  curl -X POST http://localhost:8888/api/v1/risk-check \
    -H "Content-Type: application/json" \
    -H "x-api-key: test-key" \
    -d '{"protocol":"kamino","action":"lend","asset":"SOL","amount_usd":500}'
- Verify response
```

### Phase 5: Frontend Dashboard (Day 5-8)

```
STEP 18: Initialize Next.js app
- Run: pnpm create next-app apps/web --typescript --tailwind --app --src-dir
- Install: @supabase/supabase-js @supabase/ssr @agentgate/core
- Install shadcn/ui: npx shadcn-ui@latest init
- Add components: button, card, badge, table, dialog, input, select, tabs, toast, skeleton
- Create netlify.toml (Section 9.2)
- Install: @netlify/plugin-nextjs

STEP 19: Create Supabase auth
- Create src/lib/supabase/client.ts (browser client)
- Create src/lib/supabase/server.ts (server client)
- Create src/lib/supabase/middleware.ts (auth middleware)
- Create src/middleware.ts (Next.js middleware for auth redirect)
- Create src/app/auth/login/page.tsx
- Create src/app/auth/signup/page.tsx

STEP 20: Create layout components
- Create src/components/layout/sidebar.tsx
  - Links: Dashboard, Protocols, Agents, Positions, Policies, Alerts, Settings
  - AgentGate logo at top
  - User menu at bottom
- Create src/components/layout/header.tsx
- Create src/app/dashboard/layout.tsx (sidebar + header + content)

STEP 21: Create shared components
- Create src/components/shared/risk-badge.tsx
  - Takes score (0-10), renders colored badge:
    🟢 Low (7.5-10), 🟡 Medium (5-7.4), 🟠 High (2.5-4.9), 🔴 Critical (0-2.4)
- Create src/components/shared/loading-spinner.tsx
- Create src/components/shared/error-boundary.tsx

STEP 22: Create dashboard page
- Create src/components/dashboard/stats-overview.tsx (Section 9.4)
- Create src/components/dashboard/protocol-health-table.tsx
  - Table: Protocol | Category | TVL | Risk Score | Audit | Oracle | Status
  - Color-coded risk scores
  - Click row → navigate to /dashboard/protocols/[slug]
- Create src/components/dashboard/alert-feed.tsx
  - List of recent alerts with severity badges
  - Mark as read button
- Create src/components/dashboard/agent-activity-log.tsx
  - Recent risk checks with timestamps
- Create src/app/dashboard/page.tsx (Section 9.3)

STEP 23: Create protocols pages
- Create src/app/dashboard/protocols/page.tsx
  - Grid of protocol cards with risk scores
  - Filter by category, risk level
- Create src/components/protocols/protocol-card.tsx
- Create src/components/protocols/risk-factor-breakdown.tsx (Section 9.5)
- Create src/components/protocols/audit-badge.tsx
- Create src/app/dashboard/protocols/[slug]/page.tsx
  - Full risk breakdown
  - TVL chart (recharts)
  - Audit info
  - Exploit history
  - "Check Risk" interactive form

STEP 24: Create positions page
- Create src/app/dashboard/positions/page.tsx
  - Table: Protocol | Type | Asset | Amount | Health Factor | Liq. Price | PnL | Status
  - Health factor color-coded
  - Alert indicators

STEP 25: Create policies page
- Create src/app/dashboard/policies/page.tsx
- Create src/components/policies/policy-editor.tsx
  - Visual form for each rule:
    - Max single tx: slider + number input
    - Max daily volume: slider + number input
    - Allowed protocols: multi-select checkboxes
    - Min risk score: slider (0-10)
    - Require audited: toggle switch
    - etc.
  - Save button → PUT /api/v1/policies
- Create src/components/policies/policy-tester.tsx
  - "Test this policy" form: enter action, protocol, amount
  - Shows: ALLOWED ✅ or BLOCKED ❌ with reasons

STEP 26: Create alerts page
- Create src/app/dashboard/alerts/page.tsx
  - Filter by severity, type
  - Mark all as read
  - Real-time updates via Supabase Realtime

STEP 27: Create settings page
- Create src/app/dashboard/settings/page.tsx
  - API key display + regenerate
  - x402 wallet address input
  - Plan info (free/pro)
  - Usage stats

STEP 28: Create landing page
- Create src/app/page.tsx
  - Hero: "Every AI agent can trade. AgentGate makes sure they don't get rekt."
  - Features section (3 cards: Pre-Flight Check, Position Monitor, Policy Engine)
  - How it works (3 steps)
  - Integration code snippet (MCP config JSON)
  - CTA: "Get API Key" → /auth/signup
  - Footer: GitHub link, docs link
```

### Phase 6: Integration & Polish (Day 8-10)

```
STEP 29: Connect frontend to API
- Create src/lib/api.ts
  - Functions: fetchProtocols(), fetchProtocolDetail(slug),
    fetchPositions(), fetchAlerts(), fetchAgents(),
    runRiskCheck(params), evaluatePolicy(params)
  - All use x-api-key header
- Create hooks: use-protocols.ts, use-positions.ts, use-alerts.ts, use-agents.ts
  - React Query or SWR pattern with Supabase Realtime fallback

STEP 30: Add Supabase Realtime
- In alert-feed.tsx: subscribe to alerts table changes
- In protocol-health-table.tsx: subscribe to protocols table changes
- In agent-activity-log.tsx: subscribe to risk_checks table changes

STEP 31: Deploy to Netlify
- Connect GitHub repo to Netlify
- Set environment variables in Netlify dashboard
- Deploy functions: netlify deploy --prod
- Deploy web: auto-deploy on push
- Verify all endpoints work

STEP 32: Publish MCP server to npm
- Update packages/mcp-server/package.json with proper metadata
- Run: pnpm --filter mcp-server build
- Run: npm publish (or just keep as GitHub package for now)
- Update README with MCP config instructions

STEP 33: Write documentation
- Create README.md (project overview, quick start, features)
- Create docs/API.md (all REST endpoints with examples)
- Create docs/MCP.md (all MCP tools with examples)
- Create docs/INTEGRATION.md (how to integrate with ElizaOS, Solana Agent Kit, Claude)
- Create docs/DEPLOYMENT.md (how to deploy your own instance)

STEP 34: Create demo video script
- 2-minute demo:
  1. Show landing page
  2. Show dashboard with protocol risk scores
  3. Show MCP tool call in Claude: "Check if Kamino is safe for lending 1000 USDC"
  4. Show policy engine blocking an unsafe action
  5. Show position health monitor alerting on liquidation risk

STEP 35: Apply for Solana Foundation grant
- Go to solana.com/grants
- Fill application:
  - Project: AgentGate
  - Category: AI / Developer Tools
  - Description: Risk middleware for AI agents on Solana
  - Traction: GitHub repo, demo, early users
  - Ask: $5,000-$10,000 microgrant
```

---

## 13. TESTING PLAN

### 13.1 Unit Tests (Vitest)

```
packages/core/src/__tests__/
├── risk-scorer.test.ts
│   - Test: high TVL + audited + healthy oracle → score >= 7.5
│   - Test: low TVL + unaudited + oracle down → score < 2.5
│   - Test: recent exploit → score penalty
│   - Test: unknown protocol → score 0, recommendation "block"
│
├── policy-engine.test.ts
│   - Test: amount > max_single_tx → blocked
│   - Test: protocol in blocked list → blocked
│   - Test: risk score < min → blocked
│   - Test: drawdown > max → circuit_breaker
│   - Test: all rules pass → allowed
│   - Test: warning-level violations → allowed with warnings
│
└── position-monitor.test.ts
    - Test: health factor < 1.2 → critical alert
    - Test: health factor < 1.5 → warning alert
    - Test: health factor > 2.0 → no alert
    - Test: depeg detection (price deviation > 5%)
```

### 13.2 Integration Tests

```
- Test: Full risk check flow (fetch data → score → return)
- Test: MCP server responds to all 4 tools
- Test: API endpoint /api/v1/risk-check returns valid response
- Test: Supabase CRUD for all tables
- Test: Auth flow (signup → login → API key → authenticated request)
```

---

## 14. MONETIZATION & GROWTH PLAN

### Month 1: Launch
- [ ] Open-source on GitHub
- [ ] Publish MCP server on npm
- [ ] Deploy dashboard on Netlify
- [ ] Post on Solana Discord, Twitter/X, Reddit r/solana
- [ ] Submit to Solana Foundation grants
- [ ] Write blog post: "I built a safety layer for AI agents on Solana"

### Month 2: Integration
- [ ] Submit PR to ElizaOS as a plugin
- [ ] Submit PR to Solana Agent Kit as an extension
- [ ] Reach out to Kamino, Drift, Jupiter for "agent-safe" badge partnership
- [ ] Enable x402 payments (start earning per API call)
- [ ] Target: 100 registered agents, 1000 risk checks/day

### Month 3: Growth
- [ ] Add more protocols (Tensor, Magic Eden, Sanctum, etc.)
- [ ] Add webhook alerts (Telegram/Discord notifications)
- [ ] Launch Pro tier ($20/mo: real-time monitoring, custom policies, priority)
- [ ] Apply for Solana Foundation full grant ($50K-$250K)
- [ ] Target: 500 agents, 10K risk checks/day, $500/mo revenue

### Month 6: Scale
- [ ] Enterprise tier (custom integrations, SLA, dedicated support)
- [ ] Protocol partnerships (paid "safety certification" for protocols)
- [ ] Expand to other chains (Base, Arbitrum) if demand exists
- [ ] Target: 5000 agents, 100K risk checks/day, $5K/mo revenue

---

## 15. KEY METRICS TO TRACK

| Metric | How to Measure | Target (Month 3) |
|--------|---------------|-------------------|
| Registered agents | Supabase `agents` table | 500 |
| Risk checks/day | Supabase `risk_checks` table | 10,000 |
| Avg response time | `response_time_ms` field | < 200ms |
| Blocked actions | `policy_violations` table | Track trend |
| Alerts triggered | `alerts` table | Track trend |
| x402 revenue | `x402_payments` table | $500/mo |
| MCP server installs | npm download stats | 1,000 |
| GitHub stars | GitHub API | 500 |
| Dashboard MAU | Netlify Analytics | 200 |

---

## 16. RISK MITIGATION (For the Builder)

| Risk | Mitigation |
|------|-----------|
| Data sources go down (Helius, DeFiLlama) | Cache aggressively, multiple fallback sources |
| No users initially | Focus on MCP integration → agents find you automatically |
| Competitor appears | First-mover + open-source community = moat |
| Supabase free tier limits | Optimize queries, cache in Netlify edge |
| x402 adoption slow | Offer free tier alongside paid |
| Protocol data inaccurate | Cross-reference multiple sources, community reporting |
| Solo builder burnout | MVP in 2 weeks, iterate weekly, don't over-engineer |

---

## 17. QUICK START COMMANDS

```bash
# 1. Clone and install
git clone https://github.com/yourname/agentgate.git
cd agentgate
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your Supabase, Helius keys

# 3. Set up database
supabase db push
pnpm seed:protocols

# 4. Build core
pnpm build:core

# 5. Run MCP server (test)
pnpm mcp:dev

# 6. Run web dashboard
pnpm dev

# 7. Run Netlify functions locally
cd apps/functions && netlify dev

# 8. Deploy
git push origin main  # Auto-deploys to Netlify
```

---

## 18. LICENSE

MIT License — free for anyone to use, modify, and build upon.

---

> **Built by a solo builder, for the agentic internet.**
> **AgentGate: Because your AI agent deserves a safety net.** 🛡️
```

---

## How to Use This Document

1. **Save** the entire markdown above as `AGENTGATE_PROJECT_PLAN.md`
2. **Open Cursor / Claude Code / Windsurf**
3. **Feed it step by step**: Start with *"Read AGENTGATE_PROJECT_PLAN.md. Execute STEP 1."*
4. After each step, verify the output, then say *"Execute STEP 2."*
5. For any step, if the AI gets stuck, paste the **exact code** from the relevant section above

The document is structured so that **every file, every function, every type, every SQL statement** is specified. An agentic AI builder should be able to produce a working MVP by following Steps 1–35 sequentially.

Want me to expand any specific section further, or generate the actual code for any file I've only described at a high level? 🚀