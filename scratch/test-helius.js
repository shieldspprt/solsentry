const https = require('https');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.HELIUS_API_KEY || 'd60e2680-f668-43d0-a021-f8d4c2e20b07';
const devnetUrl = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;

console.log('Testing Helius Devnet RPC connection...');
console.log('Target URL:', `https://devnet.helius-rpc.com/?api-key=${apiKey.substring(0, 8)}...`);

const tests = [
  { jsonrpc: '2.0', id: 1, method: 'getHealth' },
  { jsonrpc: '2.0', id: 2, method: 'getVersion' },
  { jsonrpc: '2.0', id: 3, method: 'getBlockHeight' },
  { jsonrpc: '2.0', id: 4, method: 'getEpochInfo' }
];

async function runTests() {
  for (const testPayload of tests) {
    const dataString = JSON.stringify(testPayload);
    await new Promise((resolve) => {
      const req = https.request(devnetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`Method '${testPayload.method}' Response [HTTP ${res.statusCode}]:`, body);
          resolve();
        });
      });
      req.on('error', (err) => {
        console.error(`Method '${testPayload.method}' Error:`, err.message);
        resolve();
      });
      req.write(dataString);
      req.end();
    });
  }
}

runTests();
