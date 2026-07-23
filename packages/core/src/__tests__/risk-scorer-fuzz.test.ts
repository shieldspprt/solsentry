import { describe, it, expect } from 'vitest';
import { computeProtocolRisk } from '../risk-scorer';
import { InstitutionalRiskMetrics } from '../../../../lib/types';

function generateRandomMetrics(seed: number): InstitutionalRiskMetrics {
  const pseudoRand = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };

  return {
    bot_density_pct: pseudoRand(1) * 120 - 10,
    mev_sandwich_risk_score: pseudoRand(2) * 15 - 2,
    whale_concentration_pct: pseudoRand(3) * 150 - 20,
    liquidation_cascade_risk_usd: pseudoRand(4) * 100_000_000,
    near_liquidation_ratio_pct: pseudoRand(5) * 100,
    oracle_slot_lag_ms: pseudoRand(6) * 10000,
    lst_depeg_deviation_pct: pseudoRand(7) * 20,
    upgradeability_timelock_hours: pseudoRand(8) * 200,
    has_pause_circuit_breaker: pseudoRand(9) > 0.5,
    unique_active_wallets_24h: Math.floor(pseudoRand(10) * 1_000_000),
    liquidated_usd_24h: pseudoRand(11) * 50_000_000,
    web_community: {
      monthly_web_visits: Math.floor(pseudoRand(12) * 10_000_000),
      domain_trust_score: Math.floor(pseudoRand(13) * 100),
      social_sentiment_score: Math.floor(pseudoRand(14) * 100),
      developer_commits_30d: Math.floor(pseudoRand(15) * 500),
      active_devs_count: Math.floor(pseudoRand(16) * 50),
    },
  };
}

describe('Property-Based Fuzz Testing for Risk Scorer', () => {
  it('should guarantee composite score is strictly bounded in [0, 10] across 1000 random inputs', () => {
    for (let i = 0; i < 1000; i++) {
      const metrics = generateRandomMetrics(i);
      const res = computeProtocolRisk({
        slug: 'kamino',
        name: 'Kamino Finance',
        category: 'lending',
        program_ids: ['675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'],
        tvl_usd: 500_000_000,
        tvl_change_24h: 2.5,
        audit_status: i % 2 === 0 ? 'audited' : 'unaudited',
        auditors: ['OtterSec'],
        audit_date: '2024-01-01',
        exploit_history: [],
        oracle_provider: 'pyth',
        oracle_health: i % 3 === 0 ? 'healthy' : 'degraded',
        risk_score: null,
        institutional_metrics: metrics,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      expect(res.composite_risk_score).toBeGreaterThanOrEqual(0);
      expect(res.composite_risk_score).toBeLessThanOrEqual(10);
      expect(res.safety_score).toBe(res.composite_risk_score);
      expect(res.data_quality).toBeDefined();
      expect(res.data_quality?.total_sources_count).toBe(7);
      expect(res.data_quality?.live_sources_count).toBeGreaterThanOrEqual(0);
      expect(res.data_quality?.live_sources_count).toBeLessThanOrEqual(7);
    }
  });
});
