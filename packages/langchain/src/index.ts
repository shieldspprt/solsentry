import { SolSentryClient } from '../../sdk/src/index';

export interface SolSentryToolConfig {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * SolSentry LangChain / CrewAI Structured Tool for Protocol Risk Check
 */
export class SolSentryRiskCheckTool {
  name = 'solsentry_risk_check';
  description = 'Queries SolSentry institutional risk model (0-10 score, risk tier, agent decision) for a Solana protocol.';
  private client: SolSentryClient;

  constructor(config: SolSentryToolConfig = {}) {
    this.client = new SolSentryClient({
      apiKey: config.apiKey || process.env.SOLSENTRY_API_KEY,
      baseUrl: config.baseUrl || 'https://solsentry.io',
    });
  }

  async _call(protocolSlug: string): Promise<string> {
    const res = await this.client.checkProtocolRisk(protocolSlug);
    return JSON.stringify({
      protocol: protocolSlug,
      safetyScore: res.safetyScore,
      riskTier: res.riskTier,
      recommendation: res.recommendation,
      agentDecision: res.agentDecision,
    });
  }
}

/**
 * SolSentry LangChain / CrewAI Structured Tool for Transaction Simulation
 */
export class SolSentrySimulateTool {
  name = 'solsentry_simulate_tx';
  description = 'Simulates a raw base58 Solana transaction before signing to detect wallet drainers, token balance deltas, and CU usage.';
  private client: SolSentryClient;

  constructor(config: SolSentryToolConfig = {}) {
    this.client = new SolSentryClient({
      apiKey: config.apiKey || process.env.SOLSENTRY_API_KEY,
      baseUrl: config.baseUrl || 'https://solsentry.io',
    });
  }

  async _call(transactionBase58: string): Promise<string> {
    const res = await this.client.simulateTransaction({ transaction: transactionBase58 });
    return JSON.stringify({
      status: res.status,
      unitsConsumed: res.unitsConsumed,
      drainerScan: res.drainerScan,
      netTokenDeltas: res.netTokenDeltas,
    });
  }
}
