import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import { detectDrainerPatterns, BalanceDeltaSummary, DrainerScanResult } from './drainer-detector';
import { logger } from '../../../../lib/logger';

export interface TokenDelta {
  account: string;
  mint: string;
  tokenSymbol?: string;
  preAmount: number;
  postAmount: number;
  delta: number;
}

export interface TxSimulationResult {
  success: boolean;
  status: 'SUCCESS' | 'SIMULATION_ERROR' | 'INVALID_TRANSACTION';
  unitsConsumed: number;
  highComputeWarning: boolean;
  netTokenDeltas: TokenDelta[];
  drainerScan: DrainerScanResult;
  logs: string[];
  errorMessage?: string;
}

function getRpcConnection(): Connection {
  const rpcUrl =
    process.env.HELIUS_RPC_URL ||
    process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
    'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, { commitment: 'confirmed' });
}

export async function simulateSolanaTransaction(
  serializedTx: string,
  encoding: 'base58' | 'base64' = 'base58'
): Promise<TxSimulationResult> {
  if (!serializedTx || typeof serializedTx !== 'string') {
    return {
      success: false,
      status: 'INVALID_TRANSACTION',
      unitsConsumed: 0,
      highComputeWarning: false,
      netTokenDeltas: [],
      drainerScan: {
        isDrainerPattern: false,
        riskLevel: 'SAFE',
        scorePenalty: 0,
        warnings: ['Empty or invalid transaction payload provided'],
        detectedPatterns: [],
      },
      logs: [],
      errorMessage: 'Transaction payload string is required',
    };
  }

  const connection = getRpcConnection();
  const buffer = Buffer.from(serializedTx, encoding === 'base64' ? 'base64' : 'hex');

  let legacyTx: Transaction | null = null;
  let versionedTx: VersionedTransaction | null = null;

  try {
    try {
      versionedTx = VersionedTransaction.deserialize(buffer);
    } catch {
      legacyTx = Transaction.from(buffer);
    }
  } catch (err: any) {
    logger.warn('tx_deserialization_failed', { error: err.message });
    return {
      success: false,
      status: 'INVALID_TRANSACTION',
      unitsConsumed: 0,
      highComputeWarning: false,
      netTokenDeltas: [],
      drainerScan: {
        isDrainerPattern: false,
        riskLevel: 'SAFE',
        scorePenalty: 0,
        warnings: ['Failed to deserialize Solana transaction payload'],
        detectedPatterns: [],
      },
      logs: [],
      errorMessage: 'Failed to deserialize transaction payload: ' + err.message,
    };
  }

  try {
    const latestBlockhash = await connection.getLatestBlockhash();
    if (legacyTx) {
      legacyTx.recentBlockhash = latestBlockhash.blockhash;
    }

    const simRes = versionedTx
      ? await connection.simulateTransaction(versionedTx, { sigVerify: false })
      : await connection.simulateTransaction(legacyTx!, undefined, false);

    const value = simRes.value;
    const logs = value.logs || [];
    const unitsConsumed = value.unitsConsumed || 0;
    const highComputeWarning = unitsConsumed > 200_000;

    const netTokenDeltas: TokenDelta[] = [];
    const balanceDeltas: BalanceDeltaSummary[] = [];

    // Parse pre and post token balances if returned
    const preBalances = (value as any).preTokenBalances || [];
    const postBalances = (value as any).postTokenBalances || [];

    const balanceMap = new Map<string, { pre: number; post: number; mint: string; account: string }>();

    for (const pre of preBalances) {
      const key = `${pre.accountIndex}_${pre.mint}`;
      balanceMap.set(key, {
        pre: pre.uiTokenAmount?.uiAmount || 0,
        post: 0,
        mint: pre.mint,
        account: pre.owner || `Account #${pre.accountIndex}`,
      });
    }

    for (const post of postBalances) {
      const key = `${post.accountIndex}_${post.mint}`;
      const existing = balanceMap.get(key) || {
        pre: 0,
        post: 0,
        mint: post.mint,
        account: post.owner || `Account #${post.accountIndex}`,
      };
      existing.post = post.uiTokenAmount?.uiAmount || 0;
      balanceMap.set(key, existing);
    }

    for (const [, item] of balanceMap.entries()) {
      const delta = item.post - item.pre;
      if (Math.abs(delta) > 0.000001) {
        netTokenDeltas.push({
          account: item.account,
          mint: item.mint,
          preAmount: item.pre,
          postAmount: item.post,
          delta,
        });

        const pctChange = item.pre > 0 ? (delta / item.pre) * 100 : delta > 0 ? 100 : -100;
        balanceDeltas.push({
          account: item.account,
          preBalanceSol: item.pre,
          postBalanceSol: item.post,
          netDeltaSol: delta,
          pctChange,
        });
      }
    }

    // Inspect logs for instruction types
    const instructionLogs = logs.map((l) => ({
      parsedName: l.toLowerCase().includes('approve')
        ? 'approve'
        : l.toLowerCase().includes('setauthority')
        ? 'setauthority'
        : l.toLowerCase().includes('transfer')
        ? 'transfer'
        : l.toLowerCase().includes('closeaccount')
        ? 'closeaccount'
        : undefined,
    }));

    const drainerScan = detectDrainerPatterns(instructionLogs, balanceDeltas);

    return {
      success: !value.err,
      status: value.err ? 'SIMULATION_ERROR' : 'SUCCESS',
      unitsConsumed,
      highComputeWarning,
      netTokenDeltas,
      drainerScan,
      logs,
      errorMessage: value.err ? JSON.stringify(value.err) : undefined,
    };
  } catch (err: any) {
    logger.error('tx_simulation_rpc_failed', { error: err.message });
    return {
      success: false,
      status: 'SIMULATION_ERROR',
      unitsConsumed: 0,
      highComputeWarning: false,
      netTokenDeltas: [],
      drainerScan: {
        isDrainerPattern: false,
        riskLevel: 'SAFE',
        scorePenalty: 0,
        warnings: ['RPC simulation call failed'],
        detectedPatterns: [],
      },
      logs: [],
      errorMessage: err.message,
    };
  }
}

export interface BundleSimulationResult {
  success: boolean;
  totalTransactions: number;
  successfulCount: number;
  totalUnitsConsumed: number;
  aggregateTokenDeltas: TokenDelta[];
  results: TxSimulationResult[];
}

export async function simulateSolanaBundle(
  transactions: string[],
  encoding: 'base58' | 'base64' = 'base58'
): Promise<BundleSimulationResult> {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      success: false,
      totalTransactions: 0,
      successfulCount: 0,
      totalUnitsConsumed: 0,
      aggregateTokenDeltas: [],
      results: [],
    };
  }

  const results: TxSimulationResult[] = [];
  let totalUnits = 0;
  let successCount = 0;
  const deltaMap = new Map<string, TokenDelta>();

  for (const txStr of transactions) {
    const res = await simulateSolanaTransaction(txStr, encoding);
    results.push(res);
    if (res.success) successCount++;
    totalUnits += res.unitsConsumed;

    for (const delta of res.netTokenDeltas) {
      const key = `${delta.account}_${delta.mint}`;
      const cur = deltaMap.get(key) || {
        account: delta.account,
        mint: delta.mint,
        preAmount: delta.preAmount,
        postAmount: delta.postAmount,
        delta: 0,
      };
      cur.postAmount = delta.postAmount;
      cur.delta += delta.delta;
      deltaMap.set(key, cur);
    }
  }

  return {
    success: successCount === transactions.length,
    totalTransactions: transactions.length,
    successfulCount: successCount,
    totalUnitsConsumed: totalUnits,
    aggregateTokenDeltas: Array.from(deltaMap.values()),
    results,
  };
}
