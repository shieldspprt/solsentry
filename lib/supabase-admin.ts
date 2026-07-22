import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

// Direct Supabase Admin JS Client (bypasses RLS for server-side trusted operations)
export const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fptxzwsadfsscyujfgqr.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment');
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Raw PostgreSQL Client for direct DDL / SQL queries
export const getPgClient = () => {
  const host = process.env.SUPABASE_DB_HOST || 'aws-0-eu-west-1.pooler.supabase.com';
  const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
  const database = process.env.SUPABASE_DB_NAME || 'postgres';
  const user = process.env.SUPABASE_DB_USER || 'postgres.fptxzwsadfsscyujfgqr';
  const password = process.env.SUPABASE_PASSWORD;

  return new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false },
  });
};
