#!/usr/bin/env node

import { Command } from 'commander';
import { SolSentryClient } from '../../sdk/src/index';

const program = new Command();

program
  .name('solsentry')
  .description('SolSentry CLI - Quantitative Risk Management for Solana AI Agents')
  .version('3.0.0');

// Global options
program
  .option('-k, --api-key <key>', 'API key for authentication')
  .option('-e, --endpoint <url>', 'SolSentry API base URL', 'https://solsentry.io')
  .option('-v, --verbose', 'Enable verbose output', false);

// Command: solsentry check <protocol>
program
  .command('check <protocol>')
  .description('Quick risk check for a Solana protocol')
  .option('-d, --details', 'Show detailed factor breakdown')
  .action(async (protocol, options) => {
    try {
      const apiKey = process.env.SOLSENTRY_API_KEY || program.opts().apiKey;
      const baseUrl = program.opts().endpoint;

      console.log(`Checking quantitative risk for ${protocol}...`);
      const client = new SolSentryClient({ apiKey, baseUrl });
      const result = await client.checkProtocolRisk(protocol);

      const score = result.safetyScore;
      const tier = result.riskTier;
      const rec = result.recommendation;

      console.log('\n============================================================');
      console.log(`${protocol.toUpperCase()} Risk Assessment (SolSentry v3.0.0)`);
      console.log('============================================================');
      console.log(`Safety Score:   ${score}/10`);
      console.log(`Risk Tier:      ${tier.toUpperCase()}`);
      console.log(`Recommendation: ${rec.toUpperCase()}`);
      console.log(`Agent Decision: ${result.agentDecision}`);

      if (options.details && result.factors) {
        console.log('\nFactor Breakdown:');
        console.table(
          result.factors.map((f) => ({
            Factor: f.name,
            Score: `${f.score}/10`,
            Details: f.details || 'OK',
          }))
        );
      }
    } catch (err: any) {
      console.error('Error executing risk check:', err.message);
      process.exit(1);
    }
  });

// Command: solsentry simulate <transaction>
program
  .command('simulate <transaction>')
  .description('Pre-execution simulation and drainer scan for a serialized Solana transaction payload')
  .option('-e, --encoding <encoding>', 'Transaction payload encoding (base58 or base64)', 'base58')
  .action(async (txInput, options) => {
    try {
      const apiKey = process.env.SOLSENTRY_API_KEY || program.opts().apiKey;
      const baseUrl = program.opts().endpoint;

      console.log('Simulating transaction payload...');
      const client = new SolSentryClient({ apiKey, baseUrl });
      const result = await client.simulateTransaction({
        transaction: txInput,
        encoding: options.encoding === 'base64' ? 'base64' : 'base58',
      });

      console.log('\n============================================================');
      console.log('SolSentry Pre-Execution Simulation Result');
      console.log('============================================================');
      console.log(`Status:            ${result.status}`);
      console.log(`Compute Units:     ${result.unitsConsumed.toLocaleString()} CU`);
      console.log(`High Compute Warning: ${result.highComputeWarning ? 'YES (>200k CU)' : 'NO'}`);
      console.log(`Drainer Risk:      ${result.drainerScan.riskLevel}`);

      if (result.drainerScan.warnings.length > 0) {
        console.log('\nSecurity Warnings:');
        result.drainerScan.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
      }

      if (result.netTokenDeltas.length > 0) {
        console.log('\nNet Token Balance Deltas:');
        console.table(
          result.netTokenDeltas.map((d) => ({
            Account: d.account,
            Mint: `${d.mint.slice(0, 8)}...`,
            Pre: d.preAmount,
            Post: d.postAmount,
            Delta: d.delta >= 0 ? `+${d.delta}` : `${d.delta}`,
          }))
        );
      }
    } catch (err: any) {
      console.error('Error simulating transaction:', err.message);
      process.exit(1);
    }
  });

// Command: solsentry policy <action> <protocol> <amountUsd>
program
  .command('policy <action> <protocol> <amountUsd>')
  .description('Evaluate trade policy guardrails')
  .action(async (action, protocol, amountUsdStr) => {
    try {
      const apiKey = process.env.SOLSENTRY_API_KEY || program.opts().apiKey;
      const baseUrl = program.opts().endpoint;
      const amountUsd = parseFloat(amountUsdStr);

      console.log(`Evaluating policy for ${action} of $${amountUsd} on ${protocol}...`);
      const client = new SolSentryClient({ apiKey, baseUrl });
      const result = await client.evaluatePolicy({
        action: action as any,
        protocolSlug: protocol,
        amountUsd,
      });

      console.log('\n============================================================');
      console.log('SolSentry Trade Policy Evaluation');
      console.log('============================================================');
      console.log(`Decision:       ${result.decision}`);
      console.log(`Max Allowed:    $${result.maxAllowedUsd}`);

      if (result.blockingReasons && result.blockingReasons.length > 0) {
        console.log('\nBlocking Reasons:');
        result.blockingReasons.forEach((r) => console.log(`  ❌ ${r}`));
      }

      if (result.saferAlternatives && result.saferAlternatives.length > 0) {
        console.log('\nSafer Alternatives:');
        result.saferAlternatives.forEach((a) => console.log(`  💡 ${a}`));
      }
    } catch (err: any) {
      console.error('Error evaluating policy:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
