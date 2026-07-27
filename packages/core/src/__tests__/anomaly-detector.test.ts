import { describe, expect, it } from 'vitest';
import { OnlineAnomalyDetector, OracleAnomalySample } from '../anomaly-detector';

function sample(overrides: Partial<OracleAnomalySample> = {}): OracleAnomalySample {
  return {
    symbol: 'USDC_USD',
    price: 1,
    confidence_bps: 2,
    staleness_ms: 1_000,
    slot_lag_ms: 1_000,
    source: 'pyth:hermes',
    stablecoin: true,
    timestamp: '2026-07-27T00:00:00.000Z',
    as_of: '2026-07-27T00:00:00.000Z',
    ...overrides,
  };
}

function warmStableBaseline(detector: OnlineAnomalyDetector, symbol = 'USDC_USD', stablecoin = true): void {
  for (let i = 0; i < 12; i++) {
    const priceJitter = stablecoin ? (i % 2 === 0 ? 0.00002 : -0.00002) : (i % 2 === 0 ? 0.01 : -0.01);
    const event = detector.observe(
      sample({
        symbol,
        stablecoin,
        price: stablecoin ? 1 + priceJitter : 150 + priceJitter,
        confidence_bps: 2 + (i % 3) * 0.1,
        staleness_ms: 900 + (i % 2) * 100,
        slot_lag_ms: 900 + (i % 2) * 100,
        timestamp: `2026-07-27T00:00:${String(i).padStart(2, '0')}.000Z`,
        as_of: `2026-07-27T00:00:${String(i).padStart(2, '0')}.000Z`,
      })
    );
    expect(event).toBeNull();
  }
}

describe('OnlineAnomalyDetector', () => {
  it('flags deterministic stablecoin de-peg deviations with provenance and feature contributions', () => {
    const detector = new OnlineAnomalyDetector({ windowSize: 20, minBaselinePoints: 6 });
    warmStableBaseline(detector);

    const event = detector.observe(
      sample({
        price: 0.972,
        confidence_bps: 3,
        timestamp: '2026-07-27T00:01:00.000Z',
        as_of: '2026-07-27T00:01:00.000Z',
      })
    );

    expect(event).not.toBeNull();
    expect(event?.severity).toBe('critical');
    expect(event?.feed).toBe('USDC_USD');
    expect(event?.source).toBe('pyth:hermes');
    expect(event?.baseline_window.method).toBe('rolling_median_mad+ewma');
    expect(event?.feature_contributions.some((c) => c.key === 'stablecoin_depeg_bps')).toBe(true);
    expect(event?.telemetry.stablecoin_depeg_bps).toBeGreaterThan(250);
    expect(event?.provenance.as_of).toBe('2026-07-27T00:01:00.000Z');
  });

  it('flags stale oracle publishes before a baseline has fully warmed up', () => {
    const detector = new OnlineAnomalyDetector({ windowSize: 20, minBaselinePoints: 8 });

    const event = detector.observe(
      sample({
        symbol: 'SOL_USD',
        stablecoin: false,
        price: 150,
        staleness_ms: 45_000,
        slot_lag_ms: 45_000,
        timestamp: '2026-07-27T00:02:00.000Z',
      })
    );

    expect(event).not.toBeNull();
    expect(event?.severity).toBe('critical');
    expect(event?.feature_contributions.map((c) => c.key)).toContain('oracle_staleness_ms');
    expect(event?.feature_contributions.map((c) => c.key)).toContain('slot_lag_ms');
  });

  it('flags confidence-band blowouts against a quiet rolling baseline', () => {
    const detector = new OnlineAnomalyDetector({ windowSize: 20, minBaselinePoints: 6 });
    warmStableBaseline(detector, 'SOL_USD', false);

    const event = detector.observe(
      sample({
        symbol: 'SOL_USD',
        stablecoin: false,
        price: 150.02,
        confidence_bps: 85,
        timestamp: '2026-07-27T00:03:00.000Z',
      })
    );

    expect(event).not.toBeNull();
    expect(event?.severity).toBe('critical');
    const keys = event?.feature_contributions.map((c) => c.key) ?? [];
    expect(keys).toContain('confidence_band_bps');
    expect(keys).toContain('confidence_expansion_bps');
    const confidence = event?.feature_contributions.find((c) => c.key === 'confidence_band_bps');
    expect(confidence?.baseline_median).toBeLessThan(3);
    expect(confidence?.robust_z).toBeGreaterThan(10);
  });

  it('restores rolling baselines after a cold start and ignores duplicate sample buckets', () => {
    const first = new OnlineAnomalyDetector({ windowSize: 20, minBaselinePoints: 6 });
    warmStableBaseline(first);
    const snapshot = first.exportState();

    const restored = new OnlineAnomalyDetector({ windowSize: 20, minBaselinePoints: 6 });
    expect(restored.restoreState(JSON.parse(JSON.stringify(snapshot)))).toBe(true);

    const anomalySample = sample({
      price: 0.97,
      timestamp: '2026-07-27T00:05:00.000Z',
      as_of: '2026-07-27T00:04:59.000Z',
    });
    const event = restored.observe(anomalySample);
    expect(event?.severity).toBe('critical');
    expect(event?.id).toBe('ano_usdc_usd_1785110700000');

    const countAfterFirstObservation = restored.exportState().feeds.USDC_USD.baselines.stablecoin_depeg_bps.values.length;
    expect(restored.observe(anomalySample)).toBeNull();
    expect(restored.exportState().feeds.USDC_USD.baselines.stablecoin_depeg_bps.values.length).toBe(
      countAfterFirstObservation
    );
  });

  it('does not emit on normal jitter and clears after recovery from a stale publish', () => {
    const detector = new OnlineAnomalyDetector({ windowSize: 20, minBaselinePoints: 6 });
    warmStableBaseline(detector);

    const noise = detector.observe(
      sample({
        price: 1.00015,
        confidence_bps: 2.3,
        staleness_ms: 950,
        slot_lag_ms: 950,
        timestamp: '2026-07-27T00:04:00.000Z',
      })
    );
    expect(noise).toBeNull();

    const stale = detector.observe(
      sample({
        staleness_ms: 42_000,
        slot_lag_ms: 42_000,
        timestamp: '2026-07-27T00:04:05.000Z',
      })
    );
    expect(stale).not.toBeNull();

    const recovered = detector.observe(
      sample({
        price: 1.00005,
        confidence_bps: 2.1,
        staleness_ms: 1_000,
        slot_lag_ms: 1_000,
        timestamp: '2026-07-27T00:04:10.000Z',
      })
    );
    expect(recovered).toBeNull();
  });
});
