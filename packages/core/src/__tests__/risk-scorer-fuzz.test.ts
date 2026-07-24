import { describe, it, expect } from 'vitest';
import { computeProtocolRisk } from '../risk-scorer';
import { InstitutionalRiskMetrics } from '../../../../lib/types';

function generateRandomMetrics(seed: number): InstitutionalRiskMetrics {
  const pseudoRand = (i: number) => {
    const x = Math.sin(seed + i) * 10000;
    return x - Math.floor(x);
  };

  // Every metric is independently present-or-null, so the fuzzer exercises the
  // full lattice of partial coverage, not just the fully-populated case.
  const maybe = (i: number, v: number) => (pseudoRand(i) > 0.25 ? v : null);

  return {
    bot_density_pct: maybe(1, pseudoRand(1) * 120 - 10),
    whale_concentration_pct: maybe(3, pseudoRand(3) * 150 - 20),
    near_liquidation_ratio_pct: maybe(5, pseudoRand(5) * 100),
    oracle_slot_lag_ms: maybe(6, pseudoRand(6) * 10000),
    upgradeability_timelock_hours: maybe(8, pseudoRand(8) * 200),
    web_community: {
      developer_commits_30d: maybe(15, Math.floor(pseudoRand(15) * 500)),
      active_devs_count: maybe(16, Math.floor(pseudoRand(16) * 50)),
      github_org: 'fuzz-org',
      repos_sampled: 5,
      as_of: '2026-01-01T00:00:00Z',
    },
    business_ratios: {
      category_market_share_pct: maybe(17, pseudoRand(17) * 200 - 50),
      category_tvl_usd: maybe(18, pseudoRand(18) * 1e10),
      protocol_tvl_usd: maybe(19, pseudoRand(19) * 1e9),
      annualized_fee_usd: maybe(20, pseudoRand(20) * 1e8),
      annualized_basis: '30d' as const,
      fee_to_tvl_ratio_pct: maybe(21, pseudoRand(21) * 300 - 50),
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

      // Effective weights over measured factors always renormalise to 1.0
      // (or to 0 when nothing at all is measured).
      const measured = res.factors!.filter((f) => f.measured);
      const weightSum = measured.reduce((s, f) => s + f.weight, 0);
      expect(Math.round(weightSum * 1000) / 1000).toBe(measured.length > 0 ? 1.0 : 0);

      // An unmeasured factor must never carry a score, however odd the input.
      for (const f of res.factors!) {
        if (!f.measured) {
          expect(f.score).toBeNull();
          expect(f.weight).toBe(0);
        } else {
          expect(f.score).toBeGreaterThanOrEqual(0);
          expect(f.score).toBeLessThanOrEqual(10);
        }
      }

      // Coverage must agree with the factor list.
      expect(res.factor_coverage.measured_factors).toBe(measured.length);
      expect(res.factor_coverage.unmeasured.length).toBe(7 - measured.length);

      // The confidence band always brackets the point score.
      expect(res.confidence!.score_band_low).toBeLessThanOrEqual(res.composite_risk_score);
      expect(res.confidence!.score_band_high).toBeGreaterThanOrEqual(res.composite_risk_score);
    }
  });
});
