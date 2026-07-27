import bs58 from 'bs58';

export interface HiddenTokenTransfer {
  programId: string;
  sourceAccount: string;
  destinationAccount: string;
  authorityAccount?: string;
  amount: string;
  mint?: string;
  instructionType: 'transfer' | 'transferChecked';
  /** Index of the top-level instruction that invoked this CPI transfer. */
  parentInstructionIndex?: number;
  /** RPC stack height when available. */
  stackHeight?: number;
}

interface ParsedTokenInstruction {
  programId?: { toString(): string } | string;
  parsed?: {
    type?: unknown;
    info?: Record<string, unknown>;
  };
  stackHeight?: number | null;
}

interface CompiledTokenInstruction {
  programIdIndex?: number;
  programId?: { toString(): string } | string;
  accounts?: Array<number | { toString(): string } | string>;
  data?: string | Uint8Array;
  stackHeight?: number | null;
}

interface InnerInstructionGroup {
  index?: number;
  instructions?: Array<ParsedTokenInstruction | CompiledTokenInstruction>;
}

export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5CGWgPhbxnWALxcfTo5cw4WMm4n';

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toString' in value) return String(value);
  return '';
}

function accountAt(
  accounts: CompiledTokenInstruction['accounts'],
  position: number,
  accountKeys: string[]
): string {
  const account = accounts?.[position];
  if (typeof account === 'number') return accountKeys[account] ?? '';
  return asString(account);
}

function programIdFor(ix: CompiledTokenInstruction, accountKeys: string[]): string {
  if (typeof ix.programIdIndex === 'number') return accountKeys[ix.programIdIndex] ?? '';
  return asString(ix.programId);
}

function isTokenProgram(programId: string): boolean {
  return programId === TOKEN_PROGRAM_ID || programId === TOKEN_2022_PROGRAM_ID;
}

function amountFromParsedInfo(info: Record<string, unknown>): string {
  const direct = info.amount;
  if (typeof direct === 'string' || typeof direct === 'number' || typeof direct === 'bigint') {
    return String(direct);
  }

  const tokenAmount = info.tokenAmount;
  if (tokenAmount && typeof tokenAmount === 'object' && 'amount' in tokenAmount) {
    const amount = (tokenAmount as { amount?: unknown }).amount;
    if (typeof amount === 'string' || typeof amount === 'number' || typeof amount === 'bigint') {
      return String(amount);
    }
  }
  return '0';
}

/**
 * Parse SPL Token and Token-2022 transfers performed through CPI calls.
 *
 * The RPC can return parsed, partially-decoded, or fully compiled inner
 * instructions. This function deliberately reports movement only; a CPI token
 * transfer is normal in swaps, lending, and staking and is not itself evidence
 * of a drainer. Correlation with authority changes and balance sweeps happens in
 * the drainer detector.
 */
export function extractHiddenTokenTransfers(
  innerInstructions: InnerInstructionGroup[] | null | undefined,
  accountKeys: string[]
): HiddenTokenTransfer[] {
  if (!Array.isArray(innerInstructions) || innerInstructions.length === 0) return [];

  const transfers: HiddenTokenTransfer[] = [];

  for (const inner of innerInstructions) {
    if (!Array.isArray(inner.instructions)) continue;

    for (const instruction of inner.instructions) {
      if ('parsed' in instruction && instruction.parsed) {
        const programId = asString(instruction.programId);
        const type = instruction.parsed.type;
        const info = instruction.parsed.info;
        if (!isTokenProgram(programId) || (type !== 'transfer' && type !== 'transferChecked') || !info) continue;

        transfers.push({
          programId,
          sourceAccount: asString(info.source),
          destinationAccount: asString(info.destination),
          authorityAccount: asString(info.authority) || undefined,
          amount: amountFromParsedInfo(info),
          mint: asString(info.mint) || undefined,
          instructionType: type,
          parentInstructionIndex: inner.index,
          stackHeight: instruction.stackHeight ?? undefined,
        });
        continue;
      }

      const ix = instruction as CompiledTokenInstruction;
      const programId = programIdFor(ix, accountKeys);
      if (!isTokenProgram(programId) || !ix.data) continue;

      let rawData: Buffer;
      try {
        rawData = typeof ix.data === 'string' ? Buffer.from(bs58.decode(ix.data)) : Buffer.from(ix.data);
      } catch {
        continue;
      }
      if (rawData.length === 0) continue;

      const instructionDiscriminator = rawData[0];
      if (instructionDiscriminator === 3 && rawData.length >= 9) {
        transfers.push({
          programId,
          sourceAccount: accountAt(ix.accounts, 0, accountKeys),
          destinationAccount: accountAt(ix.accounts, 1, accountKeys),
          authorityAccount: accountAt(ix.accounts, 2, accountKeys) || undefined,
          amount: rawData.readBigUInt64LE(1).toString(),
          instructionType: 'transfer',
          parentInstructionIndex: inner.index,
          stackHeight: ix.stackHeight ?? undefined,
        });
      } else if (instructionDiscriminator === 12 && rawData.length >= 10) {
        transfers.push({
          programId,
          sourceAccount: accountAt(ix.accounts, 0, accountKeys),
          mint: accountAt(ix.accounts, 1, accountKeys) || undefined,
          destinationAccount: accountAt(ix.accounts, 2, accountKeys),
          authorityAccount: accountAt(ix.accounts, 3, accountKeys) || undefined,
          amount: rawData.readBigUInt64LE(1).toString(),
          instructionType: 'transferChecked',
          parentInstructionIndex: inner.index,
          stackHeight: ix.stackHeight ?? undefined,
        });
      }
    }
  }

  return transfers;
}
