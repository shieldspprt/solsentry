import { createClient as createServerSupabaseClient } from '../utils/supabase/server';
import { createClient as createBrowserSupabaseClient } from '../utils/supabase/client';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export { createServerSupabaseClient, createBrowserSupabaseClient };

// Admin client using service role key for backend operations & migrations
export const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  return createAdminClient(url, serviceKey);
};
