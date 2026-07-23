import { describe, it, expect } from 'vitest';
import { issueApiKey, hashApiKey, hashApiKeyAsync, verifyApiKey } from '../../../../lib/api-key';

describe('API Key Management & Hashing', () => {
  it('should issue API key with ss_ prefix and valid SHA-256 hash', async () => {
    const { key, hash, prefix } = issueApiKey();
    expect(key).toMatch(/^ss_[a-f0-9]{48}$/);
    expect(prefix).toBe(key.slice(0, 11));
    expect(hash).toHaveLength(64);

    const syncHash = hashApiKey(key);
    expect(syncHash).toBe(hash);

    const asyncHash = await hashApiKeyAsync(key);
    expect(asyncHash).toBe(hash);
  });

  it('should reject malformed or non-ss keys in verifyApiKey', async () => {
    expect(await verifyApiKey('')).toBeNull();
    expect(await verifyApiKey('invalid_key')).toBeNull();
    expect(await verifyApiKey('bearer_12345')).toBeNull();
  });
});
