import { Connection, PublicKey, Transaction, SystemProgram, Keypair, VersionedTransaction, MessageV0 } from '@solana/web3.js';

async function test() {
  const conn = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const payer = Keypair.generate();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: new PublicKey('11111111111111111111111111111111'),
      lamports: 100
    })
  );
  tx.recentBlockhash = '11111111111111111111111111111111';
  tx.feePayer = payer.publicKey;
  const msg = tx.compileMessage();
  const v0 = new VersionedTransaction(MessageV0.compile({
    payerKey: payer.publicKey,
    recentBlockhash: '11111111111111111111111111111111',
    instructions: tx.instructions
  }));
  
  const res = await conn.simulateTransaction(v0, { sigVerify: false, innerInstructions: true } as any);
  console.log(JSON.stringify(res.value, null, 2));
}

test().catch(console.error);