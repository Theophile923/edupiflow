/**
 * EduPiFlow — Escrow Service
 * Handles the 48-hour escrow mechanism and the 92/5/2/1 distribution.
 *
 * Every tuition payment passes through escrow before reaching the school.
 * - 48-hour window allows either party to raise a dispute.
 * - If no dispute, smart contract executes 92/5/2/1 distribution.
 * - If dispute, escrow extends until tribunal resolution (max 14 days).
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  TuitionPayment,
  PaymentDistribution,
  PaymentResponse,
  DistributionResponse,
} from './flowPayTypes';
import { DISTRIBUTION, ESCROW_HOURS, MAX_ESCROW_DAYS } from './piConfig';

// ============================================
// ENTER ESCROW
// ============================================

/**
 * Mark a payment as entered into escrow.
 * Called automatically after Pi.createPayment() completes.
 */
export async function enterEscrow(
  paymentId: string,
  txid: string,
  backendUrl: string,
  accessToken: string
): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/escrow/enter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ paymentId, txid }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: TuitionPayment = await response.json();
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// CALCULATE RELEASE TIME
// ============================================

/**
 * Calculate the escrow release time (48 hours after entry).
 */
export function calculateReleaseTime(escrowEnteredAt: string): string {
  const entered = new Date(escrowEnteredAt);
  const release = new Date(entered.getTime() + ESCROW_HOURS * 60 * 60 * 1000);
  return release.toISOString();
}

/**
 * Calculate the maximum escrow duration before mandatory tribunal (14 days).
 */
export function calculateMaxEscrowTime(escrowEnteredAt: string): string {
  const entered = new Date(escrowEnteredAt);
  const max = new Date(entered.getTime() + MAX_ESCROW_DAYS * 24 * 60 * 60 * 1000);
  return max.toISOString();
}

// ============================================
// DISTRIBUTE PAYMENT (92/5/2/1)
// ============================================

/**
 * Calculate the 92/5/2/1 distribution for a given payment amount.
 */
export function calculateDistribution(
  totalAmount: number
): Omit<PaymentDistribution, 'paymentId' | 'distributedAt' | 'schoolTxid' | 'promoterTxid' | 'scholarshipTxid' | 'reserveTxid'> {
  return {
    totalAmount,
    schoolShare: totalAmount * DISTRIBUTION.SCHOOL,
    promoterShare: totalAmount * DISTRIBUTION.PROMOTER,
    scholarshipPoolShare: totalAmount * DISTRIBUTION.SCHOLARSHIP_POOL,
    reserveShare: totalAmount * DISTRIBUTION.RESERVE,
  };
}

/**
 * Execute the 92/5/2/1 distribution after escrow release.
 * Called automatically by the backend when the 48h window expires without dispute.
 */
export async function releaseEscrow(
  paymentId: string,
  backendUrl: string,
  accessToken: string
): Promise<DistributionResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/escrow/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ paymentId }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: PaymentDistribution = await response.json();
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// RAISE DISPUTE
// ============================================

/**
 * Raise a dispute during the 48-hour escrow window.
 * Escrow is extended until tribunal resolution.
 */
export async function raiseDispute(
  paymentId: string,
  reason: string,
  raisedBy: 'parent' | 'school',
  backendUrl: string,
  accessToken: string
): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/escrow/dispute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ paymentId, reason, raisedBy }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: TuitionPayment = await response.json();
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// GET ESCROW STATUS
// ============================================

export async function getEscrowStatus(
  paymentId: string,
  backendUrl: string,
  accessToken: string
): Promise<PaymentResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/escrow/${paymentId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: TuitionPayment = await response.json();
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// AUTO-RELEASE CHECK (for backend cron)
// ============================================

/**
 * Check if a payment is ready for automatic release.
 * Returns true if 48h have passed and no dispute is active.
 */
export function isReadyForRelease(payment: TuitionPayment): boolean {
  if (payment.status !== 'in_escrow') return false;
  if (!payment.escrowReleaseAt) return false;
  return new Date(payment.escrowReleaseAt) <= new Date();
}

/**
 * Check if a disputed payment has reached the 14-day maximum.
 * Returns true if mandatory tribunal should be convened.
 */
export function isReadyForTribunal(payment: TuitionPayment): boolean {
  if (payment.status !== 'disputed') return false;
  if (!payment.escrowEnteredAt) return false;
  const maxTime = calculateMaxEscrowTime(payment.escrowEnteredAt);
  return new Date(maxTime) <= new Date();
}
