const { buildGroundedMetrics } = require('../packages/core/src/data-fetchers/grounded-metrics');
const { computeProtocolRisk } = require('../packages/core/src/risk-scorer');

async function testGrounding() {
  console.log('Testing live Pyth, Helius & DeFiLlama telemetry fetch for Kamino...');
  const sample = { slug: 'kamino', name: 'Kamino Finance', category: 'lending', tvl_usd: 1053815624 };
  const grounded = await buildGroundedMetrics(sample);
  console.log('Grounded Telemetry Result:');
  console.log('- Live TVL:', grounded.tvl_usd);
  console.log('- Sources Live:', grounded.sources_live);
  console.log('- Oracle Slot Lag:', grounded.metrics.oracle_slot_lag_ms, 'ms');
  console.log('- Whale Concentration:', grounded.metrics.whale_concentration_pct, '%');
  console.log('- Data Freshness:', grounded.metrics.data_freshness_pct, '%');
  
  const breakdown = computeProtocolRisk({ ...sample, institutional_metrics: grounded.metrics }, { provenance: grounded.provenance });
  console.log('- Composite Risk Score:', breakdown.composite_risk_score);
  console.log('- Provenance Sources:', breakdown.factors.map(f => `${f.key}: ${f.source} (${f.confidence * 100}%)`));
}

testGrounding();
