const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const password = process.env.SUPABASE_PASSWORD;
  const user = 'postgres.fptxzwsadfsscyujfgqr';
  const host = 'aws-0-eu-west-1.pooler.supabase.com';
  const port = 5432;
  const database = 'postgres';

  console.log(`Connecting to Postgres at ${host}:${port} as ${user}...`);

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully!');

    // Read and execute schema.sql
    console.log('Applying sql/schema.sql...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('Successfully applied sql/schema.sql!');

    // Read and execute rls-policies.sql
    console.log('Applying sql/rls-policies.sql...');
    const rlsSql = fs.readFileSync(path.join(__dirname, '../sql/rls-policies.sql'), 'utf8');
    await client.query(rlsSql);
    console.log('Successfully applied sql/rls-policies.sql!');

    // Query protocols table to verify
    const res = await client.query('SELECT count(*) FROM protocols;');
    console.log('Verified protocols table count:', res.rows[0].count);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
