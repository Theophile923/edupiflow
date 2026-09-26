/**
 * EduPiFlow — Penalty Service
 * Handles late payment penalties and access suspension.
 *
 * Late payment management:
 * - Days 1 to 7: notification + 0.1 μπ per day penalty (EPF-PENALTY)
 * - Days 8 to 15: suspend access to report cards
 * - Days 16 to 30: alert school, limit student access
 * - Day 31+: automatic contract termination
 *
 * Penalty distribution: 50% promoter, 50% Reserve Fund
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  LatePaymentPenalty,
  PenaltyResponse,
} from './flowPayTypes';
import {
  PENALTY_PER_DAY_MICRO_PI,
  MAX_PENALTY_MICRO_PI,
  GRACE_PERIOD_DAYS,
} from './piConfig';

// ============================================
// CALCULATE PENALTY
// ============================================

/**
 * Calculate the late payment penalty for a given number of days late.
 *
 * - Daily penalty: 0.1 μπ
 * - Maximum penalty: 3.0 μπ (reached at day 30)
 * - Distribution: 50% promoter, 50% Reserve Fund
 */
export function calculatePenalty(
  paymentId: string,
  contractId: string,
  parentId: string,
  daysLate: number
): LatePaymentPenalty {
  const effectiveDays = Math.min(daysLate, 30); // cap at 30 days
  const rawPenalty = effectiveDays * PENALTY_PER_DAY_MICRO_PI;
  const cappedAtMax = rawPenalty >= MAX_PENALTY_MICRO_PI;
  const totalPenaltyMicroPi = Math.min(rawPenalty, MAX_PENALTY_MICRO_PI);

  return {
    id: `penalty_${paymentId}_${Date.now()}`,
    paymentId,
    contractId,
    parentId,
    daysLate,
    dailyPenaltyMicroPi: PENALTY_PER_DAY_MICRO_PI,
    totalPenaltyMicroPi,
    cappedAtMax,
    promoterShareMicroPi: totalPenaltyMicroPi * 0.50,
    reserveShareMicroPi: totalPenaltyMicroPi * 0.50,
    createdAt: new Date().toISOString(),
  };
}

// ============================================
// DETERMINE ACTION BASED ON DAYS LATE
// ============================================

export type LatePaymentAction =
  | 'none'
  | 'notify'
  | 'suspend_report_cards'
  | 'alert_school'
  | 'terminate_contract';

/**
 * Determine the required action based on days late.
 *
 * - 0 days: none
 * - 1-7 days: notify (grace period)
 * - 8-15 days: suspend report card access
 * - 16-30 days: alert school, limit student access
 * - 31+ days: automatic contract termination
 */
export function determineAction(daysLate: number): LatePaymentAction {
  if (daysLate <= 0) return 'none';
  if (daysLate <= GRACE_PERIOD_DAYS) return 'notify';
  if (daysLate <= 15) return 'suspend_report_cards';
  if (daysLate <= 30) return 'alert_school';
  return 'terminate_contract';
}

// ============================================
// RECORD PENALTY
// ============================================

/**
 * Record a late payment penalty in the backend.
 */
export async function recordPenalty(
  penalty: LatePaymentPenalty,
  backendUrl: string,
  accessToken: string
): Promise<PenaltyResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/penalties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(penalty),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: LatePaymentPenalty = await response.json();
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
// APPLY PENALTY (called by backend cron)
// ============================================

/**
 * Apply the late payment penalty and trigger the appropriate action.
 */
export async function applyPenalty(
  paymentId: string,
  daysLate: number,
  backendUrl: string,
  accessToken: string
): Promise<PenaltyResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/penalties/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ paymentId, daysLate }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: LatePaymentPenalty = await response.json();
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
// LIST PENALTIES FOR A CONTRACT
// ============================================

export async function listContractPenalties(
  contractId: string,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: LatePaymentPenalty[] | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/contracts/${contractId}/penalties`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: LatePaymentPenalty[] = await response.json();
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
// HELPER: FORMAT PENALTY
// ============================================

export function formatPenalty(penalty: LatePaymentPenalty): string {
  if (penalty.cappedAtMax) {
    return `${penalty.totalPenaltyMicroPi.toFixed(2)} μπ (capped at maximum)`;
  }
  return `${penalty.totalPenaltyMicroPi.toFixed(2)} μπ (${penalty.daysLate} days × ${penalty.dailyPenaltyMicroPi} μπ/day)`;
}
