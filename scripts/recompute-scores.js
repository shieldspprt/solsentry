const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function computeScore(p) {
  let auditScore = p.audit_status === 'audited' ? 9.5 : 4.0;
  if (p.auditors && p.auditors.length > 1) auditScore = 10.0;

  const tvl = p.tvl_usd || 0;
  let tvlScore = 3.0;
  if (tvl >= 500000000) tvlScore = 10.0;
  else if (tvl >= 100000000) tvlScore = 9.0;
  else if (tvl >= 10000000) tvlScore = 7.5;
  else if (tvl >= 1000000) tvlScore = 5.5;

  let oracleScore = p.oracle_health === 'healthy' ? 10.0 : 4.0;

  const score = Math.round((auditScore * 0.35 + tvlScore * 0.25 + oracleScore * 0.25 + 10.0 * 0.15) * 10) / 10;
  return score;
}

async function recompute() {
  console.log('Recomputing protocol risk scores with live TVL numbers...');
  const { data: protocols } = await supabase.from('protocols').select('*');

  if (!protocols) return;

  for (const p of protocols) {
    const score = computeScore(p);
    console.log(`Protocol ${p.name}: Live Risk Score = ${score} / 10`);
    await supabase.from('protocols').update({ risk_score: score }).eq('id', p.id);
  }

  console.log('Risk score recomputation complete!');
}

recompute();
