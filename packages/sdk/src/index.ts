export interface SolSentryClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface RiskCheckResponse {
  slug: string;
  name: string;
  category: string;
  safetyScore: number;
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'proceed' | 'caution' | 'do_not_proceed';
  confidence: number;
  factors: Array<{ key: string; name: string; score: number; details?: string }>;
  topDrivers: string[];
  whatWouldFlip: string[];
  agentDecision: 'PROCEED' | 'CAUTION' | 'DO_NOT_PROCEED';
  tvlUsd: number | null;
  modelVersion: string;
  dataAsOf: string;
}

export interface PolicyEvalRequest {
  action: 'swap' | 'lend' | 'borrow' | 'lp' | 'stake' | 'perp_long' | 'perp_short' | 'buy_bonding_curve';
  protocolSlug: string;
  amountUsd: number;
  currentDailyVolumeUsd?: number;
  currentDrawdownPct?: number;
  openPositionsCount?: number;
}

export interface PolicyEvalResponse {
  decision: 'PROCEED' | 'DO_NOT_PROCEED';
  maxAllowedUsd: number;
  blockingReasons: string[];
  saferAlternatives: string[];
}

export interface SimulateTxRequest {
  transaction: string;
  encoding?: 'base58' | 'base64';
}

export interface SimulateTxResponse {
  success: boolean;
  status: 'SUCCESS' | 'SIMULATION_ERROR' | 'INVALID_TRANSACTION';
  unitsConsumed: number;
  highComputeWarning: boolean;
  netTokenDeltas: Array<{
    account: string;
    mint: string;
    tokenSymbol?: string;
    preAmount: number;
    postAmount: number;
    delta: number;
  }>;
  drainerScan: {
    isDrainerPattern: boolean;
    riskLevel: string;
    scorePenalty: number;
    warnings: string[];
  };
  logs: string[];
}

export class SolSentryClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(opts: SolSentryClientOptions = {}) {
    this.baseUrl = (opts.baseUrl || 'https://solsentry.io').replace(/\/$/, '');
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs || 5000;
  }

  private async fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['X-SolSentry-API-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, { ...init, headers, signal: controller.signal });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(`SolSentry API HTTP ${res.status}: ${errorText || res.statusText}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async checkProtocolRisk(protocolSlug: string): Promise<RiskCheckResponse> {
    return this.fetchJson<RiskCheckResponse>('/api/v1/risk-check', {
      method: 'POST',
      body: JSON.stringify({ protocolSlug }),
    });
  }

  async evaluatePolicy(params: PolicyEvalRequest): Promise<PolicyEvalResponse> {
    return this.mcpCall<PolicyEvalResponse>('solsentry_evaluate_policy', params);
  }

  async preflight(params: PolicyEvalRequest): Promise<PolicyEvalResponse> {
    return this.mcpCall<PolicyEvalResponse>('solsentry_preflight', params);
  }

  async simulateTransaction(params: SimulateTxRequest): Promise<SimulateTxResponse> {
    return this.fetchJson<SimulateTxResponse>('/api/v1/simulate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async mcpCall<T = any>(name: string, args: Record<string, any>): Promise<T> {
    const res = await this.fetchJson<any>('/api/v1/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    });

    if (res?.error) {
      throw new Error(`MCP Error ${res.error.code}: ${res.error.message}`);
    }
    return (res?.result?.structuredContent || res?.result?.content?.[0]?.text) as T;
  }
}
