import { describe, it, expect } from 'vitest';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import {
  simulateSolanaTransaction,
  simulateSolanaBundle,
  decodeTransactionPayload,
} from '../simulation/tx-simulator';

// A deterministic, locally-built legacy transaction. Nothing here touches the
// network — these tests cover decode/deserialize, which is where the real bug was.
function buildTx(): Buffer {
  const payer = new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1');
  const dest = new PublicKey('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: payer, toPubkey: dest, lamports: 1_000_000 })
  );
  // Any valid blockhash-shaped value; the simulator replaces it before sending.
  tx.recentBlockhash = bs58.encode(Buffer.alloc(32, 7));
  tx.feePayer = payer;
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
}

describe('Transaction payload decoding', () => {
  // Regression: base58 was decoded with Buffer.from(str, 'hex'), which Node
  // accepts and silently turns into garbage. Every existing test still passed
  // because they only asserted on malformed input.
  it('decodes base58 to the exact original bytes', () => {
    const raw = buildTx();
    const decoded = decodeTransactionPayload(bs58.encode(raw), 'base58');
    expect(decoded.equals(raw)).toBe(true);
  });

  it('decodes base64 to the exact original bytes', () => {
    const raw = buildTx();
    const decoded = decodeTransactionPayload(raw.toString('base64'), 'base64');
    expect(decoded.equals(raw)).toBe(true);
  });

  it('produces identical bytes from either encoding of the same transaction', () => {
    const raw = buildTx();
    const fromB58 = decodeTransactionPayload(bs58.encode(raw), 'base58');
    const fromB64 = decodeTransactionPayload(raw.toString('base64'), 'base64');
    expect(fromB58.equals(fromB64)).toBe(true);
  });

  it('rejects a payload that is not valid base58', () => {
    // '0OIl' are the characters excluded from the base58 alphabet.
    expect(() => decodeTransactionPayload('0OIl_not_base58', 'base58')).toThrow();
  });
});

describe('Transaction deserialization round-trip', () => {
  it('reconstructs the original instruction from a base58 payload', () => {
    const raw = buildTx();
    const tx = Transaction.from(decodeTransactionPayload(bs58.encode(raw), 'base58'));

    expect(tx.instructions).toHaveLength(1);
    expect(tx.instructions[0].programId.toBase58()).toBe('11111111111111111111111111111111');
    expect(tx.feePayer?.toBase58()).toBe('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1');
  });
});

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
