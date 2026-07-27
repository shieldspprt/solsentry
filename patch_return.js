const fs = require('fs');
let content = fs.readFileSync('packages/core/src/simulation/tx-simulator.ts', 'utf8');

const regex = /netTokenDeltas,\n      drainerScan,\n      logs,/m;
const replacement = `netTokenDeltas,\n      hiddenTransfers,\n      drainerScan,\n      logs,`;

content = content.replace(regex, replacement);
fs.writeFileSync('packages/core/src/simulation/tx-simulator.ts', content);
