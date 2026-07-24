const { createClient } = require('@supabase/supabase-js');
const registry = require('../lib/protocol-registry.json');
require('dotenv').config({ path: '.env.local' });

// Seeds protocol IDENTITY only — slug, name, category, program IDs, audit
// record. It deliberately does not write tvl_usd or risk_score: those are
// measured at request time from DeFiLlama and the scorer. This script used to
// carry its own protocol list with its own hardcoded risk scores, which drifted
// from lib/ and shipped program IDs that do not exist on mainnet.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const RPC = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';

// A program ID that does not resolve to an executable account is worse than no
// data: the protocol page renders it as a Solscan "verification" link, and an
// agent checking a transaction against it would be verifying against nothing.
async function assertProgramsExist(protocols) {
  const bad = [];
  for (const p of protocols) {
    for (const id of p.program_ids) {
      try {
        const res = await fetch(RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [id, { encoding: 'base64' }] }),
        });
        const value = (await res.json())?.result?.value;
        if (!value) bad.push(`${p.slug}: ${id} — account does not exist`);
        else if (!value.executable) bad.push(`${p.slug}: ${id} — exists but is not executable`);
        else console.log(`  ok  ${p.slug.padEnd(10)} ${id}`);
      } catch (err) {
        bad.push(`${p.slug}: ${id} — RPC check failed (${err.message})`);
      }
    }
  }
  return bad;
}

async function seed() {
  const protocols = registry.protocols;

  console.log(`Verifying ${protocols.length} protocols' program IDs against mainnet...`);
  const bad = await assertProgramsExist(protocols);
  if (bad.length > 0) {
    console.error('\nRefusing to seed — these program IDs are not live programs on mainnet:');
    bad.forEach((b) => console.error(`  FAIL ${b}`));
    process.exit(1);
  }

  const rows = protocols.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    program_ids: p.program_ids,
    audit_status: p.audit_status,
    auditors: p.auditors,
    audit_date: p.audit_date,
    oracle_provider: p.oracle_provider,
  }));

  console.log(`\nSeeding ${rows.length} protocols into Supabase...`);
  const { error } = await supabase.from('protocols').upsert(rows, { onConflict: 'slug' });
  if (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }

  const { count } = await supabase.from('protocols').select('*', { count: 'exact', head: true });
  console.log(`Done. protocols table now holds ${count} rows.`);
  console.log('Run POST /api/v1/sync to populate live TVL and grounded risk scores.');
}

seed();
