import { describe, expect, it } from 'vitest';
import { getSolanaWebSocketUrl, parseSlotNotification, toSolanaWebSocketUrl } from '../../../../lib/solana-websocket';

describe('Solana WebSocket helpers', () => {
  it('converts RPC URLs without dropping path or query parameters', () => {
    expect(toSolanaWebSocketUrl('https://mainnet.helius-rpc.com/?api-key=public-key')).toBe(
      'wss://mainnet.helius-rpc.com/?api-key=public-key'
    );
    expect(toSolanaWebSocketUrl('http://localhost:8899')).toBe('ws://localhost:8899/');
  });

  it('rejects malformed, non-web, and credential-bearing endpoints', () => {
    expect(toSolanaWebSocketUrl('not a url')).toBeNull();
    expect(toSolanaWebSocketUrl('ftp://rpc.example.com')).toBeNull();
    expect(toSolanaWebSocketUrl('wss://token@rpc.example.com')).toBeNull();
  });

  it('prefers the explicit public WebSocket endpoint', () => {
    expect(
      getSolanaWebSocketUrl({
        NEXT_PUBLIC_SOLANA_WS_URL: 'wss://rpc.example.com/socket',
        NEXT_PUBLIC_HELIUS_RPC_URL: 'https://ignored.example.com',
      })
    ).toBe('wss://rpc.example.com/socket');
  });

  it('accepts only complete non-negative slot notifications', () => {
    expect(
      parseSlotNotification({
        method: 'slotNotification',
        params: { result: { slot: 123, parent: 122, root: 120 } },
      })
    ).toEqual({ slot: 123, parent: 122, root: 120 });
    expect(parseSlotNotification({ method: 'slotNotification', params: { result: { slot: 123 } } })).toBeNull();
    expect(parseSlotNotification({ method: 'accountNotification', params: { result: { slot: 1, parent: 0, root: 0 } } })).toBeNull();
  });
});
