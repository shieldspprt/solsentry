import { createHash, randomBytes } from 'crypto';
import { getSupabaseAdmin } from './supabase-admin';

export function issueApiKey(): { key: string; hash: string; prefix: string } {
  const raw = randomBytes(24).toString('hex');
  const key = `ss_${raw}`;
  const hash = createHash('sha256').update(key).digest('hex');
  const prefix = key.slice(0, 11);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function verifyApiKey(key: string): Promise<string | null> {
  if (!key || typeof key !== 'string' || !key.startsWith('ss_')) {
    return null;
  }
  try {
    const hash = hashApiKey(key);
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('users').select('id').eq('api_key_hash', hash).maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
}
