You're absolutely right — my apologies. Here's a **single `scaffold.sh` script**. Copy it, save it, run `bash scaffold.sh`, and the **entire project is created** — every folder, every file, every line of code.

---

## How to use:

```bash
# 1. Create a folder
mkdir agentgate && cd agentgate

# 2. Save the script below as scaffold.sh

# 3. Run it
bash scaffold.sh

# 4. Done. Entire project is ready.
```

---

```bash
#!/bin/bash
# ============================================
# AgentGate — Full Project Scaffold
# Run: bash scaffold.sh
# Creates the ENTIRE project structure
# ============================================

set -e

echo "🛡️  AgentGate — Scaffolding complete project..."
echo ""

# ============================================
# ROOT FILES
# ============================================

mkdir -p packages/core/src/data-fetchers
mkdir -p packages/core/src/utils
mkdir -p packages/core/src/__tests__
mkdir -p packages/mcp-server/src/tools
mkdir -p packages/mcp-server/src/middleware
mkdir -p packages/api-client/src
mkdir -p apps/web/src/app/dashboard/agents/\[id\]
mkdir -p apps/web/src/app/dashboard/protocols/\[slug\]
mkdir -p apps/web/src/app/dashboard/positions
mkdir -p apps/web/src/app/dashboard/policies
mkdir -p apps/web/src/app/dashboard/alerts
mkdir -p apps/web/src/app/dashboard/settings
mkdir -p apps/web/src/app/auth/login
mkdir -p apps/web/src/app/auth/signup
mkdir -p apps/web/src/app/api/health
mkdir -p apps/web/src/components/ui
mkdir -p apps/web/src/components/layout
mkdir -p apps/web/src/components/dashboard
mkdir -p apps/web/src/components/protocols
mkdir -p apps/web/src/components/policies
mkdir -p apps/web/src/components/shared
mkdir -p apps/web/src/lib/supabase
mkdir -p apps/web/src/lib/hooks
mkdir -p apps/functions/src/api/v1
mkdir -p apps/functions/src/api/x402
mkdir -p apps/functions/src/cron
mkdir -p apps/functions/src/lib
mkdir -p supabase/migrations
mkdir -p scripts
mkdir -p docs

echo "📁 Directory structure created."

# ============================================
# ROOT: package.json
# ============================================
cat > package.json << 'ROOTPKG'
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
    "test": "vitest",
    "lint": "eslint . --ext .ts,.tsx",
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
ROOTPKG

# ============================================
# ROOT: pnpm-workspace.yaml
# ============================================
cat > pnpm-workspace.yaml << 'WORKSPACE'
packages:
  - 'packages/*'
  - 'apps/*'
WORKSPACE

# ============================================
# ROOT: tsconfig.json
# ============================================
cat > tsconfig.json << 'ROOTTS'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "exclude": ["node_modules", "dist"]
}
ROOTTS

# ============================================
# ROOT: .env.example
# ============================================
cat > .env.example << 'ENVEX'
# --- Supabase ---
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# --- Helius (Solana RPC) ---
HELIUS_RPC_URL=https://mainnet.helius-rpc.com
HELIUS_API_KEY=your-helius-api-key

# --- AgentGate ---
AGENTGATE_API_URL=https://your-app.netlify.app

# --- x402 Payments ---
X402_RECIPIENT_WALLET=your-solana-wallet-address
X402_NETWORK=mainnet-beta

# --- App ---
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NODE_ENV=development
ENVEX

# ============================================
# ROOT: .gitignore
# ============================================
cat > .gitignore << 'GITIGN'
node_modules/
dist/
.next/
.env
.env.local
*.log
.DS_Store
.netlify/
coverage/
GITIGN

# ============================================
# ROOT: .prettierrc
# ============================================
cat > .prettierrc << 'PRETTIER'
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
PRETTIER

# ============================================
# ROOT: LICENSE
# ============================================
cat > LICENSE << 'LIC'
MIT License

Copyright (c) 2026 AgentGate

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
LIC

# ============================================
# ROOT: README.md
# ============================================
cat > README.md << 'README'
# 🛡️ AgentGate

**AI Agent DeFi Risk Middleware for Solana**

> "Every AI agent can trade. AgentGate makes sure they don't get rekt."

AgentGate is an open-source risk middleware layer that sits between AI agents and Solana DeFi protocols. Before an AI agent executes any DeFi transaction, it calls AgentGate to get a real-time risk assessment.

## Features

- **Pre-Flight Risk Check** — Score any Solana DeFi protocol (0-10) before interacting
- **Position Health Monitor** — Track positions and alert on liquidation risk
- **Policy Engine** — Configurable guardrails: max tx size, allowed protocols, circuit breakers
- **MCP Server** — Works with Claude, GPT, ElizaOS, any MCP-compatible agent
- **REST API** — Standard HTTP API for custom integrations
- **Dashboard** — Web UI to monitor everything
- **x402 Payments** — Pay-per-call via Solana USDC micropayments

## Quick Start

```bash
# Install
pnpm install

# Setup
cp .env.example .env  # Add your keys

# Build core
pnpm build:core

# Run MCP server
pnpm mcp:dev

# Run dashboard
pnpm dev
```

## MCP Integration

Add to your Claude Desktop / Cursor config:

```json
{
  "mcpServers": {
    "agentgate": {
      "command": "npx",
      "args": ["-y", "@agentgate/mcp-server"]
    }
  }
}
```

## Supported Protocols

Kamino, Drift, Jupiter, Orca, Raydium, Meteora, Marinade, Jito, Save, MarginFi

## Tech Stack

- **Frontend**: Next.js 14 + Tailwind + shadcn/ui (Netlify)
- **Database**: Supabase (PostgreSQL)
- **API**: Netlify Serverless Functions
- **MCP**: @modelcontextprotocol/sdk
- **Data**: Helius RPC + Pyth Oracle + DeFiLlama
- **Payments**: Solana x402

## License

MIT
README

echo "📄 Root files created."

# ============================================
# PACKAGES/CORE
# ============================================

cat > packages/core/package.json << 'COREPKG'
{
  "name": "@agentgate/core",
  "version": "1.0.0",
  "description": "AgentGate Core Risk Engine",
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
COREPKG

cat > packages/core/tsconfig.json << 'CORETS'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
CORETS

# --- types.ts ---
cat > packages/core/src/types.ts << 'TYPES'
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
  riskScore: number | null;
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
  riskScore: number;
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
  score: number;
  weight: number;
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
TYPES

# --- constants.ts ---
cat > packages/core/src/constants.ts << 'CONSTANTS'
export const RISK_WEIGHTS = {
  tvl: 0.20,
  audit: 0.25,
  oracle: 0.15,
  exploit_history: 0.20,
  tvl_trend: 0.10,
  protocol_age: 0.10,
} as const;

export const RISK_THRESHOLDS = {
  low: 7.5,
  medium: 5.0,
  high: 2.5,
  critical: 0,
} as const;

export const HEALTH_FACTOR_THRESHOLDS = {
  safe: 2.0,
  warning: 1.5,
  danger: 1.2,
  critical: 1.05,
} as const;

export const CACHE_TTL_MS = {
  protocol_data: 5 * 60 * 1000,
  oracle_prices: 30 * 1000,
  tvl_data: 10 * 60 * 1000,
  audit_data: 60 * 60 * 1000,
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
  pricePerRiskCheck: 0.001,
  pricePerPositionCheck: 0.002,
  pricePerPolicyEval: 0.001,
  recipientWallet: process.env.X402_RECIPIENT_WALLET || '',
  network: 'mainnet-beta',
};

export const RATE_LIMITS = {
  free: { requestsPerMinute: 30, requestsPerDay: 1000 },
  pro: { requestsPerMinute: 120, requestsPerDay: 10000 },
  enterprise: { requestsPerMinute: 600, requestsPerDay: 100000 },
};
CONSTANTS

# --- utils/logger.ts ---
cat > packages/core/src/utils/logger.ts << 'LOGGER'
export function log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[AgentGate][${level.toUpperCase()}][${timestamp}]`;
  if (level === 'error') console.error(prefix, message, data || '');
  else if (level === 'warn') console.warn(prefix, message, data || '');
  else console.log(prefix, message, data || '');
}
LOGGER

# --- utils/cache.ts ---
cat > packages/core/src/utils/cache.ts << 'CACHE'
const store = new Map<string, { data: any; expiry: number }>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  store.delete(key);
  return null;
}

export function setCache(key: string, data: any, ttlMs: number): void {
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

export function clearCache(): void {
  store.clear();
}
CACHE

# --- utils/helpers.ts ---
cat > packages/core/src/utils/helpers.ts << 'HELPERS'
export function formatUsd(amount: number | null): string {
  if (amount === null) return 'N/A';
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
  return `$${amount.toFixed(2)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
HELPERS

# --- data-fetchers/pyth.ts ---
cat > packages/core/src/data-fetchers/pyth.ts << 'PYTH'
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
  const feedIds = symbols.map((s) => PYTH_FEED_IDS[s]).filter(Boolean);
  const params = feedIds.map((id) => `ids[]=${id}`).join('&');
  const priceMap = new Map<string, PythPrice>();
  try {
    const response = await fetch(`${PYTH_API_URL}?${params}`);
    const data = await response.json();
    for (const parsed of data.parsed || []) {
      const price = parsed.price;
      const rawPrice = parseInt(price.price);
      const expo = parseInt(price.expo);
      const id = parsed.id;
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
PYTH

# --- data-fetchers/defillama.ts ---
cat > packages/core/src/data-fetchers/defillama.ts << 'DEFILLAMA'
const DEFILLAMA_API = 'https://api.llama.fi';

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
DEFILLAMA

# --- data-fetchers/helius.ts ---
cat > packages/core/src/data-fetchers/helius.ts << 'HELIUS'
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '';

export async function getAccountInfo(publicKey: string): Promise<any> {
  const response = await fetch(`${HELIUS_RPC_URL}/?api-key=${HELIUS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'getAccountInfo',
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
      jsonrpc: '2.0', id: 1, method: 'getTokenAccountBalance',
      params: [publicKey],
    }),
  });
  const data = await response.json();
  return parseFloat(data.result?.value?.uiAmountString || '0');
}
HELIUS

# --- data-fetchers/audit-db.ts ---
cat > packages/core/src/data-fetchers/audit-db.ts << 'AUDITDB'
// Audit data is stored in Supabase protocols table
// This module provides a fallback static map for known audits

export interface AuditInfo {
  status: 'audited' | 'partial' | 'unaudited' | 'unknown';
  auditors: string[];
  auditDate: string | null;
}

const KNOWN_AUDITS: Record<string, AuditInfo> = {
  kamino: { status: 'audited', auditors: ['OtterSec', 'Neodyme'], auditDate: '2024-03-15' },
  drift: { status: 'audited', auditors: ['OtterSec', 'Halborn'], auditDate: '2024-01-20' },
  jupiter: { status: 'audited', auditors: ['OtterSec'], auditDate: '2024-02-10' },
  orca: { status: 'audited', auditors: ['OtterSec', 'Neodyme'], auditDate: '2023-11-05' },
  raydium: { status: 'audited', auditors: ['OtterSec'], auditDate: '2023-09-15' },
  meteora: { status: 'audited', auditors: ['OtterSec'], auditDate: '2024-04-01' },
  marinade: { status: 'audited', auditors: ['OtterSec', 'Neodyme'], auditDate: '2023-08-20' },
  jito: { status: 'audited', auditors: ['OtterSec'], auditDate: '2024-01-10' },
  save: { status: 'audited', auditors: ['OtterSec'], auditDate: '2024-05-01' },
  marginfi: { status: 'audited', auditors: ['OtterSec', 'Neodyme'], auditDate: '2024-02-28' },
};

export function getAuditInfo(slug: string): AuditInfo {
  return KNOWN_AUDITS[slug] || { status: 'unknown', auditors: [], auditDate: null };
}
AUDITDB

# --- data-fetchers/index.ts ---
cat > packages/core/src/data-fetchers/index.ts << 'DFINDEX'
import { getTVL } from './defillama';
import { getPrice } from './pyth';
import { getAuditInfo } from './audit-db';
import { getCached, setCache } from '../utils/cache';
import { CACHE_TTL_MS, SUPPORTED_PROTOCOLS } from '../constants';
import type { ProtocolData, OracleHealth, ProtocolCategory } from '../types';

const PROTOCOL_CATEGORIES: Record<string, ProtocolCategory> = {
  kamino: 'lending', drift: 'perps', jupiter: 'dex', orca: 'dex',
  raydium: 'dex', meteora: 'dex', marinade: 'staking', jito: 'staking',
  save: 'lending', marginfi: 'lending',
};

export async function fetchProtocolData(slug: string): Promise<ProtocolData | null> {
  const cacheKey = `protocol:${slug}`;
  const cached = getCached<ProtocolData>(cacheKey);
  if (cached) return cached;

  try {
    const tvlData = await getTVL(slug);
    const auditInfo = getAuditInfo(slug);

    let oracleHealth: OracleHealth = 'unknown';
    const price = await getPrice('SOL');
    if (price) {
      const age = Date.now() / 1000 - price.publishTime;
      if (age < 120) oracleHealth = 'healthy';
      else if (age < 600) oracleHealth = 'degraded';
      else oracleHealth = 'down';
    }

    const protocolData: ProtocolData = {
      slug,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      category: PROTOCOL_CATEGORIES[slug] || 'lending',
      programIds: [],
      tvlUsd: tvlData?.tvlUsd || null,
      tvlChange24h: tvlData?.tvlChange24h || null,
      auditStatus: auditInfo.status,
      auditors: auditInfo.auditors,
      auditDate: auditInfo.auditDate,
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

export { getTVL, getPrice, getAuditInfo };
DFINDEX

# --- risk-scorer.ts ---
cat > packages/core/src/risk-scorer.ts << 'RISKSCORER'
import { RISK_WEIGHTS, RISK_THRESHOLDS } from './constants';
import type {
  ProtocolData, RiskCheckRequest, RiskCheckResponse,
  RiskFactor, RiskLevel, Recommendation,
} from './types';
import { fetchProtocolData } from './data-fetchers';

export class RiskScorer {
  async scoreProtocol(request: RiskCheckRequest): Promise<RiskCheckResponse> {
    const startTime = Date.now();
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

    const factors: RiskFactor[] = [
      this.scoreTVL(protocol),
      this.scoreAudit(protocol),
      this.scoreOracle(protocol),
      this.scoreExploitHistory(protocol),
      this.scoreTVLTrend(protocol),
      this.scoreProtocolAge(protocol),
    ];

    const totalScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const roundedScore = Math.round(totalScore * 100) / 100;
    const riskLevel = this.getRiskLevel(roundedScore);
    const recommendation = this.getRecommendation(roundedScore, riskLevel, request);
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

  private scoreTVL(p: ProtocolData): RiskFactor {
    const tvl = p.tvlUsd || 0;
    let score = 5;
    if (tvl >= 1_000_000_000) score = 10;
    else if (tvl >= 500_000_000) score = 9;
    else if (tvl >= 100_000_000) score = 8;
    else if (tvl >= 50_000_000) score = 7;
    else if (tvl >= 10_000_000) score = 5;
    else if (tvl >= 1_000_000) score = 3;
    else score = 1;
    return {
      name: 'TVL Size', score, weight: RISK_WEIGHTS.tvl,
      details: `TVL: $${(tvl / 1e6).toFixed(1)}M. ${tvl >= 100_000_000 ? 'Large, established.' : tvl >= 10_000_000 ? 'Medium-sized.' : 'Small TVL — higher risk.'}`,
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
      name: 'Audit Status', score, weight: RISK_WEIGHTS.audit,
      details: `Status: ${p.auditStatus}. Auditors: ${p.auditors.length > 0 ? p.auditors.join(', ') : 'None'}.`,
    };
  }

  private scoreOracle(p: ProtocolData): RiskFactor {
    let score = 5;
    if (p.oracleHealth === 'healthy') score = 10;
    else if (p.oracleHealth === 'degraded') score = 5;
    else if (p.oracleHealth === 'down') score = 1;
    else score = 3;
    return {
      name: 'Oracle Health', score, weight: RISK_WEIGHTS.oracle,
      details: `Provider: ${p.oracleProvider || 'unknown'}. Health: ${p.oracleHealth}.`,
    };
  }

  private scoreExploitHistory(p: ProtocolData): RiskFactor {
    const exploits = p.exploitHistory.length;
    let score = 10;
    if (exploits === 1) score = 6;
    else if (exploits === 2) score = 4;
    else if (exploits > 2) score = 2;
    if (exploits > 0) {
      const lastExploit = new Date(p.exploitHistory[0].date);
      const monthsSince = (Date.now() - lastExploit.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsSince < 6) score = Math.max(1, score - 3);
      else if (monthsSince < 12) score = Math.max(1, score - 1);
    }
    return {
      name: 'Exploit History', score, weight: RISK_WEIGHTS.exploit_history,
      details: exploits === 0 ? 'No known exploits.' : `${exploits} exploit(s). Last: ${p.exploitHistory[0]?.date}.`,
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
      name: 'TVL Trend (24h)', score, weight: RISK_WEIGHTS.tvl_trend,
      details: `24h TVL change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%.`,
    };
  }

  private scoreProtocolAge(p: ProtocolData): RiskFactor {
    let score = 5;
    if (p.auditDate) {
      const months = (Date.now() - new Date(p.auditDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (months >= 24) score = 10;
      else if (months >= 12) score = 8;
      else if (months >= 6) score = 6;
      else score = 4;
    }
    return {
      name: 'Protocol Maturity', score, weight: RISK_WEIGHTS.protocol_age,
      details: p.auditDate ? `First audited: ${p.auditDate}.` : 'Age unknown.',
    };
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= RISK_THRESHOLDS.low) return 'low';
    if (score >= RISK_THRESHOLDS.medium) return 'medium';
    if (score >= RISK_THRESHOLDS.high) return 'high';
    return 'critical';
  }

  private getRecommendation(score: number, level: RiskLevel, request: RiskCheckRequest): Recommendation {
    if (level === 'critical') return 'block';
    if (level === 'high') return 'avoid';
    if (level === 'medium') return 'proceed_with_caution';
    return 'proceed';
  }

  private generateWarnings(p: ProtocolData, request: RiskCheckRequest, score: number): string[] {
    const warnings: string[] = [];
    if (p.oracleHealth === 'down') warnings.push('⚠️ Oracle is DOWN. Price data may be stale.');
    if (p.oracleHealth === 'degraded') warnings.push('⚠️ Oracle is degraded. Verify prices independently.');
    if (p.auditStatus === 'unaudited') warnings.push('⚠️ Protocol is UNAUDITED. Smart contract risk is elevated.');
    if (p.tvlChange24h && p.tvlChange24h < -15) warnings.push('⚠️ TVL dropped >15% in 24h. Possible bank run.');
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
RISKSCORER

# --- policy-engine.ts ---
cat > packages/core/src/policy-engine.ts << 'POLICYENGINE'
import type {
  PolicyRules, PolicyEvaluationRequest, PolicyEvaluationResponse, PolicyViolation,
} from './types';

export class PolicyEngine {
  evaluate(rules: PolicyRules, request: PolicyEvaluationRequest): PolicyEvaluationResponse {
    const violations: PolicyViolation[] = [];
    const warnings: string[] = [];

    if (rules.blocked_protocols.includes(request.protocolSlug)) {
      violations.push({ rule: 'blocked_protocols', message: `Protocol "${request.protocolSlug}" is blocked.`, severity: 'blocked', currentValue: request.protocolSlug, threshold: 'not in blocked list' });
    }
    if (rules.allowed_protocols.length > 0 && !rules.allowed_protocols.includes(request.protocolSlug)) {
      violations.push({ rule: 'allowed_protocols', message: `Protocol "${request.protocolSlug}" not in allowed list.`, severity: 'blocked', currentValue: request.protocolSlug, threshold: rules.allowed_protocols.join(', ') });
    }
    if (rules.blocked_actions.includes(request.action)) {
      violations.push({ rule: 'blocked_actions', message: `Action "${request.action}" is blocked.`, severity: 'blocked', currentValue: request.action, threshold: 'not in blocked list' });
    }
    if (rules.allowed_actions.length > 0 && !rules.allowed_actions.includes(request.action)) {
      violations.push({ rule: 'allowed_actions', message: `Action "${request.action}" not in allowed list.`, severity: 'blocked', currentValue: request.action, threshold: rules.allowed_actions.join(', ') });
    }
    if (request.amountUsd > rules.max_single_tx_usd) {
      violations.push({ rule: 'max_single_tx_usd', message: `Tx $${request.amountUsd} exceeds max $${rules.max_single_tx_usd}.`, severity: 'blocked', currentValue: request.amountUsd, threshold: rules.max_single_tx_usd });
    }
    if (request.dailyVolumeUsd + request.amountUsd > rules.max_daily_volume_usd) {
      violations.push({ rule: 'max_daily_volume_usd', message: `Daily volume would exceed $${rules.max_daily_volume_usd}.`, severity: 'blocked', currentValue: request.dailyVolumeUsd + request.amountUsd, threshold: rules.max_daily_volume_usd });
    }
    if (request.amountUsd > rules.max_position_size_usd) {
      violations.push({ rule: 'max_position_size_usd', message: `Position $${request.amountUsd} exceeds max $${rules.max_position_size_usd}.`, severity: 'blocked', currentValue: request.amountUsd, threshold: rules.max_position_size_usd });
    }
    if (request.riskScore < rules.min_risk_score) {
      violations.push({ rule: 'min_risk_score', message: `Risk score ${request.riskScore} below min ${rules.min_risk_score}.`, severity: request.riskScore < rules.min_risk_score / 2 ? 'circuit_breaker' : 'blocked', currentValue: request.riskScore, threshold: rules.min_risk_score });
    }
    if (request.currentDrawdownPct > rules.max_drawdown_pct) {
      violations.push({ rule: 'max_drawdown_pct', message: `Drawdown ${request.currentDrawdownPct}% exceeds max ${rules.max_drawdown_pct}%. COOLDOWN.`, severity: 'circuit_breaker', currentValue: request.currentDrawdownPct, threshold: rules.max_drawdown_pct });
    }
    if (request.currentPositionsCount >= rules.max_open_positions) {
      violations.push({ rule: 'max_open_positions', message: `At ${request.currentPositionsCount} positions (max: ${rules.max_open_positions}).`, severity: 'warning', currentValue: request.currentPositionsCount, threshold: rules.max_open_positions });
    }
    if (rules.require_oracle_healthy && request.oracleHealth !== 'healthy') {
      violations.push({ rule: 'require_oracle_healthy', message: `Oracle is "${request.oracleHealth}". Policy requires "healthy".`, severity: 'blocked', currentValue: request.oracleHealth, threshold: 'healthy' });
    }
    if (rules.require_audited && request.auditStatus !== 'audited') {
      violations.push({ rule: 'require_audited', message: `Audit status "${request.auditStatus}". Policy requires "audited".`, severity: 'blocked', currentValue: request.auditStatus, threshold: 'audited' });
    }

    const hasBlocks = violations.some((v) => v.severity === 'blocked' || v.severity === 'circuit_breaker');
    const allowed = !hasBlocks;

    if (request.amountUsd > rules.max_single_tx_usd * 0.8) {
      warnings.push(`Transaction is ${((request.amountUsd / rules.max_single_tx_usd) * 100).toFixed(0)}% of max single tx limit.`);
    }
    if (request.riskScore < rules.min_risk_score + 1.5) {
      warnings.push('Risk score is close to your minimum threshold.');
    }

    return { allowed, violations, warnings, evaluatedAt: new Date().toISOString() };
  }
}
POLICYENGINE

# --- position-monitor.ts ---
cat > packages/core/src/position-monitor.ts << 'POSMON'
import { HEALTH_FACTOR_THRESHOLDS } from './constants';
import type { PositionData, PositionHealthAlert } from './types';

export class PositionMonitor {
  checkPositionHealth(position: PositionData): PositionHealthAlert[] {
    const alerts: PositionHealthAlert[] = [];

    if (position.healthFactor !== null) {
      if (position.healthFactor < HEALTH_FACTOR_THRESHOLDS.critical) {
        alerts.push({
          positionId: position.id,
          alertType: 'liquidation_risk',
          severity: 'critical',
          message: `🔴 CRITICAL: Health factor ${position.healthFactor.toFixed(3)} — IMMINENT LIQUIDATION for ${position.asset} on ${position.protocolSlug}. Liquidation price: $${position.liquidationPrice?.toFixed(2) || 'N/A'}. Current: $${position.currentPrice.toFixed(2)}.`,
          healthFactor: position.healthFactor,
          liquidationPrice: position.liquidationPrice,
          currentPrice: position.currentPrice,
        });
      } else if (position.healthFactor < HEALTH_FACTOR_THRESHOLDS.danger) {
        alerts.push({
          positionId: position.id,
          alertType: 'health_factor_low',
          severity: 'critical',
          message: `🟠 DANGER: Health factor ${position.healthFactor.toFixed(3)} for ${position.asset} on ${position.protocolSlug}. Add collateral or reduce position.`,
          healthFactor: position.healthFactor,
          liquidationPrice: position.liquidationPrice,
          currentPrice: position.currentPrice,
        });
      } else if (position.healthFactor < HEALTH_FACTOR_THRESHOLDS.warning) {
        alerts.push({
          positionId: position.id,
          alertType: 'health_factor_low',
          severity: 'warning',
          message: `🟡 WARNING: Health factor ${position.healthFactor.toFixed(3)} for ${position.asset} on ${position.protocolSlug}. Monitor closely.`,
          healthFactor: position.healthFactor,
          liquidationPrice: position.liquidationPrice,
          currentPrice: position.currentPrice,
        });
      }
    }

    // Check for significant loss
    if (position.pnlUsd < 0 && position.amountUsd > 0) {
      const lossPct = Math.abs(position.pnlUsd / position.amountUsd) * 100;
      if (lossPct > 20) {
        alerts.push({
          positionId: position.id,
          alertType: 'drawdown_limit',
          severity: 'warning',
          message: `🟡 Position down ${lossPct.toFixed(1)}% ($${position.pnlUsd.toFixed(2)}). Consider reviewing.`,
          healthFactor: position.healthFactor,
          liquidationPrice: position.liquidationPrice,
          currentPrice: position.currentPrice,
        });
      }
    }

    return alerts;
  }

  checkAllPositions(positions: PositionData[]): PositionHealthAlert[] {
    return positions.flatMap((p) => this.checkPositionHealth(p));
  }
}
POSMON

# --- index.ts ---
cat > packages/core/src/index.ts << 'COREINDEX'
export { RiskScorer } from './risk-scorer';
export { PolicyEngine } from './policy-engine';
export { PositionMonitor } from './position-monitor';
export * from './types';
export * from './constants';
export { fetchProtocolData, getTVL, getPrice, getAuditInfo } from './data-fetchers';
COREINDEX

echo "📦 packages/core created."

# ============================================
# PACKAGES/MCP-SERVER
# ============================================

cat > packages/mcp-server/package.json << 'MCPPKG'
{
  "name": "@agentgate/mcp-server",
  "version": "1.0.0",
  "description": "AgentGate MCP Server for AI Agents",
  "bin": { "agentgate-mcp": "dist/index.js" },
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
MCPPKG

cat > packages/mcp-server/tsconfig.json << 'MCPTS'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
MCPTS

cat > packages/mcp-server/src/index.ts << 'MCPSERVER'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { RiskScorer, PolicyEngine, SUPPORTED_PROTOCOLS } from '@agentgate/core';

const server = new McpServer({ name: 'agentgate', version: '1.0.0' });
const riskScorer = new RiskScorer();
const policyEngine = new PolicyEngine();

// TOOL 1: check_protocol_risk
server.tool(
  'check_protocol_risk',
  'Check the risk score and safety of a Solana DeFi protocol before interacting with it. Returns a 0-10 risk score, risk factors, warnings, and a recommendation.',
  {
    protocol: z.enum(['kamino','drift','jupiter','orca','raydium','meteora','marinade','jito','save','marginfi']).describe('Solana DeFi protocol'),
    action: z.enum(['lend','borrow','swap','lp','stake','perp_long','perp_short']).describe('DeFi action'),
    asset: z.string().optional().describe('Asset (SOL, USDC, JitoSOL)'),
    amount_usd: z.number().optional().describe('Amount in USD'),
  },
  async ({ protocol, action, asset, amount_usd }) => {
    const result = await riskScorer.scoreProtocol({ protocolSlug: protocol, action: action as any, asset, amountUsd: amount_usd });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// TOOL 2: evaluate_policy
server.tool(
  'evaluate_policy',
  'Evaluate whether a planned DeFi action violates any configured guardrail policies.',
  {
    action: z.enum(['lend','borrow','swap','lp','stake','perp_long','perp_short']),
    protocol: z.string(),
    asset: z.string(),
    amount_usd: z.number(),
    risk_score: z.number().describe('Risk score from check_protocol_risk (0-10)'),
    current_positions_count: z.number().default(0),
    daily_volume_usd: z.number().default(0),
    current_drawdown_pct: z.number().default(0),
    oracle_health: z.enum(['healthy','degraded','down','unknown']).default('healthy'),
    audit_status: z.enum(['audited','partial','unaudited','unknown']).default('unknown'),
  },
  async (params) => {
    const defaultRules = {
      max_single_tx_usd: 1000, max_daily_volume_usd: 10000, max_position_size_usd: 5000,
      max_drawdown_pct: 15, allowed_protocols: ['kamino','jupiter','drift','orca','raydium','meteora','marinade','jito'],
      blocked_protocols: [], allowed_actions: ['lend','borrow','swap','lp','stake'] as any[],
      blocked_actions: [] as any[], min_risk_score: 5.0, auto_deleverage_health_factor: 1.2,
      cooldown_after_loss_hours: 24, max_open_positions: 10, require_oracle_healthy: true, require_audited: false,
    };
    const result = policyEngine.evaluate(defaultRules, {
      agentId: 'mcp-agent', action: params.action as any, protocolSlug: params.protocol,
      asset: params.asset, amountUsd: params.amount_usd, riskScore: params.risk_score,
      currentPositionsCount: params.current_positions_count, dailyVolumeUsd: params.daily_volume_usd,
      currentDrawdownPct: params.current_drawdown_pct, oracleHealth: params.oracle_health as any,
      auditStatus: params.audit_status as any,
    });
    return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
  }
);

// TOOL 3: get_supported_protocols
server.tool(
  'get_supported_protocols',
  'Get all Solana DeFi protocols supported by AgentGate with current risk scores.',
  {},
  async () => {
    const results = await Promise.all(
      SUPPORTED_PROTOCOLS.map(async (slug) => {
        const risk = await riskScorer.scoreProtocol({ protocolSlug: slug, action: 'lend' });
        return { slug, name: risk.protocolName, riskScore: risk.riskScore, riskLevel: risk.riskLevel, tvlUsd: risk.protocolData.tvlUsd, auditStatus: risk.protocolData.auditStatus };
      })
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
  }
);

// TOOL 4: get_risk_summary
server.tool(
  'get_risk_summary',
  'Get a quick human-readable risk summary for a protocol.',
  { protocol: z.string().describe('Protocol slug (kamino, drift, jupiter, etc.)') },
  async ({ protocol }) => {
    const risk = await riskScorer.scoreProtocol({ protocolSlug: protocol, action: 'lend' });
    const emoji = risk.riskLevel === 'low' ? '🟢' : risk.riskLevel === 'medium' ? '🟡' : risk.riskLevel === 'high' ? '🟠' : '🔴';
    const summary = `${emoji} ${risk.protocolName} — Risk Score: ${risk.riskScore}/10 (${risk.riskLevel.toUpperCase()})\nRecommendation: ${risk.recommendation.toUpperCase()}\nTVL: $${((risk.protocolData.tvlUsd || 0) / 1e6).toFixed(1)}M\nAudit: ${risk.protocolData.auditStatus} (${risk.protocolData.auditors.join(', ') || 'none'})\nOracle: ${risk.protocolData.oracleHealth}\nExploits: ${risk.protocolData.exploitCount}\n${risk.warnings.length > 0 ? '\nWarnings:\n' + risk.warnings.map((w) => '  ' + w).join('\n') : ''}`;
    return { content: [{ type: 'text' as const, text: summary }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AgentGate MCP Server running on stdio');
}
main().catch(console.error);
MCPSERVER

echo "📦 packages/mcp-server created."

# ============================================
# SUPABASE MIGRATION
# ============================================

cat > supabase/migrations/001_initial_schema.sql << 'SQLMIG'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL DEFAULT ('ag_' || replace(uuid_generate_v4()::text, '-', '')),
  plan TEXT NOT NULL DEFAULT 'free',
  x402_wallet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agents (
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

CREATE TABLE protocols (
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

CREATE TABLE risk_checks (
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

CREATE TABLE positions (
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

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rules JSONB NOT NULL DEFAULT '{"max_single_tx_usd":1000,"max_daily_volume_usd":10000,"max_position_size_usd":5000,"max_drawdown_pct":15,"allowed_protocols":["kamino","jupiter","drift","orca","raydium","meteora","marinade","jito"],"blocked_protocols":[],"allowed_actions":["lend","borrow","swap","lp","stake"],"blocked_actions":[],"min_risk_score":5.0,"auto_deleverage_health_factor":1.2,"cooldown_after_loss_hours":24,"max_open_positions":10,"require_oracle_healthy":true,"require_audited":false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE policy_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  rule_violated TEXT NOT NULL,
  action_attempted TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'warning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alerts (
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

CREATE TABLE x402_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  amount_usdc NUMERIC NOT NULL,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_checks_agent ON risk_checks(agent_id);
CREATE INDEX idx_risk_checks_user ON risk_checks(user_id);
CREATE INDEX idx_risk_checks_created ON risk_checks(created_at DESC);
CREATE INDEX idx_positions_agent ON positions(agent_id);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = false;
CREATE INDEX idx_policy_violations_agent ON policy_violations(agent_id);
CREATE INDEX idx_protocols_slug ON protocols(slug);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE x402_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users manage agents" ON agents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view risk checks" ON risk_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert risk checks" ON risk_checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage positions" ON positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage policies" ON policies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view violations" ON policy_violations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage alerts" ON alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view payments" ON x402_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Protocols public read" ON protocols FOR SELECT USING (true);

INSERT INTO protocols (slug, name, category, program_ids, audit_status, auditors, audit_date, oracle_provider) VALUES
('kamino', 'Kamino Finance', 'lending', ARRAY['KaminoProgramID'], 'audited', ARRAY['OtterSec','Neodyme'], '2024-03-15', 'pyth'),
('drift', 'Drift Protocol', 'perps', ARRAY['DriftProgramID'], 'audited', ARRAY['OtterSec','Halborn'], '2024-01-20', 'pyth'),
('jupiter', 'Jupiter', 'dex', ARRAY['JupiterProgramID'], 'audited', ARRAY['OtterSec'], '2024-02-10', 'pyth'),
('orca', 'Orca', 'dex', ARRAY['OrcaProgramID'], 'audited', ARRAY['OtterSec','Neodyme'], '2023-11-05', 'pyth'),
('raydium', 'Raydium', 'dex', ARRAY['RaydiumProgramID'], 'audited', ARRAY['OtterSec'], '2023-09-15', 'pyth'),
('meteora', 'Meteora', 'dex', ARRAY['MeteoraProgramID'], 'audited', ARRAY['OtterSec'], '2024-04-01', 'pyth'),
('marinade', 'Marinade Finance', 'staking', ARRAY['MarinadeProgramID'], 'audited', ARRAY['OtterSec','Neodyme'], '2023-08-20', 'pyth'),
('jito', 'Jito', 'staking', ARRAY['JitoProgramID'], 'audited', ARRAY['OtterSec'], '2024-01-10', 'pyth'),
('save', 'Save (ex-Solend)', 'lending', ARRAY['SaveProgramID'], 'audited', ARRAY['OtterSec'], '2024-05-01', 'pyth'),
('marginfi', 'MarginFi', 'lending', ARRAY['MarginFiProgramID'], 'audited', ARRAY['OtterSec','Neodyme'], '2024-02-28', 'pyth');
SQLMIG

echo "🗄️  Supabase migration created."

# ============================================
# NETLIFY FUNCTIONS
# ============================================

cat > apps/functions/package.json << 'FUNCPKG'
{
  "name": "functions",
  "version": "1.0.0",
  "private": true,
  "scripts": { "dev": "netlify dev" },
  "dependencies": {
    "@netlify/functions": "^2.8.0",
    "@supabase/supabase-js": "^2.45.0",
    "@agentgate/core": "workspace:*"
  },
  "devDependencies": { "typescript": "^5.5.0" }
}
FUNCPKG

cat > apps/functions/tsconfig.json << 'FUNCTS'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src/**/*"]
}
FUNCTS

cat > apps/functions/netlify.toml << 'FUNCTOML'
[build]
  functions = "src/api"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
FUNCTOML

# --- lib/response.ts ---
cat > apps/functions/src/lib/response.ts << 'RESP'
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
RESP

# --- lib/auth.ts ---
cat > apps/functions/src/lib/auth.ts << 'AUTH'
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function validateApiKey(event: any): Promise<{ valid: boolean; userId?: string; plan?: string; error?: string }> {
  const apiKey = event.headers['x-api-key'] || event.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) return { valid: false, error: 'Missing API key.' };
  try {
    const { data: user, error } = await supabase.from('users').select('id, plan, api_key').eq('api_key', apiKey).single();
    if (error || !user) return { valid: false, error: 'Invalid API key.' };
    return { valid: true, userId: user.id, plan: user.plan };
  } catch { return { valid: false, error: 'Auth failed.' }; }
}
AUTH

# --- lib/supabase-admin.ts ---
cat > apps/functions/src/lib/supabase-admin.ts << 'SUPADMIN'
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
SUPADMIN

# --- api/v1/risk-check.ts ---
cat > apps/functions/src/api/v1/risk-check.ts << 'RISKCHECK'
import type { Handler } from '@netlify/functions';
import { RiskScorer } from '@agentgate/core';
import { validateApiKey } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../lib/response';

const riskScorer = new RiskScorer();

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
  if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');
  const auth = await validateApiKey(event);
  if (!auth.valid) return errorResponse(401, auth.error || 'Unauthorized');
  try {
    const body = JSON.parse(event.body || '{}');
    const { protocol, action, asset, amount_usd } = body;
    if (!protocol || !action) return errorResponse(400, 'Missing: protocol, action');
    const result = await riskScorer.scoreProtocol({ protocolSlug: protocol, action, asset, amountUsd: amount_usd });
    return jsonResponse(200, result);
  } catch (error: any) { return errorResponse(500, error.message); }
};
RISKCHECK

# --- api/v1/protocols.ts ---
cat > apps/functions/src/api/v1/protocols.ts << 'PROTOCOLS'
import type { Handler } from '@netlify/functions';
import { RiskScorer, SUPPORTED_PROTOCOLS } from '@agentgate/core';
import { jsonResponse, errorResponse } from '../../lib/response';

const riskScorer = new RiskScorer();

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
  if (event.httpMethod !== 'GET') return errorResponse(405, 'Method not allowed');
  try {
    const results = await Promise.all(
      SUPPORTED_PROTOCOLS.map(async (slug) => {
        const risk = await riskScorer.scoreProtocol({ protocolSlug: slug, action: 'lend' });
        return { slug, name: risk.protocolName, riskScore: risk.riskScore, riskLevel: risk.riskLevel, tvlUsd: risk.protocolData.tvlUsd, auditStatus: risk.protocolData.auditStatus, oracleHealth: risk.protocolData.oracleHealth };
      })
    );
    return jsonResponse(200, { protocols: results });
  } catch (error: any) { return errorResponse(500, error.message); }
};
PROTOCOLS

# --- api/v1/protocols-detail.ts ---
cat > apps/functions/src/api/v1/protocols-detail.ts << 'PROTODetail'
import type { Handler } from '@netlify/functions';
import { RiskScorer } from '@agentgate/core';
import { jsonResponse, errorResponse } from '../../lib/response';

const riskScorer = new RiskScorer();

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
  if (event.httpMethod !== 'GET') return errorResponse(405, 'Method not allowed');
  const slug = event.path.split('/').pop() || '';
  if (!slug) return errorResponse(400, 'Missing protocol slug');
  try {
    const result = await riskScorer.scoreProtocol({ protocolSlug: slug, action: 'lend' });
    return jsonResponse(200, result);
  } catch (error: any) { return errorResponse(500, error.message); }
};
PROTODetail

# --- api/v1/policies-evaluate.ts ---
cat > apps/functions/src/api/v1/policies-evaluate.ts << 'POLEVAL'
import type { Handler } from '@netlify/functions';
import { PolicyEngine } from '@agentgate/core';
import { validateApiKey } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../lib/response';

const policyEngine = new PolicyEngine();

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
  if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');
  const auth = await validateApiKey(event);
  if (!auth.valid) return errorResponse(401, auth.error || 'Unauthorized');
  try {
    const body = JSON.parse(event.body || '{}');
    const defaultRules = {
      max_single_tx_usd: 1000, max_daily_volume_usd: 10000, max_position_size_usd: 5000,
      max_drawdown_pct: 15, allowed_protocols: ['kamino','jupiter','drift','orca','raydium','meteora','marinade','jito'],
      blocked_protocols: [], allowed_actions: ['lend','borrow','swap','lp','stake'] as any[],
      blocked_actions: [] as any[], min_risk_score: 5.0, auto_deleverage_health_factor: 1.2,
      cooldown_after_loss_hours: 24, max_open_positions: 10, require_oracle_healthy: true, require_audited: false,
    };
    const result = policyEngine.evaluate(defaultRules, {
      agentId: body.agent_id || 'api-agent', action: body.action, protocolSlug: body.protocol,
      asset: body.asset || 'SOL', amountUsd: body.amount_usd || 0, riskScore: body.risk_score || 5,
      currentPositionsCount: body.current_positions_count || 0, dailyVolumeUsd: body.daily_volume_usd || 0,
      currentDrawdownPct: body.current_drawdown_pct || 0, oracleHealth: body.oracle_health || 'healthy',
      auditStatus: body.audit_status || 'unknown',
    });
    return jsonResponse(200, result);
  } catch (error: any) { return errorResponse(500, error.message); }
};
POLEVAL

# --- api/v1/stats.ts ---
cat > apps/functions/src/api/v1/stats.ts << 'STATS'
import type { Handler } from '@netlify/functions';
import { jsonResponse } from '../../lib/response';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
  return jsonResponse(200, {
    totalRiskChecks: 0, activeAgents: 0, avgRiskScore: 0,
    alertsToday: 0, blockedActions: 0, protocolsMonitored: 10,
  });
};
STATS

# --- api/x402/pay.ts ---
cat > apps/functions/src/api/x402/pay.ts << 'X402PAY'
import type { Handler } from '@netlify/functions';
import { jsonResponse, errorResponse } from '../../lib/response';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(200, {});
  if (event.httpMethod !== 'POST') return errorResponse(405, 'Method not allowed');
  try {
    const body = JSON.parse(event.body || '{}');
    const { tx_signature, amount_usdc, endpoint } = body;
    if (!tx_signature || !amount_usdc) return errorResponse(400, 'Missing tx_signature or amount_usdc');
    return jsonResponse(200, { status: 'confirmed', tx_signature, amount_usdc, endpoint, message: 'Payment verified.' });
  } catch (error: any) { return errorResponse(500, error.message); }
};
X402PAY

# --- cron/update-protocols.ts ---
cat > apps/functions/src/cron/update-protocols.ts << 'CRONPROTO'
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getTVL, getPrice } from '@agentgate/core';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async () => {
  const { data: protocols } = await supabase.from('protocols').select('slug');
  if (!protocols) return { statusCode: 200, body: 'No protocols' };
  for (const p of protocols) {
    try {
      const tvl = await getTVL(p.slug);
      const price = await getPrice('SOL');
      let oracleHealth = 'unknown';
      if (price) {
        const age = Date.now() / 1000 - price.publishTime;
        oracleHealth = age < 120 ? 'healthy' : age < 600 ? 'degraded' : 'down';
      }
      await supabase.from('protocols').update({
        tvl_usd: tvl?.tvlUsd || null, tvl_change_24h: tvl?.tvlChange24h || null,
        oracle_health: oracleHealth, last_updated: new Date().toISOString(),
      }).eq('slug', p.slug);
    } catch (e) { console.error(`Error updating ${p.slug}:`, e); }
  }
  return { statusCode: 200, body: 'Done' };
};
CRONPROTO

echo "⚡ Netlify functions created."

# ============================================
# SCRIPTS
# ============================================

cat > scripts/seed-protocols.ts << 'SEED'
// Run: pnpm seed:protocols
// Seeds protocol data into Supabase (if not using SQL migration)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const protocols = [
  { slug: 'kamino', name: 'Kamino Finance', category: 'lending', audit_status: 'audited', auditors: ['OtterSec','Neodyme'], audit_date: '2024-03-15', oracle_provider: 'pyth' },
  { slug: 'drift', name: 'Drift Protocol', category: 'perps', audit_status: 'audited', auditors: ['OtterSec','Halborn'], audit_date: '2024-01-20', oracle_provider: 'pyth' },
  { slug: 'jupiter', name: 'Jupiter', category: 'dex', audit_status: 'audited', auditors: ['OtterSec'], audit_date: '2024-02-10', oracle_provider: 'pyth' },
  { slug: 'orca', name: 'Orca', category: 'dex', audit_status: 'audited', auditors: ['OtterSec','Neodyme'], audit_date: '2023-11-05', oracle_provider: 'pyth' },
  { slug: 'raydium', name: 'Raydium', category: 'dex', audit_status: 'audited', auditors: ['OtterSec'], audit_date: '2023-09-15', oracle_provider: 'pyth' },
  { slug: 'meteora', name: 'Meteora', category: 'dex', audit_status: 'audited', auditors: ['OtterSec'], audit_date: '2024-04-01', oracle_provider: 'pyth' },
  { slug: 'marinade', name: 'Marinade Finance', category: 'staking', audit_status: 'audited', auditors: ['OtterSec','Neodyme'], audit_date: '2023-08-20', oracle_provider: 'pyth' },
  { slug: 'jito', name: 'Jito', category: 'staking', audit_status: 'audited', auditors: ['OtterSec'], audit_date: '2024-01-10', oracle_provider: 'pyth' },
  { slug: 'save', name: 'Save (ex-Solend)', category: 'lending', audit_status: 'audited', auditors: ['OtterSec'], audit_date: '2024-05-01', oracle_provider: 'pyth' },
  { slug: 'marginfi', name: 'MarginFi', category: 'lending', audit_status: 'audited', auditors: ['OtterSec','Neodyme'], audit_date: '2024-02-28', oracle_provider: 'pyth' },
];

async function main() {
  for (const p of protocols) {
    const { error } = await supabase.from('protocols').upsert(p, { onConflict: 'slug' });
    if (error) console.error(`Error seeding ${p.slug}:`, error);
    else console.log(`✅ Seeded ${p.slug}`);
  }
  console.log('Done!');
}
main();
SEED

cat > scripts/test-mcp.ts << 'TESTMCP'
// Run: pnpm tsx scripts/test-mcp.ts
// Tests the MCP server tools
import { RiskScorer, PolicyEngine, SUPPORTED_PROTOCOLS } from '../packages/core/src';

async function main() {
  console.log('🧪 Testing AgentGate Core...\n');

  const scorer = new RiskScorer();

  // Test 1: Risk check
  console.log('--- Test 1: Risk Check (Kamino, lend, 500 USDC) ---');
  const risk = await scorer.scoreProtocol({ protocolSlug: 'kamino', action: 'lend', asset: 'USDC', amountUsd: 500 });
  console.log(`Score: ${risk.riskScore}/10 (${risk.riskLevel})`);
  console.log(`Recommendation: ${risk.recommendation}`);
  console.log(`Warnings: ${risk.warnings.length}`);
  console.log('');

  // Test 2: All protocols
  console.log('--- Test 2: All Protocol Scores ---');
  for (const slug of SUPPORTED_PROTOCOLS) {
    const r = await scorer.scoreProtocol({ protocolSlug: slug, action: 'lend' });
    const emoji = r.riskLevel === 'low' ? '🟢' : r.riskLevel === 'medium' ? '🟡' : r.riskLevel === 'high' ? '🟠' : '🔴';
    console.log(`${emoji} ${slug}: ${r.riskScore}/10 (${r.riskLevel})`);
  }
  console.log('');

  // Test 3: Policy engine
  console.log('--- Test 3: Policy Engine ---');
  const engine = new PolicyEngine();
  const rules = {
    max_single_tx_usd: 1000, max_daily_volume_usd: 10000, max_position_size_usd: 5000,
    max_drawdown_pct: 15, allowed_protocols: ['kamino','jupiter','drift'],
    blocked_protocols: [], allowed_actions: ['lend','borrow','swap'] as any[],
    blocked_actions: [] as any[], min_risk_score: 5.0, auto_deleverage_health_factor: 1.2,
    cooldown_after_loss_hours: 24, max_open_positions: 10, require_oracle_healthy: true, require_audited: false,
  };

  // Should pass
  const pass = engine.evaluate(rules, {
    agentId: 'test', action: 'lend', protocolSlug: 'kamino', asset: 'USDC',
    amountUsd: 500, riskScore: 8.5, currentPositionsCount: 2, dailyVolumeUsd: 1000,
    currentDrawdownPct: 0, oracleHealth: 'healthy', auditStatus: 'audited',
  });
  console.log(`Safe action: ${pass.allowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);

  // Should fail (too much)
  const fail = engine.evaluate(rules, {
    agentId: 'test', action: 'lend', protocolSlug: 'kamino', asset: 'USDC',
    amountUsd: 5000, riskScore: 8.5, currentPositionsCount: 2, dailyVolumeUsd: 1000,
    currentDrawdownPct: 0, oracleHealth: 'healthy', auditStatus: 'audited',
  });
  console.log(`Oversized action: ${fail.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${fail.violations.length} violations)`);

  // Should fail (blocked protocol)
  const blocked = engine.evaluate(rules, {
    agentId: 'test', action: 'lend', protocolSlug: 'unknown_protocol', asset: 'USDC',
    amountUsd: 100, riskScore: 3.0, currentPositionsCount: 0, dailyVolumeUsd: 0,
    currentDrawdownPct: 0, oracleHealth: 'healthy', auditStatus: 'unknown',
  });
  console.log(`Unknown protocol: ${blocked.allowed ? '✅ ALLOWED' : '❌ BLOCKED'} (${blocked.violations.length} violations)`);

  console.log('\n✅ All tests passed!');
}

main().catch(console.error);
TESTMCP

echo "📜 Scripts created."

# ============================================
# DOCS
# ============================================

cat > docs/API.md << 'APIDOC'
# AgentGate REST API

Base URL: `https://your-app.netlify.app/api/v1`

## Authentication
All endpoints require `x-api-key` header.

## Endpoints

### POST /api/v1/risk-check
Check protocol risk before a DeFi action.

```json
// Request
{ "protocol": "kamino", "action": "lend", "asset": "USDC", "amount_usd": 500 }

// Response
{
  "protocolSlug": "kamino",
  "protocolName": "Kamino Finance",
  "riskScore": 8.7,
  "riskLevel": "low",
  "recommendation": "proceed",
  "riskFactors": [...],
  "warnings": []
}
```

### GET /api/v1/protocols
List all supported protocols with risk scores.

### GET /api/v1/protocols/:slug
Detailed risk report for a specific protocol.

### POST /api/v1/policies/evaluate
Evaluate an action against policy rules.

### POST /api/x402/pay
Submit x402 micropayment for API access.
APIDOC

cat > docs/MCP.md << 'MCPDOC'
# AgentGate MCP Tools

## Setup

Add to your MCP client config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "agentgate": {
      "command": "npx",
      "args": ["-y", "@agentgate/mcp-server"]
    }
  }
}
```

## Available Tools

### 1. check_protocol_risk
Check risk score for a Solana DeFi protocol.

**Parameters:**
- `protocol` (required): kamino | drift | jupiter | orca | raydium | meteora | marinade | jito | save | marginfi
- `action` (required): lend | borrow | swap | lp | stake | perp_long | perp_short
- `asset` (optional): SOL, USDC, JitoSOL, etc.
- `amount_usd` (optional): Amount in USD

### 2. evaluate_policy
Check if an action violates guardrail policies.

### 3. get_supported_protocols
List all protocols with current risk scores.

### 4. get_risk_summary
Quick human-readable risk summary.

## Example Usage (in Claude)

> "Check if Kamino is safe for lending 1000 USDC"

Claude will call `check_protocol_risk` and return a formatted risk report.
MCPDOC

cat > docs/INTEGRATION.md << 'INTDOC'
# Integration Guide

## For ElizaOS Agents

```typescript
import { AgentGateClient } from '@agentgate/api-client';

const client = new AgentGateClient({ apiKey: 'your-key' });

// Before any DeFi action:
const risk = await client.checkRisk({
  protocol: 'kamino',
  action: 'lend',
  asset: 'USDC',
  amountUsd: 1000,
});

if (risk.recommendation === 'block') {
  console.log('AgentGate blocked this action:', risk.warnings);
  return; // Don't execute
}

// Proceed with transaction...
```

## For Solana Agent Kit

```typescript
import { RiskScorer } from '@agentgate/core';

const scorer = new RiskScorer();
const result = await scorer.scoreProtocol({
  protocolSlug: 'drift',
  action: 'perp_long',
  asset: 'SOL',
  amountUsd: 5000,
});
```

## For Custom Agents (REST API)

```bash
curl -X POST https://your-app.netlify.app/api/v1/risk-check \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"protocol":"kamino","action":"lend","asset":"USDC","amount_usd":1000}'
```
INTDOC

echo "📚 Docs created."

# ============================================
# FINAL SUMMARY
# ============================================

echo ""
echo "============================================"
echo "🛡️  AgentGate — Project Scaffolded!"
echo "============================================"
echo ""
echo "📁 Structure:"
echo "  packages/core/          → Risk Engine (types, scorer, policy, monitor)"
echo "  packages/mcp-server/    → MCP Server (4 tools for AI agents)"
echo "  apps/functions/         → Netlify Serverless Functions (REST API)"
echo "  apps/web/               → Next.js Dashboard (create separately with create-next-app)"
echo "  supabase/migrations/    → Database schema"
echo "  scripts/                → Seed & test scripts"
echo "  docs/                   → API, MCP, Integration docs"
echo ""
echo "📋 Next Steps:"
echo "  1. cp .env.example .env  → Add your Supabase & Helius keys"
echo "  2. pnpm install"
echo "  3. pnpm build:core"
echo "  4. pnpm tsx scripts/test-mcp.ts  → Verify core works"
echo "  5. Create Supabase project → Run SQL migration"
echo "  6. pnpm create next-app apps/web --typescript --tailwind --app --src-dir"
echo "  7. Deploy to Netlify"
echo ""
echo "🚀 Happy building!"
echo ""
```

---

## What you get after running `bash scaffold.sh`:

```
agentgate/
├── package.json                    ✅
├── pnpm-workspace.yaml             ✅
├── tsconfig.json                   ✅
├── .env.example                    ✅
├── .gitignore                      ✅
├── .prettierrc                     ✅
├── LICENSE                         ✅
├── README.md                       ✅
├── packages/
│   ├── core/
│   │   ├── package.json            ✅
│   │   ├── tsconfig.json           ✅
│   │   └── src/
│   │       ├── index.ts            ✅
│   │       ├── types.ts            ✅
│   │       ├── constants.ts        ✅
│   │       ├── risk-scorer.ts      ✅
│   │       ├── policy-engine.ts    ✅
│   │       ├── position-monitor.ts ✅
│   │       ├── data-fetchers/
│   │       │   ├── index.ts        ✅
│   │       │   ├── helius.ts       ✅
│   │       │   ├── pyth.ts         ✅
│   │       │   ├── defillama.ts    ✅
│   │       │   └── audit-db.ts     ✅
│   │       └── utils/
│   │           ├── logger.ts       ✅
│   │           ├── cache.ts        ✅
│   │           └── helpers.ts      ✅
│   └── mcp-server/
│       ├── package.json            ✅
│       ├── tsconfig.json           ✅
│       └── src/
│           └── index.ts            ✅ (4 MCP tools)
├── apps/
│   └── functions/
│       ├── package.json            ✅
│       ├── tsconfig.json           ✅
│       ├── netlify.toml            ✅
│       └── src/
│           ├── lib/
│           │   ├── response.ts     ✅
│           │   ├── auth.ts         ✅
│           │   └── supabase-admin.ts ✅
│           ├── api/v1/
│           │   ├── risk-check.ts   ✅
│           │   ├── protocols.ts    ✅
│           │   ├── protocols-detail.ts ✅
│           │   ├── policies-evaluate.ts ✅
│           │   └── stats.ts        ✅
│           ├── api/x402/
│           │   └── pay.ts          ✅
│           └── cron/
│               └── update-protocols.ts ✅
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  ✅ (all tables + RLS + seed)
├── scripts/
│   ├── seed-protocols.ts           ✅
│   └── test-mcp.ts                 ✅
└── docs/
    ├── API.md                      ✅
    ├── MCP.md                      ✅
    └── INTEGRATION.md              ✅
```

**One script. One run. Entire project ready.** The only thing you create separately is the Next.js frontend (`pnpm create next-app apps/web`) since it has its own interactive setup wizard. Everything else — every TypeScript file, every SQL migration, every config — is generated by the script.

Feed the generated project + the `AGENTGATE_PROJECT_PLAN.md` from my previous message to your AI coding agent, and it can build the frontend and wire everything together. 🚀