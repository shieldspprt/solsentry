import { describe, it, expect } from 'vitest';
import { computeProtocolRisk } from '../risk-scorer';
import { evaluatePolicyRules, computeMaxAllowedUsd } from '../policy-engine';
import { runStressScenario } from '../stress-engine';
import { DEFAULT_POLICY_RULES } from '../constants';
import { PositionRecord } from '../../../../lib/types';

describe('Institutional Risk Scorer', () => {
  it('should compute high composite score for fully audited protocol with low bot density and healthy oracle', () => {
    const result = computeProtocolRisk({
      slug: 'kamino',
      name: 'Kamino Finance',
      category: 'lending',
      audit_status: 'audited',
      auditors: ['OtterSec', 'Neodyme'],
      tvl_usd: 1053815624,
      oracle_health: 'healthy',
      exploit_history: [],
    });

    expect(result.composite_risk_score).toBeGreaterThanOrEqual(8.0);
    expect(result.risk_tier).toBe('low');
    expect(result.action_recommendation).toBe('proceed');
    expect(result.quant_metrics.bot_density_pct).toBeDefined();
    expect(result.quant_metrics.unique_active_wallets_24h).toBeGreaterThan(0);
  });

  it('should emit decision-grade metadata: factors, confidence band, drivers, model version', () => {
    const result = computeProtocolRisk({
      slug: 'kamino',
      name: 'Kamino Finance',
      category: 'lending',
      audit_status: 'audited',
      auditors: ['OtterSec', 'Neodyme'],
      oracle_health: 'healthy',
      exploit_history: [],
    });

    expect(result.factors).toBeDefined();
    expect(result.factors!.length).toBe(7);
    // weights must sum to 1.0
    const weightSum = result.factors!.reduce((s, f) => s + f.weight, 0);
    expect(Math.round(weightSum * 100) / 100).toBe(1.0);
    // every factor score clamped to 0..10
    for (const f of result.factors!) {
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(10);
    }
    expect(result.confidence).toBeDefined();
    expect(result.confidence!.score_band_low).toBeLessThanOrEqual(result.composite_risk_score);
    expect(result.confidence!.score_band_high).toBeGreaterThanOrEqual(result.composite_risk_score);
    expect(result.top_drivers!.length).toBeGreaterThan(0);
    expect(result.model_version).toBeDefined();
    expect(result.safety_score).toBe(result.composite_risk_score);
  });

  it('should lower confidence when metrics are model defaults vs live provenance', () => {
    const base = { slug: 'jupiter', name: 'Jupiter', category: 'dex' as const, audit_status: 'audited' as const, auditors: ['OtterSec'], oracle_health: 'healthy' as const, exploit_history: [] };
    const defaulted = computeProtocolRisk(base);
    const grounded = computeProtocolRisk(base, {
      provenance: {
        oracle_depeg: { source: 'pyth', as_of: new Date().toISOString(), confidence: 0.95 },
        whale_concentration: { source: 'helius', as_of: new Date().toISOString(), confidence: 0.9 },
      },
    });
    expect(grounded.confidence!.overall).toBeGreaterThan(defaulted.confidence!.overall);
  });

  it('should trigger warnings and downgrade score for un-timelocked or high bot density protocols', () => {
    const result = computeProtocolRisk({
      slug: 'raydium',
      name: 'Raydium',
      category: 'dex',
      audit_status: 'audited',
      auditors: ['OtterSec'],
      tvl_usd: 862046088,
      oracle_health: 'healthy',
      exploit_history: [],
    });

    expect(result.quant_metrics.bot_density_pct).toBeGreaterThan(50.0);
    expect(result.critical_warnings.length).toBeGreaterThan(0);
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
