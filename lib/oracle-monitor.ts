import { dispatchAnomalyAlerts } from './anomaly-alerts';
import { AnomalyPersistence, getAnomalyPersistence } from './anomaly-persistence';
import { logger } from './logger';
import { AnomalyEvent } from './types';
import { OnlineAnomalyDetector } from '../packages/core/src/anomaly-detector';
import { PYTH_FEED_IDS, STABLECOIN_FEEDS } from '../packages/core/src/constants';
import {
  fetchOracleHealth,
  OracleHealthSignal,
} from '../packages/core/src/data-fetchers/pyth';

export const ORACLE_STREAM_FEEDS: Array<keyof typeof PYTH_FEED_IDS> = ['SOL_USD', 'USDC_USD', 'USDT_USD'];
export const ORACLE_HEARTBEAT_MS = 5_000;
const MONITOR_ID = 'pyth-mainnet-v1';

type OracleFeed = (typeof ORACLE_STREAM_FEEDS)[number];

export interface OracleStreamMessage {
  event: 'connected' | 'telemetry' | 'anomaly';
  data: unknown;
}

type Subscriber = (message: OracleStreamMessage) => void;

export interface OracleStreamMonitorOptions {
  feeds?: OracleFeed[];
  heartbeatMs?: number;
  detector?: OnlineAnomalyDetector;
  persistence?: AnomalyPersistence | null;
  fetchHealth?: (feed: OracleFeed) => Promise<OracleHealthSignal | null>;
  dispatchAlerts?: (event: AnomalyEvent) => Promise<unknown>;
  clock?: () => Date;
  monitorId?: string;
}

function severityFor(confidenceBps: number, stalenessMs: number): 'ok' | 'degraded' | 'critical' {
  if (confidenceBps > 50 || stalenessMs > 30_000) return 'critical';
  if (confidenceBps > 20 || stalenessMs > 10_000) return 'degraded';
  return 'ok';
}

/** Align all instances to one deterministic sampling timestamp. */
export function oracleSampleBucket(now: Date, heartbeatMs = ORACLE_HEARTBEAT_MS): string {
  return new Date(Math.floor(now.getTime() / heartbeatMs) * heartbeatMs).toISOString();
}

/**
 * One monitor is shared by every SSE client in a server process. Its detector
 * snapshot is persisted to Postgres, and anomaly IDs are claimed before
 * webhooks are sent, making cold starts recoverable and fanout idempotent.
 */
export class OracleStreamMonitor {
  private readonly feeds: OracleFeed[];
  private readonly heartbeatMs: number;
  private readonly detector: OnlineAnomalyDetector;
  private readonly persistence: AnomalyPersistence | null;
  private readonly fetchHealth: (feed: OracleFeed) => Promise<OracleHealthSignal | null>;
  private readonly dispatchAlerts: (event: AnomalyEvent) => Promise<unknown>;
  private readonly clock: () => Date;
  private readonly monitorId: string;
  private readonly subscribers = new Set<Subscriber>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private initialization: Promise<void> | null = null;
  private pollInFlight: Promise<void> | null = null;

  constructor(options: OracleStreamMonitorOptions = {}) {
    this.feeds = options.feeds ?? ORACLE_STREAM_FEEDS;
    this.heartbeatMs = options.heartbeatMs ?? ORACLE_HEARTBEAT_MS;
    this.clock = options.clock ?? (() => new Date());
    this.detector =
      options.detector ??
      new OnlineAnomalyDetector({
        windowSize: 72,
        minBaselinePoints: 8,
        stablecoinFeeds: STABLECOIN_FEEDS,
        clock: this.clock,
      });
    this.persistence = options.persistence === undefined ? getAnomalyPersistence() : options.persistence;
    this.fetchHealth = options.fetchHealth ?? ((feed) => fetchOracleHealth(feed));
    this.dispatchAlerts =
      options.dispatchAlerts ?? ((event) => dispatchAnomalyAlerts(event, { persistence: this.persistence }));
    this.monitorId = options.monitorId ?? MONITOR_ID;
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber({
      event: 'connected',
      data: {
        status: 'active',
        stream: 'solsentry_oracle_telemetry',
        source: 'pyth:hermes',
        feeds: this.feeds,
        intervalMs: this.heartbeatMs,
        persistence: this.persistence ? 'postgres' : 'process-only',
        timestamp: this.clock().toISOString(),
      },
    });
    this.start();

    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0) this.stop();
    };
  }

  private start(): void {
    if (this.timer) return;
    void this.pollOnce();
    this.timer = setInterval(() => void this.pollOnce(), this.heartbeatMs);
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = (async () => {
      if (!this.persistence) return;
      try {
        const state = await this.persistence.loadDetectorState(this.monitorId);
        if (state) this.detector.restoreState(state);
      } catch (error) {
        logger.warn('anomaly_detector_state_restore_failed', {
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    })();
    return this.initialization;
  }

  /** Public for deterministic tests and scheduled invocations. */
  pollOnce(): Promise<void> {
    if (this.pollInFlight) return this.pollInFlight;
    this.pollInFlight = this.runPoll().finally(() => {
      this.pollInFlight = null;
    });
    return this.pollInFlight;
  }

  private async runPoll(): Promise<void> {
    await this.initialize();
    const sampleTimestamp = oracleSampleBucket(this.clock(), this.heartbeatMs);
    const results = await Promise.all(
      this.feeds.map(async (feed) => ({ feed, health: await this.fetchHealth(feed) }))
    );
    let observed = false;

    for (const { feed, health } of results) {
      if (!health) {
        this.publish({
          event: 'telemetry',
          data: {
            type: 'source_unavailable',
            feed,
            source: 'pyth:hermes',
            detail: 'Pyth Hermes did not return a price update for this feed.',
            timestamp: sampleTimestamp,
          },
        });
        continue;
      }

      const severity = severityFor(health.confidence_bps, health.staleness_ms);
      this.publish({
        event: 'telemetry',
        data: {
          type: severity === 'ok' ? 'oracle_heartbeat' : 'oracle_stress',
          feed,
          source: 'pyth:hermes',
          price: Math.round(health.price * 10_000) / 10_000,
          confidenceBps: health.confidence_bps,
          stalenessMs: health.staleness_ms,
          healthScore: health.health_score,
          severity,
          asOf: health.as_of,
          timestamp: sampleTimestamp,
        },
      });

      const anomaly = this.detector.observeOracleHealth(health, {
        source: 'pyth:hermes',
        receivedAt: sampleTimestamp,
        stablecoin: STABLECOIN_FEEDS.includes(feed),
      });
      observed = true;
      if (!anomaly) continue;

      // Every instance broadcasts to its own clients, but only the process that
      // inserts the deterministic event ID first may fan out webhooks.
      this.publish({ event: 'anomaly', data: anomaly });
      let claimed = !this.persistence;
      if (this.persistence) {
        try {
          claimed = await this.persistence.claimAnomalyEvent(anomaly);
        } catch (error) {
          // Fail closed for side effects. A database outage must not turn into
          // duplicate webhook storms from every live serverless instance.
          logger.error('anomaly_event_claim_failed', {
            anomalyId: anomaly.id,
            error: error instanceof Error ? error.message : 'unknown error',
          });
        }
      }
      if (claimed) void this.dispatchAlerts(anomaly);
    }

    if (observed && this.persistence) {
      try {
        await this.persistence.saveDetectorState(this.monitorId, this.detector.exportState(), sampleTimestamp);
      } catch (error) {
        logger.warn('anomaly_detector_state_persist_failed', {
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }
  }

  private publish(message: OracleStreamMessage): void {
    for (const subscriber of [...this.subscribers]) {
      try {
        subscriber(message);
      } catch {
        this.subscribers.delete(subscriber);
      }
    }
  }
}

export const oracleStreamMonitor = new OracleStreamMonitor();
