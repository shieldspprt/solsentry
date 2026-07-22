const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const protocolMapping = [
  { slug: 'kamino', llamaSlug: 'kamino-lend' },
  { slug: 'drift', llamaSlug: 'drift' },
  { slug: 'jupiter', llamaSlug: 'jupiter' },
  { slug: 'orca', llamaSlug: 'orca' },
  { slug: 'raydium', llamaSlug: 'raydium' },
  { slug: 'meteora', llamaSlug: 'meteora' },
  { slug: 'marinade', llamaSlug: 'marinade' },
  { slug: 'jito', llamaSlug: 'jito' },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AgentGate/1.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function syncLiveData() {
  console.log('Fetching live TVL data from DeFiLlama public API...');

  for (const item of protocolMapping) {
    try {
      const data = await fetchJson(`https://api.llama.fi/protocol/${item.llamaSlug}`);
      let tvl = 0;
      if (data && data.tvl && data.tvl.length > 0) {
        tvl = data.tvl[data.tvl.length - 1].totalLiquidityUSD || 0;
      }
      console.log(`Protocol ${item.slug}: Live TVL = $${Math.round(tvl).toLocaleString()}`);

      await supabase
        .from('protocols')
        .update({
          tvl_usd: Math.round(tvl),
          oracle_health: 'healthy',
          last_updated: new Date().toISOString(),
        })
        .eq('slug', item.slug);
    } catch (err) {
      console.error(`Failed to fetch TVL for ${item.slug}:`, err.message);
    }
  }

  console.log('Live data sync completed successfully!');
}

syncLiveData();
