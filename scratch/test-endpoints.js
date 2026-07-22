const https = require('https');
require('dotenv').config({ path: '.env.local' });

const ref = 'fptxzwsadfsscyujfgqr';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const endpoints = [
  `/v1/projects/${ref}/db/query`,
  `/rest/v1/rpc`,
  `/pg/query`,
  `/db/query`
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ query: 'SELECT NOW();' });
    const req = https.request({
      hostname: `${ref}.supabase.co`,
      path: path,
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
      res.on('end', () => resolve({ path, status: res.statusCode, data: data.substring(0, 150) }));
    });
    req.on('error', (err) => resolve({ path, error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    console.log(res);
  }
}

run();
