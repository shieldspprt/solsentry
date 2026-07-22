const fs = require('fs');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fptxzwsadfsscyujfgqr.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const hostname = supabaseUrl.replace('https://', '').replace('/', '');

async function executeSql(filename) {
  const sql = fs.readFileSync(filename, 'utf8');
  const postData = JSON.stringify({ query: sql });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path: '/pg/sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Executing schema.sql...');
  const res1 = await executeSql('sql/schema.sql');
  console.log('Schema Execution Status:', res1.status, res1.body.substring(0, 300));

  console.log('Executing rls-policies.sql...');
  const res2 = await executeSql('sql/rls-policies.sql');
  console.log('RLS Execution Status:', res2.status, res2.body.substring(0, 300));
}

run().catch(console.error);
