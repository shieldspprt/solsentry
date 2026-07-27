const fs = require('fs');
let content = fs.readFileSync('packages/core/src/simulation/drainer-detector.ts', 'utf8');

// Insert hidden transfer logic before Pattern 2
const insertLogic = `
  // Pattern 1.5: Deeply hidden transfers without clear approvals
  for (const transfer of hiddenTransfers) {
    // If we detect a CPI transfer that isn't cleanly mapped to a standard interface, flag it
    detectedPatterns.push(\`Hidden Token Transfer via CPI: \${transfer.amount} tokens moved from \${transfer.sourceAccount}\`);
    warnings.push(\`Notice: A token transfer (\${transfer.instructionType}) occurred deep within an inner instruction call.\`);
    scorePenalty += 10;
  }
`;

content = content.replace('// Pattern 2: Balance Drain', insertLogic + '\n  // Pattern 2: Balance Drain');
fs.writeFileSync('packages/core/src/simulation/drainer-detector.ts', content);
