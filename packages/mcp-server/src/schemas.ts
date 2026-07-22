import { z } from 'zod';

export const ALLOWED_PROTOCOLS = [
  'kamino',
  'drift',
  'jupiter',
  'orca',
  'raydium',
  'meteora',
  'marinade',
  'jito',
  'pumpfun',
] as const;

export const ALLOWED_ACTIONS = [
  'swap',
  'lend',
  'borrow',
  'lp',
  'stake',
  'perp_long',
  'perp_short',
  'buy_bonding_curve',
] as const;

export const CheckProtocolRiskSchema = z.object({
  protocolSlug: z.enum(ALLOWED_PROTOCOLS, {
    message: 'Invalid protocolSlug. Must be a registered Solana protocol (kamino, drift, jupiter, orca, raydium, meteora, marinade, jito, pumpfun).',
  }),
});

export const EvaluatePolicySchema = z.object({
  action: z.enum(ALLOWED_ACTIONS, {
    message: 'Invalid action. Must be a supported trading action (swap, lend, borrow, lp, stake, perp_long, perp_short, buy_bonding_curve).',
  }),
  protocolSlug: z.enum(ALLOWED_PROTOCOLS, {
    message: 'Invalid protocolSlug. Must be a registered Solana protocol.',
  }),
  amountUsd: z.number().positive({
    message: 'Invalid amountUsd. Transaction amount in USD must be greater than zero.',
  }),
  // Optional portfolio state so daily-volume, drawdown, and position-count
  // guardrails actually bind. Without these, only single-tx + risk floor apply.
  currentDailyVolumeUsd: z.number().min(0).optional(),
  currentDrawdownPct: z.number().min(0).optional(),
  openPositionsCount: z.number().int().min(0).optional(),
});

export const PreflightSchema = z.object({
  action: z.enum(ALLOWED_ACTIONS, {
    message: 'Invalid action. Must be a supported trading action.',
  }),
  protocolSlug: z.enum(ALLOWED_PROTOCOLS, {
    message: 'Invalid protocolSlug. Must be a registered Solana protocol.',
  }),
  amountUsd: z.number().positive({
    message: 'Invalid amountUsd. Must be greater than zero.',
  }),
  currentDailyVolumeUsd: z.number().min(0).optional(),
  currentDrawdownPct: z.number().min(0).optional(),
  openPositionsCount: z.number().int().min(0).optional(),
});

export const StressTestSchema = z.object({
  protocolSlug: z.enum(ALLOWED_PROTOCOLS).optional(),
  agentId: z.string().optional(),
  walletAddress: z.string().min(32).max(44).optional(),
  priceShockPct: z
    .number()
    .min(-95)
    .max(0)
    .optional()
    .describe('Adverse price move to simulate, e.g. -20. Omit to run the standard suite (-10/-20/-35).'),
});

export const GetPositionHealthSchema = z.object({
  agentId: z.string().optional(),
  protocolSlug: z.enum(ALLOWED_PROTOCOLS).optional(),
  // When provided, reads REAL on-chain positions for this Solana wallet
  // (live health factors) instead of stored/default positions.
  walletAddress: z.string().min(32).max(44).optional(),
});

export const GetBusinessRatiosSchema = z.object({
  protocolSlug: z.enum(ALLOWED_PROTOCOLS, {
    message: 'Invalid protocolSlug. Must be a registered Solana protocol.',
  }),
});
