import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { detectDrainerPatterns, BalanceDeltaSummary, DrainerScanResult } from './drainer-detector';
import { extractHiddenTokenTransfers, HiddenTokenTransfer } from './inner-instruction-parser';
import { logger } from '../../../../lib/logger';

export interface TokenDelta {
  /** Token account whose balance changed. */
  account: string;
  /** Wallet owner reported by the RPC, when available. */
  owner?: string;
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
  hiddenTransfers: HiddenTokenTransfer[];
  drainerScan: DrainerScanResult;
  logs: string[];
  errorMessage?: string;
}

// Decode a serialized transaction payload to raw bytes.
//
// Node's Buffer has no base58 encoding. This previously passed 'hex' as the
// base58 fallback, which silently decoded base58 input into garbage — so the
// DEFAULT encoding, the one used by the CLI, the SDK and every doc example,
// never deserialized a real transaction. The unit tests all passed because they
// only covered failure paths, where garbage-in produced the expected error.
//
// Exported so the decode step can be tested without touching the network.
export function decodeTransactionPayload(
  serializedTx: string,
  encoding: 'base58' | 'base64' = 'base58'
): Buffer {
  if (encoding === 'base64') {
    const buf = Buffer.from(serializedTx, 'base64');
    // Buffer.from(..., 'base64') never throws; it silently drops invalid
    // characters. Round-trip to confirm the input really was base64.
    if (buf.length === 0) throw new Error('Empty payload after base64 decode');
    return buf;
  }
  return Buffer.from(bs58.decode(serializedTx.trim()));
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
      hiddenTransfers: [],
      drainerScan: {
        isDrainerPattern: false,
        riskLevel: 'SAFE',
        scorePenalty: 0,
        warnings: ['Empty or invalid transaction payload provided'],
        detectedPatterns: [],
        observations: [],
      },
      logs: [],
      errorMessage: 'Transaction payload string is required',
    };
  }

  const connection = getRpcConnection();

  let buffer: Buffer;
  try {
    buffer = decodeTransactionPayload(serializedTx, encoding);
  } catch (err: any) {
    logger.warn('tx_decode_failed', { encoding, error: err?.message });
    return {
      success: false,
      status: 'INVALID_TRANSACTION',
      unitsConsumed: 0,
      highComputeWarning: false,
      netTokenDeltas: [],
      hiddenTransfers: [],
      drainerScan: {
        isDrainerPattern: false,
        riskLevel: 'SAFE',
        scorePenalty: 0,
        warnings: [`Payload is not valid ${encoding}. Check the encoding parameter.`],
        detectedPatterns: [],
        observations: [],
      },
      logs: [],
      errorMessage: `Could not decode the payload as ${encoding}`,
    };
  }

  let legacyTx: Transaction | null = null;
  let versionedTx: VersionedTransaction | null = null;

  try {
    // Try legacy first. VersionedTransaction.deserialize accepts many legacy
    // buffers without throwing and then misreads them, so probing versioned
    // first silently mangles ordinary transactions.
    try {
      legacyTx = Transaction.from(buffer);
    } catch {
      versionedTx = VersionedTransaction.deserialize(buffer);
    }
  } catch (err: any) {
    logger.warn('tx_deserialization_failed', { error: err.message });
    return {
      success: false,
      status: 'INVALID_TRANSACTION',
      unitsConsumed: 0,
      highComputeWarning: false,
      netTokenDeltas: [],
      hiddenTransfers: [],
      drainerScan: {
        isDrainerPattern: false,
        riskLevel: 'SAFE',
        scorePenalty: 0,
        warnings: ['Failed to deserialize Solana transaction payload'],
        detectedPatterns: [],
        observations: [],
      },
      logs: [],
      errorMessage: 'Failed to deserialize transaction payload: ' + err.message,
    };
  }

  try {
    // Use the versioned simulation overload for both transaction formats. The
    // RPC replaces the blockhash, so signed transactions can be simulated
    // without mutating their message or invalidating signatures locally.
    const finalTx = versionedTx ?? new VersionedTransaction(legacyTx!.compileMessage());
    const simRes = await connection.simulateTransaction(
      finalTx,
      { sigVerify: false, replaceRecentBlockhash: true, innerInstructions: true } as any
    );

    const value = simRes.value;
    const loadedAddresses = (value as any).loadedAddresses as
      | { writable?: Array<{ toString(): string } | string>; readonly?: Array<{ toString(): string } | string> }
      | undefined;
    // Versioned messages may reference address lookup tables. Inner instruction
    // account indexes address static keys first, then loaded writable/read-only
    // keys, so include all three groups when resolving transfer accounts.
    const accountKeys = [
      ...finalTx.message.staticAccountKeys.map((key) => key.toString()),
      ...(loadedAddresses?.writable ?? []).map((key) => key.toString()),
      ...(loadedAddresses?.readonly ?? []).map((key) => key.toString()),
    ];
    const hiddenTransfers = extractHiddenTokenTransfers((value as any).innerInstructions || [], accountKeys);
    const logs = value.logs || [];
    const unitsConsumed = value.unitsConsumed || 0;
    const highComputeWarning = unitsConsumed > 200_000;

    const netTokenDeltas: TokenDelta[] = [];
    const balanceDeltas: BalanceDeltaSummary[] = [];

    // Parse pre and post token balances if returned
    const preTokenBalances = (value as any).preTokenBalances || [];
    const postTokenBalances = (value as any).postTokenBalances || [];

    const balanceMap = new Map<
      string,
      { pre: number; post: number; mint: string; account: string; owner?: string }
    >();

    for (const pre of preTokenBalances) {
      const key = `${pre.accountIndex}_${pre.mint}`;
      balanceMap.set(key, {
        pre: pre.uiTokenAmount?.uiAmount || 0,
        post: 0,
        mint: pre.mint,
        account: accountKeys[pre.accountIndex] || `Account #${pre.accountIndex}`,
        owner: pre.owner || undefined,
      });
    }

    for (const post of postTokenBalances) {
      const key = `${post.accountIndex}_${post.mint}`;
      const existing = balanceMap.get(key) || {
        pre: 0,
        post: 0,
        mint: post.mint,
        account: accountKeys[post.accountIndex] || `Account #${post.accountIndex}`,
        owner: post.owner || undefined,
      };
      existing.post = post.uiTokenAmount?.uiAmount || 0;
      balanceMap.set(key, existing);
    }

    for (const [, item] of balanceMap.entries()) {
      const delta = item.post - item.pre;
      if (Math.abs(delta) > 0.000001) {
        netTokenDeltas.push({
          account: item.account,
          owner: item.owner,
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
          assetType: 'token',
          owner: item.owner,
          mint: item.mint,
        });
      }
    }

    // Native SOL sweep detection is scoped to the fee payer. Looking at every
    // program/vault account touched by a DeFi transaction would misclassify
    // routine pool movements as wallet drains.
    const preLamports = (value as any).preBalances?.[0];
    const postLamports = (value as any).postBalances?.[0];
    const feePayer = accountKeys[0];
    if (typeof preLamports === 'number' && typeof postLamports === 'number' && feePayer) {
      const preSol = preLamports / 1_000_000_000;
      const postSol = postLamports / 1_000_000_000;
      const deltaSol = postSol - preSol;
      if (Math.abs(deltaSol) > 0.000001) {
        balanceDeltas.push({
          account: feePayer,
          preBalanceSol: preSol,
          postBalanceSol: postSol,
          netDeltaSol: deltaSol,
          pctChange: preSol > 0 ? (deltaSol / preSol) * 100 : deltaSol > 0 ? 100 : -100,
          assetType: 'native',
          owner: feePayer,
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

    const drainerScan = detectDrainerPatterns(instructionLogs, balanceDeltas, hiddenTransfers);

    return {
      success: !value.err,
      status: value.err ? 'SIMULATION_ERROR' : 'SUCCESS',
      unitsConsumed,
      highComputeWarning,
      netTokenDeltas,
      hiddenTransfers,
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
      hiddenTransfers: [],
      drainerScan: {
        isDrainerPattern: false,
        riskLevel: 'SAFE',
        scorePenalty: 0,
        warnings: ['RPC simulation call failed'],
        detectedPatterns: [],
        observations: [],
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
