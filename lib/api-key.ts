import { createClient } from '@supabase/supabase-js';

export function issueApiKey(): { key: string; hash: string; prefix: string } {
  let hexString = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    hexString = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    hexString = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
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
    // Edge environment fallback
  }

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
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
