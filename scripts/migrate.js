const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const password = process.env.SUPABASE_PASSWORD;
  const user = process.env.SUPABASE_DB_USER;
  const host = process.env.SUPABASE_DB_HOST;
  const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
  const database = process.env.SUPABASE_DB_NAME || 'postgres';

  if (!user || !host || !password) {
    console.error('SUPABASE_DB_USER, SUPABASE_DB_HOST, and SUPABASE_PASSWORD must be set in environment');
    process.exit(1);
  }

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
    await client.query("ALTER TABLE protocols ADD COLUMN IF NOT EXISTS institutional_metrics JSONB DEFAULT '{}';");
    console.log('Successfully applied sql/schema.sql and ensured institutional_metrics column!');

    // Feature migrations. These were previously listed in the docs but never
    // applied here, so protocol_metric_snapshots and push_subscriptions did not
    // exist in any deployed database — trend history could never accumulate and
    // every snapshot write failed silently.
    for (const file of ['snapshots.sql', 'push.sql']) {
      console.log(`Applying sql/${file}...`);
      const sql = fs.readFileSync(path.join(__dirname, `../sql/${file}`), 'utf8');
      await client.query(sql);
      console.log(`Successfully applied sql/${file}!`);
    }

    // Read and execute rls-policies.sql
    console.log('Applying sql/rls-policies.sql...');
    const rlsSql = fs.readFileSync(path.join(__dirname, '../sql/rls-policies.sql'), 'utf8');
    await client.query(rlsSql);
    console.log('Successfully applied sql/rls-policies.sql!');

    // Verify every table the app reads actually exists.
    for (const table of ['protocols', 'agents', 'risk_checks', 'positions', 'protocol_metric_snapshots', 'push_subscriptions']) {
      const r = await client.query(`SELECT count(*) FROM ${table};`);
      console.log(`  ${table.padEnd(26)} rows=${r.rows[0].count}`);
    }

  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runMigration();
