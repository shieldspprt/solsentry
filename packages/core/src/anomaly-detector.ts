import {
  AnomalyBaselineWindow,
  AnomalyEvent,
  AnomalyFeatureContribution,
  AnomalyFeatureKey,
  AnomalySeverity,
} from '../../../lib/types';
import { OracleHealthSignal } from './data-fetchers/pyth';

export interface OracleAnomalySample {
  symbol: string;
  price: number;
  confidence_bps: number;
  staleness_ms: number;
  slot_lag_ms?: number;
  as_of?: string | null;
  timestamp?: string;
  source?: string;
  stablecoin?: boolean;
}

export interface OracleAnomalyFeatures {
  price_return_bps: number | null;
  confidence_band_bps: number;
  confidence_expansion_bps: number | null;
  oracle_staleness_ms: number;
  slot_lag_ms: number;
  stablecoin_depeg_bps: number | null;
}

export interface OnlineAnomalyDetectorOptions {
  /** Rolling baseline window per feed + feature. */
  windowSize?: number;
  /** Minimum observations before baseline z-scores are trusted. Guardrails still fire before this. */
  minBaselinePoints?: number;
  /** EWMA variance speed for non-stationary feeds. */
  ewmaAlpha?: number;
  /** Aggregate event threshold on the 0..100 anomaly score. */
  anomalyScoreThreshold?: number;
  /** Stable symbols whose distance from $1 should be treated as a de-peg feature. */
  stablecoinFeeds?: string[];
  /** Deterministic time injection for tests. Sample.timestamp takes precedence. */
  clock?: () => Date;
}

type Direction = 'high' | 'absolute';

interface FeatureMeta {
  label: string;
  unit: string;
  direction: Direction;
  /** Minimum sigma so a flat baseline does not divide by zero or overreact to dust. */
  sigmaFloor: number;
  /** Thresholds that are dangerous even before a baseline has warmed up. */
  warnAt?: number;
  criticalAt?: number;
  weight: number;
}

interface BaselineSnapshot {
  count: number;
  median: number | null;
  mad: number | null;
  ewmaMean: number | null;
  ewmaStdDev: number | null;
}

const DEFAULT_STABLECOIN_FEEDS = ['USDC_USD', 'USDT_USD', 'USDS_USD', 'DAI_USD', 'USDH_USD'];

const FEATURE_META: Record<AnomalyFeatureKey, FeatureMeta> = {
  price_return_bps: {
    label: 'Price return',
    unit: 'bps',
    direction: 'absolute',
    sigmaFloor: 8,
    warnAt: 150,
    criticalAt: 500,
    weight: 1.2,
  },
  confidence_band_bps: {
    label: 'Confidence band',
    unit: 'bps',
    direction: 'high',
    sigmaFloor: 2,
    warnAt: 20,
    criticalAt: 50,
    weight: 1.1,
  },
  confidence_expansion_bps: {
    label: 'Confidence-band expansion',
    unit: 'bps',
    direction: 'high',
    sigmaFloor: 2,
    warnAt: 10,
    criticalAt: 30,
    weight: 1.0,
  },
  oracle_staleness_ms: {
    label: 'Oracle staleness',
    unit: 'ms',
    direction: 'high',
    sigmaFloor: 1000,
    warnAt: 10_000,
    criticalAt: 30_000,
    weight: 1.25,
  },
  slot_lag_ms: {
    label: 'Slot lag proxy',
    unit: 'ms',
    direction: 'high',
    sigmaFloor: 1000,
    warnAt: 10_000,
    criticalAt: 30_000,
    weight: 0.8,
  },
  stablecoin_depeg_bps: {
    label: 'Stablecoin de-peg deviation',
    unit: 'bps',
    direction: 'high',
    sigmaFloor: 5,
    warnAt: 50,
    criticalAt: 150,
    weight: 1.4,
  },
};

const FEATURE_KEYS = Object.keys(FEATURE_META) as AnomalyFeatureKey[];
const MAD_TO_SIGMA = 1.4826;
const DEFAULT_WINDOW_SIZE = 60;
const DEFAULT_MIN_BASELINE_POINTS = 8;
const DEFAULT_EWMA_ALPHA = 0.18;
const DEFAULT_EVENT_THRESHOLD = 60;
const FEATURE_REPORTING_THRESHOLD = 35;

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function round(n: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function medianAbsoluteDeviation(values: number[], med: number): number | null {
  if (values.length === 0) return null;
  return median(values.map((v) => Math.abs(v - med)));
}

function directionalMagnitude(value: number, reference: number, direction: Direction): number {
  if (direction === 'absolute') return Math.abs(value - reference);
  return Math.max(0, value - reference);
}

function guardrailScore(value: number, meta: FeatureMeta): number {
  const magnitude = meta.direction === 'absolute' ? Math.abs(value) : value;
  if (meta.criticalAt != null && magnitude >= meta.criticalAt) {
    // The farther beyond the critical line, the closer to 100. Capped to keep a
    // single insane reading from hiding other feature contributions.
    return Math.min(100, 90 + ((magnitude - meta.criticalAt) / meta.criticalAt) * 10);
  }
  if (meta.warnAt != null && magnitude >= meta.warnAt) {
    const span = Math.max(1, (meta.criticalAt ?? meta.warnAt * 2) - meta.warnAt);
    return Math.min(89, 62 + ((magnitude - meta.warnAt) / span) * 26);
  }
  return 0;
}

function zScoreToAnomalyScore(z: number | null): number {
  if (z == null || z <= 0) return 0;
  // 4-sigma is notable; 6-sigma is critical. Below 3-sigma is treated as noise.
  if (z < 3) return 0;
  return Math.min(100, (z - 2.5) * 18);
}

function contributionRationale(
  value: number,
  meta: FeatureMeta,
  snapshot: BaselineSnapshot,
  score: number,
  guardScore: number
): string {
  const baseline = snapshot.median == null ? 'baseline warming' : `median ${round(snapshot.median)} ${meta.unit}`;
  if (guardScore >= 90) return `${meta.label} crossed the critical guardrail (${round(value)} ${meta.unit}; ${baseline}).`;
  if (guardScore >= 60) return `${meta.label} crossed the warning guardrail (${round(value)} ${meta.unit}; ${baseline}).`;
  return `${meta.label} is abnormal versus its online baseline (${round(value)} ${meta.unit}; ${baseline}; score ${round(score, 1)}).`;
}

function buildSummary(feed: string, severity: AnomalySeverity, contributions: AnomalyFeatureContribution[]): string {
  const top = contributions.slice(0, 3).map((c) => `${c.label.toLowerCase()} ${round(c.value)} ${c.unit}`);
  return `${severity === 'critical' ? 'Critical' : 'Warning'} oracle anomaly on ${feed}: ${top.join(', ')}.`;
}

function featureValue(features: OracleAnomalyFeatures, key: AnomalyFeatureKey): number | null {
  return features[key];
}

class FeatureBaseline {
  private values: number[] = [];
  private ewmaMeanValue: number | null = null;
  private ewmaVarianceValue: number | null = null;

  constructor(private readonly windowSize: number, private readonly alpha: number) {}

  observe(value: number): void {
    if (!isFiniteNumber(value)) return;

    if (this.ewmaMeanValue == null) {
      this.ewmaMeanValue = value;
      this.ewmaVarianceValue = 0;
    } else {
      const previousMean = this.ewmaMeanValue;
      const delta = value - previousMean;
      const nextMean = previousMean + this.alpha * delta;
      // Exponentially weighted variance update. It is deliberately secondary
      // to median/MAD: EWMA adapts to regime changes, MAD resists outliers.
      this.ewmaVarianceValue = (1 - this.alpha) * ((this.ewmaVarianceValue ?? 0) + this.alpha * delta * delta);
      this.ewmaMeanValue = nextMean;
    }

    this.values.push(value);
    if (this.values.length > this.windowSize) this.values.shift();
  }

  snapshot(): BaselineSnapshot {
    const med = median(this.values);
    const mad = med == null ? null : medianAbsoluteDeviation(this.values, med);
    return {
      count: this.values.length,
      median: med,
      mad,
      ewmaMean: this.ewmaMeanValue,
      ewmaStdDev: this.ewmaVarianceValue == null ? null : Math.sqrt(Math.max(0, this.ewmaVarianceValue)),
    };
  }
}

interface FeedState {
  previous: OracleAnomalySample | null;
  baselines: Record<AnomalyFeatureKey, FeatureBaseline>;
}

function createBaselines(windowSize: number, alpha: number): Record<AnomalyFeatureKey, FeatureBaseline> {
  return FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = new FeatureBaseline(windowSize, alpha);
    return acc;
  }, {} as Record<AnomalyFeatureKey, FeatureBaseline>);
}

export function extractOracleAnomalyFeatures(sample: OracleAnomalySample, previous: OracleAnomalySample | null): OracleAnomalyFeatures {
  const priceReturnBps =
    previous && previous.price > 0 ? ((sample.price - previous.price) / previous.price) * 10_000 : null;
  const confidenceExpansionBps = previous ? sample.confidence_bps - previous.confidence_bps : null;
  const slotLagMs = sample.slot_lag_ms ?? sample.staleness_ms;
  const stablecoinDepegBps = sample.stablecoin ? Math.abs(sample.price - 1) * 10_000 : null;

  return {
    price_return_bps: priceReturnBps == null ? null : round(priceReturnBps, 4),
    confidence_band_bps: round(sample.confidence_bps, 4),
    confidence_expansion_bps: confidenceExpansionBps == null ? null : round(confidenceExpansionBps, 4),
    oracle_staleness_ms: round(sample.staleness_ms, 2),
    slot_lag_ms: round(slotLagMs, 2),
    stablecoin_depeg_bps: stablecoinDepegBps == null ? null : round(stablecoinDepegBps, 4),
  };
}

export class OnlineAnomalyDetector {
  private readonly windowSize: number;
  private readonly minBaselinePoints: number;
  private readonly ewmaAlpha: number;
  private readonly eventThreshold: number;
  private readonly stablecoinFeeds: Set<string>;
  private readonly clock: () => Date;
  private readonly feeds = new Map<string, FeedState>();
  private sequence = 0;

  constructor(opts: OnlineAnomalyDetectorOptions = {}) {
    this.windowSize = opts.windowSize ?? DEFAULT_WINDOW_SIZE;
    this.minBaselinePoints = opts.minBaselinePoints ?? DEFAULT_MIN_BASELINE_POINTS;
    this.ewmaAlpha = opts.ewmaAlpha ?? DEFAULT_EWMA_ALPHA;
    this.eventThreshold = opts.anomalyScoreThreshold ?? DEFAULT_EVENT_THRESHOLD;
    this.stablecoinFeeds = new Set(opts.stablecoinFeeds ?? DEFAULT_STABLECOIN_FEEDS);
    this.clock = opts.clock ?? (() => new Date());
  }

  observeOracleHealth(
    health: OracleHealthSignal,
    opts: { source?: string; receivedAt?: string; stablecoin?: boolean } = {}
  ): AnomalyEvent | null {
    return this.observe({
      symbol: health.symbol,
      price: health.price,
      confidence_bps: health.confidence_bps,
      staleness_ms: health.staleness_ms,
      slot_lag_ms: health.slot_lag_ms,
      as_of: health.as_of,
      timestamp: opts.receivedAt,
      source: opts.source ?? 'pyth:hermes',
      stablecoin: opts.stablecoin,
    });
  }

  observe(input: OracleAnomalySample): AnomalyEvent | null {
    const symbol = input.symbol;
    const state = this.stateFor(symbol);
    const stablecoin = input.stablecoin ?? this.stablecoinFeeds.has(symbol);
    const timestamp = input.timestamp ?? this.clock().toISOString();
    const sample: OracleAnomalySample = {
      ...input,
      stablecoin,
      timestamp,
      source: input.source ?? 'pyth:hermes',
      as_of: input.as_of ?? null,
    };

    const features = extractOracleAnomalyFeatures(sample, state.previous);
    const contributions = this.scoreFeatures(features, state).sort((a, b) => b.score - a.score);
    const aggregateScore = this.aggregateScore(contributions);
    const event = aggregateScore >= this.eventThreshold ? this.buildEvent(sample, state.previous, features, contributions, aggregateScore) : null;

    this.updateBaselines(features, state);
    state.previous = sample;

    return event;
  }

  reset(): void {
    this.feeds.clear();
    this.sequence = 0;
  }

  private stateFor(symbol: string): FeedState {
    const existing = this.feeds.get(symbol);
    if (existing) return existing;
    const created: FeedState = {
      previous: null,
      baselines: createBaselines(this.windowSize, this.ewmaAlpha),
    };
    this.feeds.set(symbol, created);
    return created;
  }

  private scoreFeatures(features: OracleAnomalyFeatures, state: FeedState): AnomalyFeatureContribution[] {
    const contributions: AnomalyFeatureContribution[] = [];

    for (const key of FEATURE_KEYS) {
      const value = featureValue(features, key);
      if (!isFiniteNumber(value)) continue;

      const meta = FEATURE_META[key];
      const snapshot = state.baselines[key].snapshot();
      const enoughBaseline = snapshot.count >= this.minBaselinePoints;
      const medianReference = snapshot.median ?? (meta.direction === 'absolute' ? 0 : value);
      const sigmaFromMad = snapshot.mad == null ? null : Math.max(snapshot.mad * MAD_TO_SIGMA, meta.sigmaFloor);
      const robustZ = enoughBaseline && sigmaFromMad != null ? directionalMagnitude(value, medianReference, meta.direction) / sigmaFromMad : null;

      const ewmaStdDev = snapshot.ewmaStdDev == null ? null : Math.max(snapshot.ewmaStdDev, meta.sigmaFloor);
      const ewmaZ =
        enoughBaseline && snapshot.ewmaMean != null && ewmaStdDev != null
          ? directionalMagnitude(value, snapshot.ewmaMean, meta.direction) / ewmaStdDev
          : null;

      const baselineScore = Math.max(zScoreToAnomalyScore(robustZ), zScoreToAnomalyScore(ewmaZ));
      const guardScore = guardrailScore(value, meta);
      const score = Math.max(baselineScore, guardScore);

      if (score < FEATURE_REPORTING_THRESHOLD) continue;

      contributions.push({
        key,
        label: meta.label,
        value: round(value, key.endsWith('_ms') ? 0 : 2),
        unit: meta.unit,
        direction: meta.direction,
        baseline_median: snapshot.median == null ? null : round(snapshot.median, key.endsWith('_ms') ? 0 : 2),
        baseline_mad: snapshot.mad == null ? null : round(snapshot.mad, key.endsWith('_ms') ? 0 : 2),
        baseline_ewma: snapshot.ewmaMean == null ? null : round(snapshot.ewmaMean, key.endsWith('_ms') ? 0 : 2),
        robust_z: robustZ == null ? null : round(robustZ, 2),
        ewma_z: ewmaZ == null ? null : round(ewmaZ, 2),
        score: round(score, 1),
        rationale: contributionRationale(value, meta, snapshot, score, guardScore),
      });
    }

    return contributions;
  }

  private aggregateScore(contributions: AnomalyFeatureContribution[]): number {
    if (contributions.length === 0) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    let maxScore = 0;

    for (const c of contributions) {
      const weight = FEATURE_META[c.key].weight;
      weightedSum += c.score * weight;
      totalWeight += weight;
      maxScore = Math.max(maxScore, c.score);
    }

    const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : maxScore;
    // The max component preserves single-feature critical failures (e.g. a depeg)
    // while the weighted component rewards corroborating signals.
    return round(Math.min(100, maxScore * 0.72 + weightedAverage * 0.28), 1);
  }

  private buildEvent(
    sample: OracleAnomalySample,
    previous: OracleAnomalySample | null,
    features: OracleAnomalyFeatures,
    contributions: AnomalyFeatureContribution[],
    score: number
  ): AnomalyEvent {
    const severity: AnomalySeverity = score >= 85 || contributions.some((c) => c.score >= 90) ? 'critical' : 'warning';
    const timestamp = sample.timestamp ?? this.clock().toISOString();
    const source = sample.source ?? 'pyth:hermes';
    const baselineWindow: AnomalyBaselineWindow = {
      method: 'rolling_median_mad+ewma',
      window_size: this.windowSize,
      min_samples: this.minBaselinePoints,
      observations: this.observationCounts(sample.symbol),
    };

    this.sequence += 1;

    return {
      id: `ano_${sample.symbol.toLowerCase()}_${new Date(timestamp).getTime()}_${this.sequence}`,
      type: 'oracle_anomaly',
      feed: sample.symbol,
      severity,
      score,
      summary: buildSummary(sample.symbol, severity, contributions),
      feature_contributions: contributions,
      baseline_window: baselineWindow,
      timestamp,
      source,
      provenance: {
        source,
        as_of: sample.as_of ?? null,
        received_at: timestamp,
        previous_as_of: previous?.as_of ?? null,
        confidence: 0.95,
      },
      telemetry: {
        price: round(sample.price, 8),
        confidence_bps: round(sample.confidence_bps, 2),
        staleness_ms: round(sample.staleness_ms, 0),
        slot_lag_ms: round(sample.slot_lag_ms ?? sample.staleness_ms, 0),
        price_return_bps: features.price_return_bps == null ? null : round(features.price_return_bps, 2),
        stablecoin_depeg_bps: features.stablecoin_depeg_bps == null ? null : round(features.stablecoin_depeg_bps, 2),
      },
    };
  }

  private observationCounts(symbol: string): Partial<Record<AnomalyFeatureKey, number>> {
    const state = this.feeds.get(symbol);
    if (!state) return {};
    return FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = state.baselines[key].snapshot().count;
      return acc;
    }, {} as Partial<Record<AnomalyFeatureKey, number>>);
  }

  private updateBaselines(features: OracleAnomalyFeatures, state: FeedState): void {
    for (const key of FEATURE_KEYS) {
      const value = featureValue(features, key);
      if (isFiniteNumber(value)) {
        state.baselines[key].observe(value);
      }
    }
  }
}

export function createOracleAnomalyDetector(opts: OnlineAnomalyDetectorOptions = {}): OnlineAnomalyDetector {
  return new OnlineAnomalyDetector(opts);
}
