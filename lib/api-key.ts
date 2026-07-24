import { createClient } from '@supabase/supabase-js';

export function issueApiKey(): { key: string; hash: string; prefix: string } {
  // Key material must be cryptographically random. Falling back to Math.random()
  // would mint guessable credentials, so we fail loudly instead.
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('Cannot issue API key: no cryptographic RNG available in this runtime');
  }
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hexString = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const key = `ss_${hexString}`;
  const prefix = key.slice(0, 11);
  const hash = hashApiKeySync(key);
  return { key, hash, prefix };
}

function hashApiKeySync(key: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    if (nodeCrypto && nodeCrypto.createHash) {
      return nodeCrypto.createHash('sha256').update(key).digest('hex');
    }
  } catch {
    // fall through
  }

  // The previous fallback here was a 32-bit non-cryptographic string hash,
  // left-padded to look like SHA-256. Collisions in that space are trivial to
  // find, so a runtime without a real hash must not silently produce one.
  // Edge callers should use hashApiKeyAsync(), which uses WebCrypto.
  throw new Error('Cannot hash API key: no SHA-256 implementation available in this runtime');
}

export async function hashApiKeyAsync(key: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return hashApiKeySync(key);
}

export function hashApiKey(key: string): string {
  return hashApiKeySync(key);
}

function getDirectSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'solsentry-apikey@3.0.0' } },
  });
}

export async function verifyApiKey(key: string): Promise<string | null> {
  if (!key || typeof key !== 'string' || !key.startsWith('ss_')) {
    return null;
  }
  try {
    const hash = await hashApiKeyAsync(key);
    const supabase = getDirectSupabaseAdmin();
    if (!supabase) return null;

    const { data } = await supabase.from('users').select('id').eq('api_key_hash', hash).maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}

export async function rotateApiKey(userId: string): Promise<{ key: string; prefix: string }> {
  const { key, hash, prefix } = issueApiKey();
  const supabase = getDirectSupabaseAdmin();
  if (!supabase) throw new Error('Supabase client unconfigured');

  const { error } = await supabase
    .from('users')
    .update({ api_key_hash: hash, api_key_prefix: prefix, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(`Key rotation failed: ${error.message}`);
  return { key, prefix };
}
