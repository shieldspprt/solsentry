import { Connection, PublicKey } from '@solana/web3.js';
import { checkPaymentMiddleware, getMinimumPayment } from '../packages/payment/src/index';

// x402 pay-per-call gate.
//
// Payment is OFF unless X402_RECIPIENT_WALLET is configured. That is deliberate:
// a metering layer that switches itself on by default would break every existing
// caller, including this project's own dashboard. Configure the wallet to turn
// it on; leave it unset and every endpoint stays free.
//
// It is wired to /api/v1/simulate specifically. The simulator is the capability
// worth paying for — it inspects the actual bytes an agent is about to sign, and
// nothing else here can be reproduced from public APIs in an afternoon. Metering
// the risk score instead would charge for something a caller could rebuild from
// DeFiLlama and Pyth directly.

export interface PaymentGateResult {
  /** True when the request may proceed. */
  allowed: boolean;
  /** Set when payment is required — send back as HTTP 402. */
  paymentRequired?: {
    amountUsdc: number;
    paymentAddress?: string;
    memo?: string;
    expiresAt?: number;
    network: string;
    reason: string;
  };
}

const ALLOWED: PaymentGateResult = { allowed: true };

function getMerchantWallet(): PublicKey | null {
  const raw = process.env.X402_RECIPIENT_WALLET;
  if (!raw) return null;
  try {
    return new PublicKey(raw);
  } catch {
    // A malformed wallet must not silently disable billing OR hard-fail every
    // request; treat it as unconfigured and let the caller through.
    return null;
  }
}

function getConnection(): Connection | null {
  const rpc = process.env.HELIUS_RPC_URL || process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (!rpc) return null;
  return new Connection(rpc, 'confirmed');
}

/**
 * Gate a tool call behind an x402 USDC payment.
 *
 * @param toolName  Pricing key, e.g. 'simulate_transaction'.
 * @param paymentHeader  Value of the X-402-Payment header (a tx signature).
 */
export async function enforcePayment(
  toolName: string,
  paymentHeader?: string | null
): Promise<PaymentGateResult> {
  const merchantWallet = getMerchantWallet();
  if (!merchantWallet) return ALLOWED; // billing not configured — stay free

  // A zero-priced tool is free by definition; do not demand a payment header
  // for it just because billing is switched on globally.
  if (getMinimumPayment(toolName) <= 0) return ALLOWED;

  const connection = getConnection();
  if (!connection) {
    // We cannot verify a payment without an RPC. Failing open is the right call:
    // charging without being able to confirm settlement is worse than not
    // charging, and refusing service on our own misconfiguration is worse still.
    return ALLOWED;
  }

  try {
    const result = await checkPaymentMiddleware(connection, toolName, paymentHeader || undefined, merchantWallet);
    if (result.allowed) return ALLOWED;

    return {
      allowed: false,
      paymentRequired: {
        amountUsdc: result.paymentRequired,
        paymentAddress: result.paymentInstruction?.paymentAddress,
        memo: result.paymentInstruction?.memo,
        expiresAt: result.paymentInstruction?.expiresAt,
        network: process.env.X402_NETWORK || 'mainnet-beta',
        reason:
          result.error ||
          'Payment required. Send the USDC amount to paymentAddress, then retry with the transaction signature in the X-402-Payment header.',
      },
    };
  } catch {
    // Any failure in the billing path fails open, for the same reason as above.
    return ALLOWED;
  }
}

export { getMinimumPayment };
