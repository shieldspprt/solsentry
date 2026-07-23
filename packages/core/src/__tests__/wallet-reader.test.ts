import { describe, it, expect } from 'vitest';
import { isValidSolanaAddress } from '../wallet-reader';

describe('Solana Wallet Address Validator', () => {
  it('should return true for valid base58 Solana public keys', () => {
    expect(isValidSolanaAddress('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF')).toBe(true);
    expect(isValidSolanaAddress('JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN')).toBe(true);
    expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true);
  });

  it('should return false for invalid base58 characters, invalid lengths, or empty strings', () => {
    expect(isValidSolanaAddress('')).toBe(false);
    expect(isValidSolanaAddress('0123')).toBe(false); // too short
    expect(isValidSolanaAddress('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF000000')).toBe(false); // too long
    expect(isValidSolanaAddress('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF0O')).toBe(false); // '0' and 'O' are invalid in base58
    expect(isValidSolanaAddress('javascript:alert(1)')).toBe(false);
  });
});
