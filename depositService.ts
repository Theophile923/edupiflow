/**
 * EduPiFlow — Deposit Service
 * Handles parent and school security deposits, refunds, and forfeitures.
 *
 * Parent security deposit = one monthly installment (EPF-CAUTION-P)
 * School security deposit = 10% of annual revenue (EPF-CAUTION-E)
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  SecurityDeposit,
  ForfeitureCalculation,
  DepositResponse,
  DepositType,
} from './flowPayTypes';
import {
  PARENT_FORFEITURE,
  SCHOOL_FORFEITURE,
} from './piConfig';

// ============================================
// CREATE PARENT DEPOSIT
// ============================================

/**
 * Record a parent security deposit after Pi payment.
 */
export async function createParentDeposit(
  parentId: string,
  contractId: string,
  amountInPi: number,
  paymentId: string,
  txid: string,
  backendUrl: string,
  accessToken: string
): Promise<DepositResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/deposits/parent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        parentId,
        contractId,
        amount: amountInPi,
        paymentId,
        txid,
      }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: SecurityDeposit = await response.json();
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
// CREATE SCHOOL DEPOSIT
// ============================================

/**
 * Record a school institutional security deposit after Pi payment.
 */
export async function createSchoolDeposit(
  schoolId: string,
  amountInPi: number,
  paymentId: string,
  txid: string,
  backendUrl: string,
  accessToken: string
): Promise<DepositResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/deposits/school`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        schoolId,
        amount: amountInPi,
        paymentId,
        txid,
      }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: SecurityDeposit = await response.json();
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
// CALCULATE PARENT FORFEITURE
// ============================================

/**
 * Calculate the parent deposit forfeiture based on the delay history.
 *
 * Scale:
 * - 0 delays → 0% forfeited (full refund)
 * - 1 delay regularized within 7 days → 10% forfeited
 * - 2 delays → 25% forfeited
 * - 3+ delays → 50% forfeited
 * - Early termination without notice → 75% forfeited
 * - Total default → 100% forfeited
 *
 * Forfeited funds distribution: 60% school, 25% promoter, 15% Reserve Fund
 */
export function calculateParentForfeiture(
  depositId: string,
  originalAmount: number,
  delaysCount: number,
  earlyTermination: boolean,
  totalDefault: boolean
): ForfeitureCalculation {
  let percentage = 0;
  let reason = 'All payments on time. Full refund.';

  if (totalDefault) {
    percentage = PARENT_FORFEITURE.TOTAL_DEFAULT;
    reason = 'Total default. Full forfeiture.';
  } else if (earlyTermination) {
    percentage = PARENT_FORFEITURE.EARLY_TERMINATION_NO_NOTICE;
    reason = 'Early termination without notice.';
  } else if (delaysCount >= 3) {
    percentage = PARENT_FORFEITURE.THREE_OR_MORE_DELAYS;
    reason = `${delaysCount} delays recorded.`;
  } else if (delaysCount === 2) {
    percentage = PARENT_FORFEITURE.TWO_DELAYS;
    reason = '2 delays recorded.';
  } else if (delaysCount === 1) {
    percentage = PARENT_FORFEITURE.ONE_DELAY_REGULARIZED;
    reason = '1 delay regularized within 7 days.';
  }

  const forfeitedAmount = originalAmount * percentage;
  const refundedAmount = originalAmount - forfeitedAmount;

  return {
    depositId,
    originalAmount,
    forfeiturePercentage: percentage,
    forfeitedAmount,
    refundedAmount,
    reason,
    breakdown: {
      schoolShare: forfeitedAmount * 0.60,
      promoterShare: forfeitedAmount * 0.25,
      reserveShare: forfeitedAmount * 0.15,
    },
  };
}

// ============================================
// CALCULATE SCHOOL FORFEITURE
// ============================================

/**
 * Calculate the school deposit forfeiture based on the breach type.
 *
 * Scale:
 * - Report cards not published on time → 10% forfeited
 * - Non-conforming service → 25% to 50% forfeited
 * - Closure without notice → 100% forfeited (redistributed to parents)
 * - Confirmed fraud → 100% forfeited + permanent blacklist
 *
 * Forfeited funds distribution: 70% affected parents pro-rata, 20% promoter, 10% Reserve Fund
 */
export function calculateSchoolForfeiture(
  depositId: string,
  originalAmount: number,
  breachType:
    | 'report_cards_late'
    | 'non_conforming_service'
    | 'closure_without_notice'
    | 'confirmed_fraud',
  affectedParentsCount: number = 0
): ForfeitureCalculation {
  let percentage = 0;
  let reason = 'All obligations met. Full refund.';

  switch (breachType) {
    case 'report_cards_late':
      percentage = SCHOOL_FORFEITURE.REPORT_CARDS_LATE;
      reason = 'Report cards not published on time.';
      break;
    case 'non_conforming_service':
      percentage = SCHOOL_FORFEITURE.NON_CONFORMING_SERVICE_MIN;
      reason = 'Non-conforming service (minimum 25%).';
      break;
    case 'closure_without_notice':
      percentage = SCHOOL_FORFEITURE.CLOSURE_WITHOUT_NOTICE;
      reason = 'Closure without notice. Full forfeiture.';
      break;
    case 'confirmed_fraud':
      percentage = SCHOOL_FORFEITURE.CONFIRMED_FRAUD;
      reason = 'Confirmed fraud. Full forfeiture + permanent blacklist.';
      break;
  }

  const forfeitedAmount = originalAmount * percentage;
  const refundedAmount = originalAmount - forfeitedAmount;

  return {
    depositId,
    originalAmount,
    forfeiturePercentage: percentage,
    forfeitedAmount,
    refundedAmount,
    reason,
    breakdown: {
      affectedParentsShare: forfeitedAmount * 0.70,
      promoterShare: forfeitedAmount * 0.20,
      reserveShare: forfeitedAmount * 0.10,
    },
  };
}

// ============================================
// REFUND DEPOSIT
// ============================================

/**
 * Refund a security deposit (full or partial).
 * Uses memo EPF-REFUND-C.
 */
export async function refundDeposit(
  depositId: string,
  amountToRefund: number,
  backendUrl: string,
  accessToken: string
): Promise<DepositResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/deposits/${depositId}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ amountToRefund }),
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: SecurityDeposit = await response.json();
    return { success: true, data, error: null };
  }
