import { describe, it, expect } from 'vitest';
import { simulateSolanaTransaction, simulateSolanaBundle } from '../simulation/tx-simulator';

describe('Solana Transaction Simulator', () => {
  it('should return INVALID_TRANSACTION for empty payload', async () => {
    const res = await simulateSolanaTransaction('');
    expect(res.success).toBe(false);
    expect(res.status).toBe('INVALID_TRANSACTION');
  });

  it('should return INVALID_TRANSACTION for malformed payload', async () => {
    const res = await simulateSolanaTransaction('invalid_base58_payload_12345');
    expect(res.success).toBe(false);
    expect(res.status).toBe('INVALID_TRANSACTION');
  });

  it('should handle bundle simulation empty list cleanly', async () => {
    const res = await simulateSolanaBundle([]);
    expect(res.success).toBe(false);
    expect(res.totalTransactions).toBe(0);
  });
});
