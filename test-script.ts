import { Connection, PublicKey } from '@solana/web3.js';
async function test() {
  const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  // Just testing the type
}
test();