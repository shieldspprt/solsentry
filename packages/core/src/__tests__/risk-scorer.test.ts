import { describe, it, expect } from 'vitest';
import { computeProtocolRisk } from '../risk-scorer';
import { evaluatePolicyRules, computeMaxAllowedUsd } from '../policy-engine';
import { runStressScenario } from '../stress-engine';
import { DEFAULT_POLICY_RULES } from '../constants';
import { PositionRecord } from '../../../../lib/types';

const KAMINO = {
  slug: 'kamino',
  name: 'Kamino Finance',
  category: 'lending' as const,
  audit_status: 'audited' as const,
  auditors: ['OtterSec', 'Neodyme'],
  tvl_usd: 1053815624,
  oracle_health: 'healthy' as const,
  exploit_history: [],
};

describe('Institutional Risk Scorer', () => {
  it('invents nothing: a protocol with no live metrics reports every data-driven factor as unmeasured', () => {
    const result = computeProtocolRisk(KAMINO);

    // Audit status is a registry fact and stays measured; everything that needs
    // a live feed must not be scored off a constant.
    const unmeasured = result.factor_coverage.unmeasured;
    expect(unmeasured).toContain('liquidation_rekt');
    expect(unmeasured).toContain('mev_bot_density');
    expect(unmeasured).toContain('whale_concentration');
    expect(unmeasured).toContain('oracle_depeg');
    expect(unmeasured).toContain('business_efficiency');

    expect(result.quant_metrics.bot_density_pct).toBeNull();
    expect(result.quant_metrics.whale_concentration_pct).toBeNull();
    expect(result.quant_metrics.near_liquidation_ratio_pct).toBeNull();

    // Unmeasured factors carry no score and no effective weight.
    for (const f of result.factors!.filter((x) => !x.measured)) {
      expect(f.score).toBeNull();
      expect(f.weight).toBe(0);
      expect(f.contribution).toBe(0);
      expect(f.source).toBe('unmeasured');
    }
  });

  it('renormalises effective weights across measured factors only', () => {
    const result = computeProtocolRisk(KAMINO, {
      provenance: {
        oracle_depeg: { source: 'pyth', as_of: '2026-01-01T00:00:00Z', confidence: 0.95 },
      },
    });

    expect(result.factors!.length).toBe(7);
    const measured = result.factors!.filter((f) => f.measured);
    expect(measured.length).toBeGreaterThan(0);
    expect(measured.length).toBeLessThan(7);

    // Effective weights across measured factors must still sum to 1.0.
    const weightSum = measured.reduce((s, f) => s + f.weight, 0);
    expect(Math.round(weightSum * 1000) / 1000).toBe(1.0);

    // Coverage reports the share of nominal weight actually backed by data.
    expect(result.factor_coverage.measured_factors).toBe(measured.length);
    expect(result.factor_coverage.weight_covered_pct).toBeGreaterThan(0);
    expect(result.factor_coverage.weight_covered_pct).toBeLessThan(100);
  });

  it('emits decision-grade metadata with a band that brackets the score', () => {
    const result = computeProtocolRisk(KAMINO);

    for (const f of result.factors!) {
      if (f.score == null) continue;
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(10);
    }
    expect(result.confidence!.score_band_low).toBeLessThanOrEqual(result.composite_risk_score);
    expect(result.confidence!.score_band_high).toBeGreaterThanOrEqual(result.composite_risk_score);
    expect(result.model_version).toBeDefined();
    expect(result.safety_score).toBe(result.composite_risk_score);
  });

  it('raises confidence as more factors become grounded', () => {
    const thin = computeProtocolRisk(KAMINO);
    const grounded = computeProtocolRisk(
      {
        ...KAMINO,
        institutional_metrics: {
          bot_density_pct: 22.4,
          near_liquidation_ratio_pct: 3.2,
          whale_concentration_pct: 28.5,
          oracle_slot_lag_ms: 180,
          upgradeability_timelock_hours: 48,
        },
      },
      {
        provenance: {
          oracle_depeg: { source: 'pyth', as_of: '2026-01-01T00:00:00Z', confidence: 0.95 },
          whale_concentration: { source: 'helius', as_of: '2026-01-01T00:00:00Z', confidence: 0.9 },
        },
      }
    );
    expect(grounded.confidence!.overall).toBeGreaterThan(thin.confidence!.overall);
    expect(grounded.factor_coverage.weight_covered_pct).toBeGreaterThan(thin.factor_coverage.weight_covered_pct);
  });

  it('withholds a directional call when a single factor would carry the whole score', () => {
    // Only the audit factor resolves, so renormalisation gives it 100% weight
    // and an audited protocol scores 10/10 on one data point.
    const result = computeProtocolRisk(KAMINO);

    expect(result.factor_coverage.measured_factors).toBe(1);
    expect(result.composite_risk_score).toBe(10);
    // ...but 20% coverage is below the floor, so no "safe to enter" verdict.
    expect(result.agent_decision.action).toBe('HOLD');
    expect(result.action_recommendation).toBe('proceed_with_caution');
    expect(result.agent_decision.primary_reason).toContain('below the 50% floor');
  });

  it('issues a directional call once coverage clears the floor', () => {
    const result = computeProtocolRisk(
      {
        ...KAMINO,
        institutional_metrics: {
          bot_density_pct: 20,
          near_liquidation_ratio_pct: 1.0,
          whale_concentration_pct: 15,
          oracle_slot_lag_ms: 200,
          upgradeability_timelock_hours: 48,
        },
      },
      {
        provenance: {
          oracle_depeg: { source: 'pyth', as_of: '2026-01-01T00:00:00Z', confidence: 0.95 },
          whale_concentration: { source: 'helius', as_of: '2026-01-01T00:00:00Z', confidence: 0.9 },
        },
      }
    );

    expect(result.factor_coverage.weight_covered_pct).toBeGreaterThanOrEqual(50);
    expect(result.agent_decision.action).not.toBe('HOLD');
  });

  it('refuses to recommend anything when nothing can be grounded', () => {
    const result = computeProtocolRisk({ slug: 'unknown-protocol', name: 'Unknown', category: 'dex' });

    expect(result.factor_coverage.measured_factors).toBe(0);
    expect(result.agent_decision.action).toBe('HOLD');
    expect(result.agent_decision.confidence_score).toBe(0);
    expect(result.confidence!.overall).toBe(0);
  });

  it('does not let protocol size drive the recommendation', () => {
    // TVL used to be divided by a constant to synthesise a near-liquidation
    // count, which then overrode the verdict for any large protocol.
    const small = computeProtocolRisk({ ...KAMINO, tvl_usd: 1_000_000 });
    const huge = computeProtocolRisk({ ...KAMINO, tvl_usd: 50_000_000_000 });

    expect(huge.composite_risk_score).toBe(small.composite_risk_score);
    expect(huge.agent_decision.action).toBe(small.agent_decision.action);
  });

  it('warns and penalises a sub-24h governance timelock', () => {
    const result = computeProtocolRisk({
      slug: 'raydium',
      name: 'Raydium',
      category: 'dex',
      audit_status: 'audited',
      auditors: ['OtterSec'],
      oracle_health: 'healthy',
      exploit_history: [],
      institutional_metrics: { upgradeability_timelock_hours: 6 } as any,
    });

    expect(result.critical_warnings.some((w) => w.includes('Timelock'))).toBe(true);
  });
});

describe('Policy Guardrail Engine', () => {
  it('should allow transaction within default rules', () => {
    const result = evaluatePolicyRules(DEFAULT_POLICY_RULES, {
      action: 'swap',
      protocolSlug: 'jupiter',
      amountUsd: 250,
    });

    expect(result.allowed).toBe(true);
    expect(result.decision).toBe('proceed');
    expect(result.violations).toHaveLength(0);
  });

  it('should block transaction exceeding single transaction limit', () => {
    const result = evaluatePolicyRules(DEFAULT_POLICY_RULES, {
      action: 'swap',
      protocolSlug: 'jupiter',
      amountUsd: 15000,
    });

    expect(result.allowed).toBe(false);
    expect(result.decision).toBe('block');
    expect(result.violations.length).toBeGreaterThan(0);
    // maxAllowedUsd tells the agent how to right-size instead of retrying.
    expect(result.maxAllowedUsd).toBe(10000);
  });

  it('should shrink maxAllowedUsd as daily volume is consumed', () => {
    const max = computeMaxAllowedUsd(DEFAULT_POLICY_RULES, {
      action: 'swap',
      protocolSlug: 'jupiter',
      currentDailyVolumeUsd: 49500,
    });
    // remaining daily = 500, below single-tx cap of 10000
    expect(max).toBe(500);
  });

  it('should return 0 maxAllowedUsd on a hard block (drawdown breach)', () => {
    const max = computeMaxAllowedUsd(DEFAULT_POLICY_RULES, {
      action: 'swap',
      protocolSlug: 'jupiter',
      currentDrawdownPct: 99,
    });
    expect(max).toBe(0);
  });
});

describe('Stress Engine', () => {
  const longBorrow: PositionRecord = {
    id: 'p1',
    agent_id: 'a1',
    user_id: 'u1',
    protocol_slug: 'kamino',
    position_type: 'borrow',
    asset: 'SOL',
    amount: 10,
    amount_usd: 2000,
    entry_price: 200,
    current_price: 200,
    health_factor: 1.3,
    liquidation_price: 170,
    pnl_usd: 0,
    status: 'open',
    last_checked: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('should liquidate a long borrow under a large enough downside shock', () => {
    const safe = runStressScenario([longBorrow], { label: 'mild', price_shock_pct: -5 });
    const rekt = runStressScenario([longBorrow], { label: 'severe', price_shock_pct: -25 });
    expect(safe.positions_liquidated).toBe(0);
    expect(rekt.positions_liquidated).toBe(1);
    expect(rekt.capital_at_risk_usd).toBeGreaterThan(0);
  });

  it('should compute the collateral needed to restore target health factor', () => {
    const res = runStressScenario([longBorrow], { label: 'now', price_shock_pct: 0 });
    const p = res.positions[0];
    // HF 1.3 -> target 1.5 on $2000 => ~$307 to add
    expect(p.action_size_usd_to_target).toBeGreaterThan(250);
    expect(p.price_buffer_pct).toBeCloseTo(15, 0);
  });

  it('should stress an HF-only position (no mark price, like a Kamino obligation)', () => {
    // Multi-collateral lending obligation: health factor but no single price.
    const obligation: PositionRecord = {
      ...longBorrow,
      id: 'k1',
      protocol_slug: 'kamino',
      asset: 'multi-asset',
      current_price: null,
      liquidation_price: null,
      health_factor: 1.15,
    };
    const mild = runStressScenario([obligation], { label: 'mild', price_shock_pct: -5 });
    const severe = runStressScenario([obligation], { label: 'severe', price_shock_pct: -20 });
    // HF 1.15 * 0.95 = 1.09 (survives); * 0.80 = 0.92 (liquidates)
    expect(mild.positions[0].stressed_health_factor).toBeCloseTo(1.09, 1);
    expect(mild.positions_liquidated).toBe(0);
    expect(severe.positions_liquidated).toBe(1);
  });
});
