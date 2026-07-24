import { SolSentryClient } from '../../sdk/src/index';

export interface SolSentryAgentKitOptions {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Solana Agent Kit (ai16z) plugin integration for SolSentry.
 * Provides pre-flight risk checks, transaction simulation, and policy evaluation.
 */
export class SolSentryAgentKitPlugin {
  private client: SolSentryClient;

  constructor(options: SolSentryAgentKitOptions = {}) {
    this.client = new SolSentryClient({
      apiKey: options.apiKey || process.env.SOLSENTRY_API_KEY,
      baseUrl: options.baseUrl || 'https://solsentry.io',
    });
  }

  /**
   * Action tool: Check risk score for a protocol before executing trades
   */
  async checkProtocolRiskTool(protocolSlug: string) {
    const risk = await this.client.checkProtocolRisk(protocolSlug);
    return {
      success: true,
      protocol: protocolSlug,
      score: risk.safetyScore,
      tier: risk.riskTier,
      recommendation: risk.recommendation,
      agentDecision: risk.agentDecision,
    };
  }

  /**
   * Action tool: Simulate a transaction payload to catch drainers before signing
   */
  async simulateTransactionTool(base58Tx: string) {
    const sim = await this.client.simulateTransaction({ transaction: base58Tx });
    return {
      success: sim.status === 'SUCCESS',
      unitsConsumed: sim.unitsConsumed,
      isDrainer: sim.drainerScan.isDrainerPattern,
      riskLevel: sim.drainerScan.riskLevel,
      warnings: sim.drainerScan.warnings,
      netTokenDeltas: sim.netTokenDeltas,
    };
  }

  /**
   * Action tool: Evaluate trade policy parameters before placing order
   */
  async evaluateTradePolicyTool(action: string, protocolSlug: string, amountUsd: number) {
    const policy = await this.client.evaluatePolicy({
      action: action as any,
      protocolSlug,
      amountUsd,
    });
    return {
      allowed: policy.decision === 'PROCEED',
      decision: policy.decision,
      maxAllowedUsd: policy.maxAllowedUsd,
      reasons: policy.blockingReasons,
    };
  }
}
