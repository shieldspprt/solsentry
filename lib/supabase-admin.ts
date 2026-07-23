import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

// Direct Supabase Admin JS Client (bypasses RLS for server-side trusted operations)
export const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'FATAL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment. ' +
      'Refusing to start without explicit configuration.'
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: { headers: { 'x-client-info': 'solsentry-server@3.0.0' } },
  });
};

// Raw PostgreSQL Client for direct DDL / SQL queries
export const getPgClient = () => {
  const host = process.env.SUPABASE_DB_HOST;
  const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
  const database = process.env.SUPABASE_DB_NAME || 'postgres';
  const user = process.env.SUPABASE_DB_USER;
  const password = process.env.SUPABASE_PASSWORD;

  for (const [k, v] of Object.entries({ host, user, password })) {
    if (!v) {
      throw new Error(`FATAL: ${k} environment variable is required for direct Postgres access.`);
    }
  }

  return new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === 'false'
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });
};
