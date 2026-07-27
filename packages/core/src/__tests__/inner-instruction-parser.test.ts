import { describe, expect, it } from 'vitest';
import bs58 from 'bs58';
import {
  extractHiddenTokenTransfers,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '../simulation/inner-instruction-parser';

function encodedTransfer(discriminator: 3 | 12, amount: bigint): string {
  const bytes = Buffer.alloc(discriminator === 3 ? 9 : 10);
  bytes[0] = discriminator;
  bytes.writeBigUInt64LE(amount, 1);
  if (discriminator === 12) bytes[9] = 6;
  return bs58.encode(bytes);
}

describe('inner instruction parser', () => {
  it('parses jsonParsed transfer and transferChecked instructions', () => {
    const transfers = extractHiddenTokenTransfers(
      [
        {
          index: 2,
          instructions: [
            {
              programId: TOKEN_PROGRAM_ID,
              stackHeight: 2,
              parsed: {
                type: 'transfer',
                info: { source: 'source-a', destination: 'dest-a', authority: 'owner-a', amount: '42' },
              },
            },
            {
              programId: TOKEN_2022_PROGRAM_ID,
              parsed: {
                type: 'transferChecked',
                info: {
                  source: 'source-b',
                  mint: 'mint-b',
                  destination: 'dest-b',
                  authority: 'owner-b',
                  tokenAmount: { amount: '9001', decimals: 6 },
                },
              },
            },
          ],
        },
      ],
      []
    );

    expect(transfers).toEqual([
      {
        programId: TOKEN_PROGRAM_ID,
        sourceAccount: 'source-a',
        destinationAccount: 'dest-a',
        authorityAccount: 'owner-a',
        amount: '42',
        mint: undefined,
        instructionType: 'transfer',
        parentInstructionIndex: 2,
        stackHeight: 2,
      },
      {
        programId: TOKEN_2022_PROGRAM_ID,
        sourceAccount: 'source-b',
        destinationAccount: 'dest-b',
        authorityAccount: 'owner-b',
        amount: '9001',
        mint: 'mint-b',
        instructionType: 'transferChecked',
        parentInstructionIndex: 2,
        stackHeight: undefined,
      },
    ]);
  });

  it('decodes compiled SPL transfer account indexes and little-endian amounts', () => {
    const accountKeys = ['source', 'destination', 'authority', TOKEN_PROGRAM_ID];
    const transfers = extractHiddenTokenTransfers(
      [
        {
          index: 0,
          instructions: [
            {
              programIdIndex: 3,
              accounts: [0, 1, 2],
              data: encodedTransfer(3, 4_294_967_299n),
              stackHeight: 3,
            },
          ],
        },
      ],
      accountKeys
    );

    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({
      programId: TOKEN_PROGRAM_ID,
      sourceAccount: 'source',
      destinationAccount: 'destination',
      authorityAccount: 'authority',
      amount: '4294967299',
      instructionType: 'transfer',
      parentInstructionIndex: 0,
      stackHeight: 3,
    });
  });

  it('decodes partially-decoded Token-2022 transferChecked instructions', () => {
    const transfers = extractHiddenTokenTransfers(
      [
        {
          index: 4,
          instructions: [
            {
              programId: TOKEN_2022_PROGRAM_ID,
              accounts: ['source', 'mint', 'destination', 'authority'],
              data: encodedTransfer(12, 1_500_000n),
            },
          ],
        },
      ],
      []
    );

    expect(transfers[0]).toEqual({
      programId: TOKEN_2022_PROGRAM_ID,
      sourceAccount: 'source',
      mint: 'mint',
      destinationAccount: 'destination',
      authorityAccount: 'authority',
      amount: '1500000',
      instructionType: 'transferChecked',
      parentInstructionIndex: 4,
      stackHeight: undefined,
    });
  });

  it('ignores malformed data, unsupported instructions, and non-token programs', () => {
    const unsupported = Buffer.from([7, 1, 2, 3]);
    const accountKeys = ['source', 'destination', 'authority', '11111111111111111111111111111111', TOKEN_PROGRAM_ID];

    expect(
      extractHiddenTokenTransfers(
        [
          {
            instructions: [
              { programIdIndex: 4, accounts: [0, 1, 2], data: 'not base58 !' },
              { programIdIndex: 4, accounts: [0, 1, 2], data: bs58.encode(unsupported) },
              { programIdIndex: 3, accounts: [0, 1, 2], data: encodedTransfer(3, 10n) },
              { programId: TOKEN_PROGRAM_ID, parsed: { type: 'approve', info: {} } },
            ],
          },
        ],
        accountKeys
      )
    ).toEqual([]);
  });
});
