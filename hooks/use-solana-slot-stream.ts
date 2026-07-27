'use client';

import { useEffect, useState } from 'react';
import { getSolanaWebSocketUrl, parseSlotNotification, SolanaSlotNotification } from '../lib/solana-websocket';

const MAX_BACKOFF_MS = 30_000;
const IDLE_TIMEOUT_MS = 45_000;

export interface SolanaSlotStreamState {
  status: 'connecting' | 'connected' | 'reconnecting' | 'unavailable';
  lastSlot: SolanaSlotNotification | null;
  lastMessageAt: number | null;
  reconnectAttempt: number;
}

function retryDelay(attempt: number): number {
  // Capped exponential backoff with jitter prevents a dashboard herd from
  // reconnecting to a provider at the same instant after an outage.
  const cap = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** Math.min(attempt, 5));
  return Math.round(cap * (0.75 + Math.random() * 0.5));
}

/**
 * Subscribe to Solana's `slotSubscribe` JSON-RPC notification over a browser
 * WebSocket. It reconnects, re-subscribes after every open, and tears down all
 * timers when the view unmounts. No wallet data or transaction data is sent.
 */
export function useSolanaSlotStream(): SolanaSlotStreamState {
  const [state, setState] = useState<SolanaSlotStreamState>({
    status: 'connecting',
    lastSlot: null,
    lastMessageAt: null,
    reconnectAttempt: 0,
  });

  useEffect(() => {
    if (typeof WebSocket === 'undefined') {
      setState((current) => ({ ...current, status: 'unavailable' }));
      return;
    }

    const endpoint = getSolanaWebSocketUrl();
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let attempt = 0;

    const clearIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
    };

    const armIdleTimer = () => {
      clearIdleTimer();
      idleTimer = setTimeout(() => {
        // Browser WebSockets expose no ping API. An idle subscription is more
        // useful to reconnect than to display as a misleading "live" stream.
        if (socket?.readyState === WebSocket.OPEN) socket.close(4000, 'slot stream idle');
      }, IDLE_TIMEOUT_MS);
    };

    const connect = () => {
      if (disposed) return;
      setState((current) => ({ ...current, status: attempt === 0 ? 'connecting' : 'reconnecting', reconnectAttempt: attempt }));

      try {
        socket = new WebSocket(endpoint);
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        if (disposed || !socket) return;
        attempt = 0;
        socket.send(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'slotSubscribe' }));
        armIdleTimer();
      };

      socket.onmessage = (event) => {
        if (disposed || typeof event.data !== 'string') return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }
        const slot = parseSlotNotification(parsed);
        if (!slot) return;

        const receivedAt = Date.now();
        setState({ status: 'connected', lastSlot: slot, lastMessageAt: receivedAt, reconnectAttempt: 0 });
        armIdleTimer();
      };

      socket.onerror = () => {
        // `close` is the single reconnection path. Some browsers fire error
        // before close and some only fire close for failed handshakes.
      };
      socket.onclose = () => {
        clearIdleTimer();
        if (!disposed) scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      attempt += 1;
      setState((current) => ({ ...current, status: 'reconnecting', reconnectAttempt: attempt }));
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, retryDelay(attempt));
    };

    connect();
    return () => {
      disposed = true;
      clearIdleTimer();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close(1000, 'view unmounted');
    };
  }, []);

  return state;
}
