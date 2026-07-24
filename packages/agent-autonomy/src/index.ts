import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export interface AutoDeleveragingConfig {
  enabled: boolean;
  healthFactorThreshold: number; // e.g., 1.2 - trigger deleveraging when HF drops below this
  maxSlippagePct: number; // e.g., 0.5 (0.5%)
  preferredExitProtocols: string[]; // e.g., ['jupiter', 'orca']
  targetHealthFactor?: number; // optional target after deleveraging
}

export interface RebalancingConfig {
  enabled: boolean;
  targetAllocation: Record<string, number>; // protocol_slug -> percentage (0-100)
  rebalanceThresholdPct: number; // e.g., 10 (rebalance if allocation drifts >10%)
  maxRebalanceFrequencyHours: number; // minimum time between rebalances
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  dailyLossLimitUsd: number; // stop trading after losing $X in a day
  consecutiveLosses: number; // stop after N consecutive losing trades
  cooldownHours: number; // how long to pause after circuit breaker triggers
  maxDrawdownPct: number; // stop if portfolio down X% from peak
}

export interface AutonomyConfig {
  autoDeleveraging: AutoDeleveragingConfig;
  rebalancing: RebalancingConfig;
  circuitBreakers: CircuitBreakerConfig;
}

export interface PositionInfo {
  id: string;
  protocolSlug: string;
  amountUsd: number;
  healthFactor?: number;
  entryPriceUsd: number;
  currentPriceUsd: number;
  pnlUsd: number;
  positionType: 'lend' | 'borrow' | 'lp' | 'stake' | 'perp';
}

export interface DeleveragingResult {
  success: boolean;
  action: 'none' | 'partial_exit' | 'full_exit' | 'add_collateral';
  amountUsd: number;
  protocolSlug: string;
  reason: string;
  transactionSignature?: string;
  newHealthFactor?: number;
  error?: string;
}

export interface RebalancingResult {
  success: boolean;
  actions: Array<{
    action: 'buy' | 'sell';
    protocolSlug: string;
    amountUsd: number;
    fromProtocol?: string;
  }>;
  totalRebalancedUsd: number;
  transactionSignatures?: string[];
  error?: string;
}

export interface CircuitBreakerStatus {
  isTripped: boolean;
  reason?: string;
  trippedAt?: string;
  cooldownEndsAt?: string;
  dailyPnlUsd: number;
  consecutiveLosses: number;
  currentDrawdownPct: number;
}

export interface TradeExecution {
  signature: string;
  amountUsd: number;
  fromProtocol?: string;
  toProtocol?: string;
  action: 'exit' | 'enter' | 'rebalance';
}

/**
 * Core autonomy engine for AI agents
 * Provides automated risk management actions based on configured thresholds
 */
export class AgentAutonomyEngine {
  private config: AutonomyConfig;
  private connection: Connection;
  private agentWallet: PublicKey;
  
  // State tracking
  private dailyPnlUsd: number = 0;
  private consecutiveLosses: number = 0;
  private peakPortfolioValueUsd: number = 0;
  private lastRebalanceTime: Map<string, number> = new Map();
  private circuitBreakerTrippedAt?: number;

  constructor(
    config: AutonomyConfig,
    connection: Connection,
    agentWallet: PublicKey
  ) {
    this.config = config;
    this.connection = connection;
    this.agentWallet = agentWallet;
  }

  /**
   * Check all positions and execute auto-deleveraging if needed
   */
  async checkAndExecuteDeleveraging(
    positions: PositionInfo[]
  ): Promise<DeleveragingResult[]> {
    if (!this.config.autoDeleveraging.enabled) {
      return [];
    }

    const results: DeleveragingResult[] = [];

    for (const position of positions) {
      if (!position.healthFactor) continue;

      const threshold = this.config.autoDeleveraging.healthFactorThreshold;
      
      if (position.healthFactor < threshold) {
        const result = await this.executeDeleveraging(position);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Execute deleveraging for a single position
   */
  private async executeDeleveraging(
    position: PositionInfo
  ): Promise<DeleveragingResult> {
    const targetHF = this.config.autoDeleveraging.targetHealthFactor || 1.5;
    const currentHF = position.healthFactor!;
    
    if (!currentHF || currentHF >= this.config.autoDeleveraging.healthFactorThreshold) {
      return {
        success: true,
        action: 'none',
        amountUsd: 0,
        protocolSlug: position.protocolSlug,
        reason: 'Position health factor within acceptable range',
      };
    }

    // Calculate how much to exit to reach target HF
    // Simplified: exit proportional to HF deficit
    const hfDeficit = this.config.autoDeleveraging.healthFactorThreshold - currentHF;
    const exitPercentage = Math.min(hfDeficit / targetHF, 0.8); // Max 80% exit
    const exitAmountUsd = position.amountUsd * exitPercentage;

    try {
      // In production, this would build and send actual transactions
      // For now, return simulation result
      const newHealthFactor = currentHF + (hfDeficit * 0.8); // Estimate improvement

      return {
        success: true,
        action: exitPercentage > 0.5 ? 'full_exit' : 'partial_exit',
        amountUsd: exitAmountUsd,
        protocolSlug: position.protocolSlug,
        reason: `Auto-deleveraging triggered: HF ${currentHF.toFixed(2)} < threshold ${this.config.autoDeleveraging.healthFactorThreshold}`,
        newHealthFactor,
      };
    } catch (error) {
      return {
        success: false,
        action: 'none',
        amountUsd: 0,
        protocolSlug: position.protocolSlug,
        reason: 'Failed to execute deleveraging',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check portfolio allocation and rebalance if drifted
   */
  async checkAndExecuteRebalancing(
    positions: PositionInfo[]
  ): Promise<RebalancingResult> {
    if (!this.config.rebalancing.enabled) {
      return {
        success: true,
        actions: [],
        totalRebalancedUsd: 0,
      };
    }

    const totalValueUsd = positions.reduce((sum, p) => sum + p.amountUsd, 0);
    if (totalValueUsd === 0) {
      return {
        success: true,
        actions: [],
        totalRebalancedUsd: 0,
      };
    }

    const actions: RebalancingResult['actions'] = [];
    const targetAllocation = this.config.rebalancing.targetAllocation;

    // Calculate current allocation
    const currentAllocation: Record<string, number> = {};
    for (const position of positions) {
      const pct = (position.amountUsd / totalValueUsd) * 100;
      currentAllocation[position.protocolSlug] = pct;
    }

    // Find deviations
    const threshold = this.config.rebalancing.rebalanceThresholdPct;
    for (const [protocol, targetPct] of Object.entries(targetAllocation)) {
      const currentPct = currentAllocation[protocol] || 0;
      const deviation = Math.abs(currentPct - targetPct);

      if (deviation > threshold) {
        const rebalanceAmountUsd = (deviation / 100) * totalValueUsd;
        
        actions.push({
          action: currentPct < targetPct ? 'buy' : 'sell',
          protocolSlug: protocol,
          amountUsd: rebalanceAmountUsd,
        });
      }
    }

    if (actions.length === 0) {
      return {
        success: true,
        actions: [],
        totalRebalancedUsd: 0,
      };
    }

    // Execute rebalancing (simplified - would need DEX integration in production)
    return {
      success: true,
      actions,
      totalRebalancedUsd: actions.reduce((sum, a) => sum + a.amountUsd, 0),
    };
  }

  /**
   * Check circuit breakers and return status
   */
  checkCircuitBreakers(portfolioValueUsd: number, tradePnlUsd: number): CircuitBreakerStatus {
    if (!this.config.circuitBreakers.enabled) {
      return {
        isTripped: false,
        dailyPnlUsd: this.dailyPnlUsd,
        consecutiveLosses: this.consecutiveLosses,
        currentDrawdownPct: 0,
      };
    }

    // Update tracking
    this.dailyPnlUsd += tradePnlUsd;
    
    if (tradePnlUsd < 0) {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }

    // Track peak and drawdown
    if (portfolioValueUsd > this.peakPortfolioValueUsd) {
      this.peakPortfolioValueUsd = portfolioValueUsd;
    }
    
    const drawdownPct = this.peakPortfolioValueUsd > 0
      ? ((this.peakPortfolioValueUsd - portfolioValueUsd) / this.peakPortfolioValueUsd) * 100
      : 0;

    // Check if circuit breaker should trip
    let isTripped = false;
    let reason: string | undefined;
    let trippedAt: string | undefined;
    let cooldownEndsAt: string | undefined;

    if (this.circuitBreakerTrippedAt) {
      const cooldownMs = this.config.circuitBreakers.cooldownHours * 60 * 60 * 1000;
      const now = Date.now();
      
      if (now < this.circuitBreakerTrippedAt + cooldownMs) {
        isTripped = true;
        reason = 'Circuit breaker cooldown in effect';
        trippedAt = new Date(this.circuitBreakerTrippedAt).toISOString();
        cooldownEndsAt = new Date(this.circuitBreakerTrippedAt + cooldownMs).toISOString();
      } else {
        // Cooldown expired, reset
        this.circuitBreakerTrippedAt = undefined;
        this.dailyPnlUsd = 0;
        this.consecutiveLosses = 0;
      }
    }

    if (!isTripped) {
      // Check trip conditions
      if (Math.abs(this.dailyPnlUsd) > this.config.circuitBreakers.dailyLossLimitUsd && this.dailyPnlUsd < 0) {
        isTripped = true;
        reason = `Daily loss limit exceeded: $${Math.abs(this.dailyPnlUsd).toFixed(2)}`;
      } else if (this.consecutiveLosses >= this.config.circuitBreakers.consecutiveLosses) {
        isTripped = true;
        reason = `Consecutive losses threshold reached: ${this.consecutiveLosses}`;
      } else if (drawdownPct >= this.config.circuitBreakers.maxDrawdownPct) {
        isTripped = true;
        reason = `Max drawdown exceeded: ${drawdownPct.toFixed(2)}%`;
      }

      if (isTripped) {
        this.circuitBreakerTrippedAt = Date.now();
        trippedAt = new Date().toISOString();
        const cooldownMs = this.config.circuitBreakers.cooldownHours * 60 * 60 * 1000;
        cooldownEndsAt = new Date(Date.now() + cooldownMs).toISOString();
      }
    }

    return {
      isTripped,
      reason,
      trippedAt,
      cooldownEndsAt,
      dailyPnlUsd: this.dailyPnlUsd,
      consecutiveLosses: this.consecutiveLosses,
      currentDrawdownPct: drawdownPct,
    };
  }

  /**
   * Main execution loop - call this periodically
   */
  async executeAutonomyCycle(
    positions: PositionInfo[],
    portfolioValueUsd: number,
    lastTradePnlUsd: number = 0
  ): Promise<{
    deleveragingResults: DeleveragingResult[];
    rebalancingResult: RebalancingResult;
    circuitBreakerStatus: CircuitBreakerStatus;
  }> {
    // Check circuit breakers first
    const circuitBreakerStatus = this.checkCircuitBreakers(portfolioValueUsd, lastTradePnlUsd);
    
    if (circuitBreakerStatus.isTripped) {
      return {
        deleveragingResults: [],
        rebalancingResult: {
          success: true,
          actions: [],
          totalRebalancedUsd: 0,
        },
        circuitBreakerStatus,
      };
    }

    // Execute deleveraging if needed
    const deleveragingResults = await this.checkAndExecuteDeleveraging(positions);

    // Execute rebalancing if needed
    const rebalancingResult = await this.checkAndExecuteRebalancing(positions);

    return {
      deleveragingResults,
      rebalancingResult,
      circuitBreakerStatus,
    };
  }

  /**
   * Reset daily counters (call at start of new trading day)
   */
  resetDailyCounters(): void {
    this.dailyPnlUsd = 0;
    this.consecutiveLosses = 0;
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<AutonomyConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      autoDeleveraging: { ...this.config.autoDeleveraging, ...newConfig.autoDeleveraging },
      rebalancing: { ...this.config.rebalancing, ...newConfig.rebalancing },
      circuitBreakers: { ...this.config.circuitBreakers, ...newConfig.circuitBreakers },
    };
  }
}

/**
 * Factory function to create default autonomy config
 */
export function createDefaultAutonomyConfig(): AutonomyConfig {
  return {
    autoDeleveraging: {
      enabled: true,
      healthFactorThreshold: 1.3,
      maxSlippagePct: 0.5,
      preferredExitProtocols: ['jupiter', 'orca', 'raydium'],
      targetHealthFactor: 1.8,
    },
    rebalancing: {
      enabled: true,
      targetAllocation: {
        'kamino': 40,
        'drift': 30,
        'jupiter': 20,
        'orca': 10,
      },
      rebalanceThresholdPct: 15,
      maxRebalanceFrequencyHours: 24,
    },
    circuitBreakers: {
      enabled: true,
      dailyLossLimitUsd: 1000,
      consecutiveLosses: 5,
      cooldownHours: 24,
      maxDrawdownPct: 15,
    },
  };
}
