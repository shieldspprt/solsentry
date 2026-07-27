import { CompiledInnerInstruction, Message, ParsedInnerInstruction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export interface HiddenTokenTransfer {
  programId: string;
  sourceAccount: string;
  destinationAccount: string;
  authorityAccount?: string;
  amount: number | string; // usually a large number or string of lamports
  mint?: string;
  instructionType: 'transfer' | 'transferChecked' | 'unknown';
}

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5CGWgPhbxnWALxcfTo5cw4WMm4n';

/**
 * Parses inner instructions to uncover token movements hidden deep in CPI calls.
 */
export function extractHiddenTokenTransfers(
  innerInstructions: any[], // ParsedInnerInstruction[] or CompiledInnerInstruction[] depending on RPC
  accountKeys: string[] // needed if we only get programIdIndex/accounts indices
): HiddenTokenTransfer[] {
  if (!innerInstructions || innerInstructions.length === 0) return [];

  const transfers: HiddenTokenTransfer[] = [];

  for (const inner of innerInstructions) {
    if (!inner.instructions) continue;

    for (const ix of inner.instructions) {
      let programId = '';
      let isTokenProgram = false;

      // Handle jsonParsed instruction format
      if ('parsed' in ix) {
        programId = ix.programId?.toString() || '';
        isTokenProgram = programId === TOKEN_PROGRAM_ID || programId === TOKEN_2022_PROGRAM_ID;

        if (isTokenProgram && ix.parsed && typeof ix.parsed === 'object' && ix.parsed.type) {
          const type = ix.parsed.type;
          const info = ix.parsed.info;

          if (type === 'transfer' || type === 'transferChecked') {
            transfers.push({
              programId,
              sourceAccount: info?.source || '',
              destinationAccount: info?.destination || '',
              authorityAccount: info?.authority || '',
              amount: info?.amount || info?.tokenAmount?.amount || '0',
              mint: info?.mint,
              instructionType: type
            });
          }
        }
        continue; // Handled parsed format
      }

      // Handle partially decoded or compiled instruction format
      if ('programIdIndex' in ix) {
        programId = accountKeys[ix.programIdIndex] || '';
      } else if (ix.programId) {
        programId = ix.programId.toString();
      }

      isTokenProgram = programId === TOKEN_PROGRAM_ID || programId === TOKEN_2022_PROGRAM_ID;

      if (isTokenProgram && ix.data) {
        let rawData: Buffer;
        if (typeof ix.data === 'string') {
          try {
            rawData = Buffer.from(bs58.decode(ix.data));
          } catch {
            continue;
          }
        } else {
          rawData = Buffer.from(ix.data); // assume Uint8Array
        }

        if (rawData.length === 0) continue;

        const ixType = rawData[0];
        
        // 3 = Transfer
        // Layout: [u8, u64] -> length 9
        if (ixType === 3 && rawData.length >= 9) {
          const amount = rawData.readBigUInt64LE(1).toString();
          
          let sourceAccount = '';
          let destinationAccount = '';
          let authorityAccount = '';

          // Find accounts based on format
          if (ix.accounts && ix.accounts.length >= 3) {
             // Compiled format using indices
             if (typeof ix.accounts[0] === 'number') {
               sourceAccount = accountKeys[ix.accounts[0]] || '';
               destinationAccount = accountKeys[ix.accounts[1]] || '';
               authorityAccount = accountKeys[ix.accounts[2]] || '';
             } else {
               // PartiallyDecodedInstruction format using pubkeys
               sourceAccount = ix.accounts[0].toString();
               destinationAccount = ix.accounts[1].toString();
               authorityAccount = ix.accounts[2].toString();
             }
          }

          transfers.push({
            programId,
            sourceAccount,
            destinationAccount,
            authorityAccount,
            amount,
            instructionType: 'transfer'
          });
        }
        
        // 12 = TransferChecked
        // Layout: [u8, u64, u8] -> length 10
        if (ixType === 12 && rawData.length >= 10) {
          const amount = rawData.readBigUInt64LE(1).toString();
          
          let sourceAccount = '';
          let mint = '';
          let destinationAccount = '';
          let authorityAccount = '';

          if (ix.accounts && ix.accounts.length >= 4) {
             if (typeof ix.accounts[0] === 'number') {
               sourceAccount = accountKeys[ix.accounts[0]] || '';
               mint = accountKeys[ix.accounts[1]] || '';
               destinationAccount = accountKeys[ix.accounts[2]] || '';
               authorityAccount = accountKeys[ix.accounts[3]] || '';
             } else {
               sourceAccount = ix.accounts[0].toString();
               mint = ix.accounts[1].toString();
               destinationAccount = ix.accounts[2].toString();
               authorityAccount = ix.accounts[3].toString();
             }
          }

          transfers.push({
            programId,
            sourceAccount,
            destinationAccount,
            authorityAccount,
            mint,
            amount,
            instructionType: 'transferChecked'
          });
        }
      }
    }
  }

  return transfers;
}
