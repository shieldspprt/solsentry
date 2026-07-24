#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { SolSentryClient } from '@solsentry/sdk';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const program = new Command();

program
  .name('solsentry')
  .description('SolSentry CLI - Risk Management for Solana AI Agents')
  .version('1.0.0');

// Global options
program
  .option('-k, --api-key <key>', 'API key for authentication')
  .option('-e, --endpoint <url>', 'SolSentry API endpoint', 'https://api.solsentry.io')
  .option('-v, --verbose', 'Enable verbose output', false);

// Check protocol risk
program
  .command('check <protocol>')
  .description('Quick risk check for a protocol')
  .option('-d, --details', 'Show detailed factor breakdown')
  .action(async (protocol, options) => {
    const spinner = ora(`Checking risk for ${chalk.cyan(protocol)}...`).start();
    
    try {
      const apiKey = process.env.SOLSENTRY_API_KEY || program.opts().apiKey;
      const endpoint = program.opts().endpoint;
      
      if (!apiKey) {
        spinner.warn('No API key provided. Use --api-key or set SOLSENTRY_API_KEY');
      }

      const client = new SolSentryClient({ apiKey, endpoint });
      const result = await client.checkProtocolRisk(protocol);
      
      spinner.stop();
      
      // Display summary
      const score = result.composite_risk_score;
      const tier = result.risk_tier;
      const recommendation = result.action_recommendation;
      
      console.log('\n' + '='.repeat(60));
      console.log(`${chalk.bold(protocol.toUpperCase())} Risk Assessment`);
      console.log('='.repeat(60));
      
      // Color-coded score
      let scoreColor: keyof typeof chalk;
      if (score >= 8.5) scoreColor = 'green';
      else if (score >= 7.0) scoreColor = 'yellow';
      else if (score >= 5.0) scoreColor = 'orange';
      else scoreColor = 'red';
      
      console.log(`\n${chalk.bold('Composite Score:')} ${chalk[scoreColor](score.toFixed(1) + '/10')}`);
      console.log(`${chalk.bold('Risk Tier:')} ${chalk[tier === 'critical' ? 'red' : tier === 'high' ? 'orange' : tier === 'medium' ? 'yellow' : 'green'](tier.toUpperCase())}`);
      console.log(`${chalk.bold('Recommendation:')} ${chalk.blue(recommendation.replace(/_/g, ' ').toUpperCase())}`);
      
      if (options.details && result.factors) {
        console.log('\n' + chalk.bold('Factor Breakdown:'));
        
        const factorData = result.factors.map(f => [
          f.label,
          f.score.toFixed(1),
          `${(f.weight * 100).toFixed(0)}%`,
          f.contribution.toFixed(1),
          f.value !== null ? `${f.value}${f.unit}` : 'N/A'
        ]);
        
        const config = {
          columns: {
            0: { width: 25 },
            1: { width: 8, alignment: 'right' },
            2: { width: 8, alignment: 'right' },
            3: { width: 12, alignment: 'right' },
            4: { width: 15 }
          }
        };
        
        console.log(table(
          [['Factor', 'Score', 'Weight', 'Contrib', 'Value'], ...factorData],
          config
        ));
      }
      
      if (result.critical_warnings && result.critical_warnings.length > 0) {
        console.log('\n' + chalk.red.bold('⚠️  Critical Warnings:'));
        result.critical_warnings.forEach(w => console.log(`   • ${w}`));
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
      
    } catch (error) {
      spinner.fail();
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Simulate transaction
program
  .command('simulate <transaction>')
  .description('Simulate a transaction before execution')
  .option('--drainer-scan', 'Run drainer detection', true)
  .option('--verbose', 'Show full simulation details')
  .action(async (transaction, options) => {
    const spinner = ora('Simulating transaction...').start();
    
    try {
      const apiKey = process.env.SOLSENTRY_API_KEY || program.opts().apiKey;
      const endpoint = program.opts().endpoint;
      
      const client = new SolSentryClient({ apiKey, endpoint });
      const result = await client.simulateTransaction(transaction, {
        includeDrainerScan: options.drainerScan,
      });
      
      spinner.stop();
      
      console.log('\n' + '='.repeat(60));
      console.log(chalk.bold('Transaction Simulation Results'));
      console.log('='.repeat(60));
      
      if (result.isDrainer) {
        console.log('\n' + chalk.red.bold('🚨 DRAINER DETECTED - DO NOT EXECUTE 🚨'));
        if (result.drainerIndicators) {
          console.log('\nSuspicious indicators:');
          result.drainerIndicators.forEach(indicator => {
            console.log(`   • ${indicator}`);
          });
        }
      } else {
        console.log('\n' + chalk.green('✓ No drainer patterns detected'));
      }
      
      if (result.tokenDeltas && result.tokenDeltas.length > 0) {
        console.log('\nToken Changes:');
        const deltaData = result.tokenDeltas.map(d => [
          d.mint,
          d.symbol || 'Unknown',
          (d.amount > 0 ? '+' : '') + d.amount.toString(),
          d.usdValue ? `$${d.usdValue.toFixed(2)}` : 'N/A'
        ]);
        
        console.log(table(
          [['Mint', 'Symbol', 'Change', 'USD Value'], ...deltaData]
        ));
      }
      
      if (result.estimatedSlippagePct) {
        console.log(`\nEstimated Slippage: ${chalk.yellow(result.estimatedSlippagePct.toFixed(2) + '%')}`);
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
      
    } catch (error) {
      spinner.fail();
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List protocols
program
  .command('list')
  .description('List all tracked protocols with risk scores')
  .option('-c, --category <category>', 'Filter by category (lending, dex, perps, etc.)')
  .option('--min-score <score>', 'Minimum risk score to display')
  .action(async (options) => {
    const spinner = ora('Fetching protocol list...').start();
    
    try {
      const apiKey = process.env.SOLSENTRY_API_KEY || program.opts().apiKey;
      const endpoint = program.opts().endpoint;
      
      const client = new SolSentryClient({ apiKey, endpoint });
      let protocols = await client.getProtocolList();
      
      // Apply filters
      if (options.category) {
        protocols = protocols.filter(p => p.category === options.category);
      }
      
      if (options.minScore) {
        const minScore = parseFloat(options.minScore);
        protocols = protocols.filter(p => (p.risk_score || 0) >= minScore);
      }
      
      spinner.stop();
      
      console.log('\n' + '='.repeat(80));
      console.log(chalk.bold('SolSentry Protocol Tracker'));
      console.log('='.repeat(80));
      
      const protocolData = protocols.map(p => {
        const score = p.risk_score || 0;
        let scoreColor: keyof typeof chalk;
        if (score >= 8.5) scoreColor = 'green';
        else if (score >= 7.0) scoreColor = 'yellow';
        else if (score >= 5.0) scoreColor = 'orange';
        else scoreColor = 'red';
        
        return [
          p.name,
          p.category,
          chalk[scoreColor](score.toFixed(1)),
          p.tvl_usd ? `$${(p.tvl_usd / 1e6).toFixed(1)}M` : 'N/A',
          p.audit_status === 'audited' ? chalk.green('✓') : chalk.red('✗')
        ];
      });
      
      const config = {
        columns: {
          0: { width: 20 },
          1: { width: 12 },
          2: { width: 8, alignment: 'right' },
          3: { width: 12, alignment: 'right' },
          4: { width: 8, alignment: 'center' }
        }
      };
      
      console.log(table(
        [['Protocol', 'Category', 'Score', 'TVL', 'Audited'], ...protocolData],
        config
      ));
      
      console.log(`\nTotal: ${protocols.length} protocols\n`);
      
    } catch (error) {
      spinner.fail();
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Policy evaluation
program
  .command('policy <action>')
  .description('Evaluate an action against policy rules')
  .argument('<action>', 'Action type: lend, borrow, swap, lp, stake, perp_long, perp_short')
  .option('--protocol <slug>', 'Target protocol')
  .option('--amount <usd>', 'Amount in USD')
  .option('--agent <id>', 'Agent ID')
  .action(async (action, options) => {
    const spinner = ora('Evaluating policy...').start();
    
    try {
      const apiKey = process.env.SOLSENTRY_API_KEY || program.opts().apiKey;
      const endpoint = program.opts().endpoint;
      
      const client = new SolSentryClient({ apiKey, endpoint });
      
      const result = await client.evaluatePolicy({
        agentId: options.agent || 'default',
        action: action as any,
        protocolSlug: options.protocol,
        amountUsd: options.amount ? parseFloat(options.amount) : undefined,
      });
      
      spinner.stop();
      
      console.log('\n' + '='.repeat(60));
      console.log(chalk.bold('Policy Evaluation'));
      console.log('='.repeat(60));
      
      const status = result.allowed ? chalk.green('✓ ALLOWED') : chalk.red('✗ BLOCKED');
      console.log(`\nStatus: ${status}`);
      
      if (!result.allowed && result.violations && result.violations.length > 0) {
        console.log('\nViolations:');
        result.violations.forEach(v => {
          console.log(`   • ${v.rule}: ${v.message}`);
        });
      }
      
      if (result.suggestedAction) {
        console.log(`\nSuggested Action: ${chalk.blue(result.suggestedAction)}`);
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
      
    } catch (error) {
      spinner.fail();
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Backtesting (placeholder for future implementation)
program
  .command('backtest <strategy>')
  .description('Backtest a trading strategy with historical risk data')
  .option('--start <date>', 'Start date (YYYY-MM-DD)')
  .option('--end <date>', 'End date (YYYY-MM-DD)')
  .option('--risk-threshold <score>', 'Minimum risk score threshold')
  .action(async (strategy, options) => {
    console.log(chalk.yellow('⚠️  Backtesting feature coming soon!'));
    console.log('This will allow you to replay historical risk scores and simulate trades.\n');
  });

// Configure autonomy
program
  .command('autonomy:configure')
  .description('Configure autonomous agent settings')
  .option('--deleverage-threshold <hf>', 'Health factor threshold for auto-deleveraging')
  .option('--daily-loss-limit <usd>', 'Daily loss limit in USD')
  .option('--rebalance-threshold <pct>', 'Rebalancing threshold percentage')
  .action(async (options) => {
    console.log(chalk.yellow('⚠️  Autonomy configuration coming soon!'));
    console.log('This will allow you to set up auto-deleveraging, circuit breakers, and rebalancing.\n');
  });

// Version command
program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log(`SolSentry CLI v${program.version()}`);
    console.log('Risk management infrastructure for Solana AI agents');
  });

// Parse and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
