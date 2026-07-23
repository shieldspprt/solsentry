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
    factors: Array<{
        key: string;
        name: string;
        score: number;
        details?: string;
    }>;
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
export declare class SolSentryClient {
    private baseUrl;
    private apiKey?;
    private timeoutMs;
    constructor(opts?: SolSentryClientOptions);
    private fetchJson;
    checkProtocolRisk(protocolSlug: string): Promise<RiskCheckResponse>;
    evaluatePolicy(params: PolicyEvalRequest): Promise<PolicyEvalResponse>;
    preflight(params: PolicyEvalRequest): Promise<PolicyEvalResponse>;
    simulateTransaction(params: SimulateTxRequest): Promise<SimulateTxResponse>;
    mcpCall<T = any>(name: string, args: Record<string, any>): Promise<T>;
}
