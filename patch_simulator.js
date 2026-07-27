const fs = require('fs');
let content = fs.readFileSync('packages/core/src/simulation/tx-simulator.ts', 'utf8');

const regex = /const simRes = versionedTx[\s\S]*?: await connection\.simulateTransaction\(legacyTx!, undefined, false\);/m;

const replacement = `    // Unify all into a VersionedTransaction so we can use the SimulateTransactionConfig config
    let finalTx: VersionedTransaction;
    if (versionedTx) {
      finalTx = versionedTx;
    } else {
      const msg = legacyTx!.compileMessage();
      finalTx = new VersionedTransaction(
        import_web3.MessageV0.compile({
          payerKey: legacyTx!.feePayer || new import_web3.PublicKey('11111111111111111111111111111111'),
          instructions: legacyTx!.instructions,
          recentBlockhash: legacyTx!.recentBlockhash || '11111111111111111111111111111111'
        })
      );
    }

    const simRes = await connection.simulateTransaction(finalTx, { sigVerify: false, innerInstructions: true } as any);
    
    // Parse inner instructions for deep traces
    const accountKeys = finalTx.message.staticAccountKeys.map(k => k.toString());
    const hiddenTransfers = extractHiddenTokenTransfers((simRes.value as any).innerInstructions || [], accountKeys);
`;

content = content.replace(regex, replacement);
// We need to make sure import_web3 is correct. Let's just use MessageV0 directly.
content = content.replace('import_web3.MessageV0', 'MessageV0');
content = content.replace('import_web3.PublicKey', 'PublicKey');

// Add MessageV0 and PublicKey to imports
content = content.replace("import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';", "import { Connection, Transaction, VersionedTransaction, MessageV0, PublicKey } from '@solana/web3.js';");

fs.writeFileSync('packages/core/src/simulation/tx-simulator.ts', content);
