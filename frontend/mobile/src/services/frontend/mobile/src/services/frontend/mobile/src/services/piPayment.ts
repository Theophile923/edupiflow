/**
 * EduPiFlow — Pi Payment Service
 * Wraps Pi.createPayment() and handles the full payment lifecycle.
 *
 * PAYMENT POLICY: All payments are settled exclusively in Pi Coin.
 * RWF and USD are used only for display and conversion purposes.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import { MemoCode, PaymentPlan, PAYMENT_PLAN_MEMO } from './piConfig';

// ============================================
// TYPES
// ============================================
export interface PaymentMetadata {
  contractId: string;
  studentId: string;
  schoolId: string;
  period: string;
  transactionType: string;
  [key: string]: string;
}

export interface PaymentRequest {
  amount: number; // Amount in Pi
  memo: MemoCode;
  metadata: PaymentMetadata;
}

export interface PaymentResult {
  paymentId: string;
  txid: string;
  amount: number;
  memo: MemoCode;
}

// ============================================
// CORE PAYMENT FUNCTION
// ============================================

/**
 * Create a Pi payment and handle the full lifecycle.
 *
 * @param request - Payment request (amount, memo, metadata)
 * @param backendUrl - The EduPiFlow backend URL
 * @param onSuccess - Callback on successful completion
 * @param onCancel - Callback on cancellation
 * @param onError - Callback on error
 */
export async function createPiPayment(
  request: PaymentRequest,
  backendUrl: string,
  onSuccess: (result: PaymentResult) => void,
  onCancel: (paymentId: string) => void,
  onError: (error: Error, payment?: unknown) => void
): Promise<void> {
  if (typeof window === 'undefined' || !(window as any).Pi) {
    onError(new Error('Pi SDK not loaded. Please open EduPiFlow inside Pi Browser.'));
    return;
  }

  const Pi = (window as any).Pi;

  try {
    await Pi.createPayment(
      {
        amount: request.amount,
        memo: request.memo,
        metadata: request.metadata,
      },
      {
        // Step 1: Server-side approval
        onReadyForServerApproval: async (paymentId: string) => {
          try {
            const response = await fetch(`${backendUrl}/api/payments/approve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId }),
            });

            if (!response.ok) {
              throw new Error(
                `Server approval failed: ${response.status} ${response.statusText}`
              );
            }
          } catch (error) {
            onError(
              new Error(
                `Server approval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              )
            );
          }
        },

        // Step 2: Server-side completion
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          try {
            const response = await fetch(`${backendUrl}/api/payments/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, txid }),
            });

            if (!response.ok) {
              throw new Error(
                `Server completion failed: ${response.status} ${response.statusText}`
              );
            }

            onSuccess({
              paymentId,
              txid,
              amount: request.amount,
              memo: request.memo,
            });
          } catch (error) {
            onError(
              new Error(
                `Server completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              )
            );
          }
        },

        // Step 3: Cancellation
        onCancel: (paymentId: string) => {
          onCancel(paymentId);
        },

        // Step 4: Error
        onError: (error: Error, payment?: unknown) => {
          onError(error, payment);
        },
      }
    );
  } catch (error) {
    onError(
      error instanceof Error ? error : new Error('Unknown payment error')
    );
  }
}

// ============================================
// HELPER: TUITION PAYMENT
// ============================================

/**
 * Create a tuition payment for a specific plan.
 */
export async function payTuition(
  plan: PaymentPlan,
  amountInPi: number,
  contractId: string,
  studentId: string,
  schoolId: string,
  period: string,
  backendUrl: string,
  onSuccess: (result: PaymentResult) => void,
  onCancel: (paymentId: string) => void,
  onError: (error: Error, payment?: unknown) => void
): Promise<void> {
  return createPiPayment(
    {
      amount: amountInPi,
      memo: PAYMENT_PLAN_MEMO[plan],
      metadata: {
        contractId,
        studentId,
        schoolId,
        period,
        transactionType: 'tuition',
      },
    },
    backendUrl,
    onSuccess,
    onCancel,
    onError
  );
}

// ============================================
// HELPER: DEPOSIT PAYMENT
// ============================================

/**
 * Create a parent or school security deposit payment.
 */
export async function payDeposit(
  amountInPi: number,
  isParent: boolean,
  contractId: string,
  parentId: string,
  schoolId: string,
  backendUrl: string,
  onSuccess: (result: PaymentResult) => void,
  onCancel: (paymentId: string) => void,
  onError: (error: Error, payment?: unknown) => void
): Promise<void> {
  const memo = isParent
    ? ('EPF-CAUTION-P' as MemoCode)
    : ('EPF-CAUTION-E' as MemoCode);

  return createPiPayment(
    {
      amount: amountInPi,
      memo,
      metadata: {
        contractId,
        studentId: '',
        schoolId,
        period: 'deposit',
        transactionType: isParent ? 'parent_deposit' : 'school_deposit',
        parentId,
      },
    },
    backendUrl,
    onSuccess,
    onCancel,
    onError
  );
}

// ============================================
// HELPER: SCHOLARSHIP DONATION
// ============================================

/**
 * Create a scholarship donation payment.
 */
export async function donateToScholarship(
  amountInPi: number,
  donorId: string,
  donorName: string | null,
  backendUrl: string,
  onSuccess: (result: PaymentResult) => void,
  onCancel: (paymentId: string) => void,
  onError: (error: Error, payment?: unknown) => void
): Promise<void> {
  return createPiPayment(
    {
      amount: amountInPi,
      memo: 'EPF-SCHOLAR-D' as MemoCode,
      metadata: {
        contractId: '',
        studentId: '',
        schoolId: '',
        period: 'donation',
        transactionType: 'scholarship_donation',
        donorId,
        donorName: donorName || 'Anonymous',
      },
    },
    backendUrl,
    onSuccess,
    onCancel,
    onError
  );
}
