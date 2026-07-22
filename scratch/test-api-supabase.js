const https = require('https');
require('dotenv').config({ path: '.env.local' });

const ref = 'fptxzwsadfsscyujfgqr';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testApiSupabase() {
  const postData = JSON.stringify({ query: 'SELECT 1;' });
  const req = https.request({
    hostname: 'api.supabase.com',
    path: `/v1/projects/${ref}/database/query`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('api.supabase.com status:', res.statusCode, data));
  });
  req.on('error', (err) => console.error(err));
  req.write(postData);
  req.end();
}

testApiSupabase();
