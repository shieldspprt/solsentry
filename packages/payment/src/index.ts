import { Connection, PublicKey, TransactionSignature } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// USDC Mint on Solana Mainnet
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Common USDC decimals
export const USDC_DECIMALS = 6;

export interface PaymentVerificationResult {
  verified: boolean;
  txSignature?: string;
  amountPaidUsdc?: number;
  amountRequiredUsdc?: number;
  payer?: string;
  error?: string;
}

export interface PaymentInstruction {
  paymentAddress: string;
  amountUsdc: number;
  memo?: string;
  expiresAt?: number; // timestamp
}

/**
 * Generate a unique payment address for pay-as-you-go MCP calls
 * Each tool call gets a unique reference to track payment
 */
export function generatePaymentAddress(callId: string, merchantWallet: PublicKey): PublicKey {
  // Derive a PDA based on call ID and merchant wallet
  const [paymentAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('solsentry_payment'), Buffer.from(callId)],
    merchantWallet
  );
  return paymentAddress;
}

/**
 * Create payment instruction for x402-style pay-per-call
 */
export function createPaymentInstruction(
  callId: string,
  merchantWallet: PublicKey,
  amountUsdc: number,
  memo?: string
): PaymentInstruction {
  const paymentAddress = generatePaymentAddress(callId, merchantWallet);
  
  return {
    paymentAddress: paymentAddress.toBase58(),
    amountUsdc,
    memo: memo || `SolSentry MCP Call: ${callId}`,
    expiresAt: Date.now() + 300000, // 5 minutes expiry
  };
}

/**
 * Verify if a payment was made for a specific MCP call
 * This checks for incoming USDC transfer with matching amount
 */
export async function verifyPayment(
  connection: Connection,
  txSignature: TransactionSignature,
  expectedAmountUsdc: number,
  recipientWallet: PublicKey
): Promise<PaymentVerificationResult> {
  try {
    const tx = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) {
      return { verified: false, error: 'Transaction not found' };
    }

    // Check if transaction is confirmed
    if (tx.meta?.err) {
      return { verified: false, error: 'Transaction failed' };
    }

    let totalAmountUsdc = 0;
    let payer: string | undefined;

    // Parse token transfers in the transaction
    for (const instruction of tx.transaction.message.instructions) {
      if ('parsed' in instruction && instruction.parsed) {
        const parsed = instruction.parsed as any;
        
        if (parsed.type === 'transfer' && parsed.info?.mint === USDC_MINT.toBase58()) {
          const info = parsed.info;
          
          // Check if recipient matches our wallet
          if (info.destination === recipientWallet.toBase58()) {
            const amount = parseInt(info.amount) / Math.pow(10, USDC_DECIMALS);
            totalAmountUsdc += amount;
            payer = info.authority;
          }
        }
      }
    }

    if (totalAmountUsdc >= expectedAmountUsdc) {
      return {
        verified: true,
        txSignature,
        amountPaidUsdc: totalAmountUsdc,
        amountRequiredUsdc: expectedAmountUsdc,
        payer,
      };
    }

    return {
      verified: false,
      txSignature,
      amountPaidUsdc: totalAmountUsdc,
      amountRequiredUsdc: expectedAmountUsdc,
      error: `Insufficient payment. Paid: ${totalAmountUsdc} USDC, Required: ${expectedAmountUsdc} USDC`,
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Payment verification failed',
    };
  }
}

/**
 * Get minimum payment required for an MCP tool call
 * Pricing: Base fee per call type
 */
export function getMinimumPayment(toolName: string): number {
  const pricing: Record<string, number> = {
    // Basic queries - lower cost
    'get_protocol_list': 0.10,
    'check_protocol_risk': 0.25,
    'get_business_ratios': 0.15,
    
    // Analysis tools - medium cost
    'evaluate_policy': 0.50,
    'get_position_health': 0.35,
    'preflight': 0.75,
    
    // Heavy computation - higher cost
    'stress_test': 1.00,
    'simulate_transaction': 1.50,
  };

  return pricing[toolName] || 0.25; // Default to 0.25 USDC
}

/**
 * Generate Solana Pay link for easy payment
 */
export function generateSolanaPayLink(
  recipient: PublicKey,
  amountUsdc: number,
  label: string,
  message: string
): string {
  const params = new URLSearchParams({
    recipient: recipient.toBase58(),
    amount: amountUsdc.toString(),
    label,
    message,
  });

  return `solana:${recipient.toBase58()}?${params.toString()}`;
}

/**
 * Middleware helper to check payment before executing expensive operations
 */
export interface PaymentMiddlewareResult {
  allowed: boolean;
  paymentRequired: number;
  paymentInstruction?: PaymentInstruction;
  error?: string;
}

export async function checkPaymentMiddleware(
  connection: Connection,
  toolName: string,
  paymentHeader?: string,
  merchantWallet?: PublicKey
): Promise<PaymentMiddlewareResult> {
  const requiredAmount = getMinimumPayment(toolName);

  // If no payment header provided, return payment instruction
  if (!paymentHeader) {
    if (!merchantWallet) {
      return {
        allowed: false,
        paymentRequired: requiredAmount,
        error: 'Merchant wallet not configured',
      };
    }

    const callId = `${toolName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const instruction = createPaymentInstruction(callId, merchantWallet, requiredAmount);

    return {
      allowed: false,
      paymentRequired: requiredAmount,
      paymentInstruction: instruction,
    };
  }

  // Verify payment from header (expects tx signature)
  if (!merchantWallet) {
    return {
      allowed: false,
      paymentRequired: requiredAmount,
      error: 'Merchant wallet not configured',
    };
  }

  const result = await verifyPayment(connection, paymentHeader, requiredAmount, merchantWallet);

  if (result.verified) {
    return {
      allowed: true,
      paymentRequired: 0,
    };
  }

  return {
    allowed: false,
    paymentRequired: requiredAmount,
    error: result.error,
  };
}
