const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const initialProtocols = [
  {
    slug: 'kamino',
    name: 'Kamino Finance',
    category: 'lending',
    program_ids: ['6LtLMovXri1PGVYrS4UfLS5WZZKPv3779e5v94vL8f65'],
    audit_status: 'audited',
    auditors: ['OtterSec', 'Neodyme'],
    oracle_provider: 'pyth',
    risk_score: 8.5,
  },
  {
    slug: 'drift',
    name: 'Drift Protocol',
    category: 'perps',
    program_ids: ['dRifTKGMS62nXiXYdYXxQPhuEGfqySUR36v232w3W6x'],
    audit_status: 'audited',
    auditors: ['OtterSec', 'Halborn'],
    oracle_provider: 'pyth',
    risk_score: 8.2,
  },
  {
    slug: 'jupiter',
    name: 'Jupiter',
    category: 'dex',
    program_ids: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
    audit_status: 'audited',
    auditors: ['OtterSec'],
    oracle_provider: 'pyth',
    risk_score: 9.2,
  },
  {
    slug: 'orca',
    name: 'Orca',
    category: 'dex',
    program_ids: ['whirLbxic2xrFuFvyfuNhUfcvX4WzL3Hyq89nAgyXAL'],
    audit_status: 'audited',
    auditors: ['OtterSec', 'Neodyme'],
    oracle_provider: 'pyth',
    risk_score: 9.0,
  },
  {
    slug: 'raydium',
    name: 'Raydium',
    category: 'dex',
    program_ids: ['675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'],
    audit_status: 'audited',
    auditors: ['OtterSec'],
    oracle_provider: 'pyth',
    risk_score: 8.0,
  },
  {
    slug: 'meteora',
    name: 'Meteora',
    category: 'dex',
    program_ids: ['LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'],
    audit_status: 'audited',
    auditors: ['OtterSec'],
    oracle_provider: 'pyth',
    risk_score: 8.4,
  },
  {
    slug: 'marinade',
    name: 'Marinade Finance',
    category: 'staking',
    program_ids: ['MarBGuTtEwyd1bcsQmAcvM5ftJLrgSpM9vC6xWwa1Bu'],
    audit_status: 'audited',
    auditors: ['OtterSec', 'Neodyme'],
    oracle_provider: 'pyth',
    risk_score: 9.4,
  },
  {
    slug: 'jito',
    name: 'Jito',
    category: 'staking',
    program_ids: ['Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4gF3f14kr'],
    audit_status: 'audited',
    auditors: ['OtterSec'],
    oracle_provider: 'pyth',
    risk_score: 9.1,
  },
];

async function seed() {
  console.log('Seeding protocols into Supabase...');
  const { data, error } = await supabase.from('protocols').upsert(initialProtocols, { onConflict: 'slug' });
  if (error) {
    console.error('Seeding failed:', error.message);
  } else {
    console.log('Successfully seeded protocols into Supabase!');
  }
}

seed();
