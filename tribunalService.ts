/**
 * EduPiFlow — Tribunal Service
 * Handles dispute resolution through the Pi Community Tribunal.
 *
 * Rules:
 * - Disputes under 10 μπ → automatic mediation rules (no tribunal)
 * - Disputes 10 μπ and above → panel of 5 randomly selected certified Pioneers
 * - Tribunal votes within 5 business days
 * - Majority verdict is automatically executed
 * - One appeal allowed, triggering a new panel of 7 Pioneers
 * - Appeal verdict is final
 * - Arbitrators receive 0.5 μπ each per case, funded by the Reserve Fund
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  Dispute,
  TribunalPanel,
  Arbitrator,
  ArbitratorVote,
  DisputeResponse,
  PanelResponse,
  DisputeType,
} from './tribunalTypes';

const AUTO_MEDIATION_THRESHOLD_MICRO_PI = 10;
const ARBITRATOR_FEE_MICRO_PI = 0.5;

// ============================================
// RAISE DISPUTE
// ============================================

/**
 * Raise a dispute against a contract or payment.
 * Determines automatically if the dispute goes to mediation or tribunal.
 */
export async function raiseDispute(
  contractId: string,
  paymentId: string | null,
  raisedBy: 'parent' | 'school',
  raisedById: string,
  disputeType: DisputeType,
  description: string,
  evidenceUrls: string[],
  disputedAmountPi: number,
  backendUrl: string,
  accessToken: string
): Promise<DisputeResponse> {
  try {
    const disputedAmountMicroPi = disputedAmountPi * 1_000_000;
    const isAutoMediation =
      disputedAmountMicroPi < AUTO_MEDIATION_THRESHOLD_MICRO_PI;

    const response = await fetch(`${backendUrl}/api/disputes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contractId,
        paymentId,
        raisedBy,
        raisedById,
        disputeType,
        description,
        evidenceUrls,
        disputedAmountPi,
        disputedAmountMicroPi,
        isAutoMediation,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: null,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data: Dispute = await response.json();
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
// CONVENE TRIBUNAL
// ============================================

/**
 * Convene a tribunal panel for a dispute.
 * Randomly selects 5 (primary) or 7 (appeal) certified Pioneers from the arbitrator pool.
 */
export async function conveneTribunal(
  disputeId: string,
  level: 'primary' | 'appeal',
  backendUrl: string,
  accessToken: string
): Promise<PanelResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/disputes/${disputeId}/convene-tribunal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ level }),
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: TribunalPanel = await response.json();
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
// SUBMIT VOTE
// ============================================

/**
 * Arbitrator submits a vote on a tribunal case.
 */
export async function submitVote(
  tribunalId: string,
  arbitratorId: string,
  vote: 'parent_wins' | 'school_wins' | 'split',
  reasoning: string,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: ArbitratorVote | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/tribunals/${tribunalId}/vote`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ arbitratorId, vote, reasoning }),
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: ArbitratorVote = await response.json();
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
// APPEAL
// ============================================

/**
 * File an appeal against a tribunal verdict.
 * Triggers a new panel of 7 Pioneers.
 */
export async function fileAppeal(
  disputeId: string,
  appellantId: string,
  reason: string,
  backendUrl: string,
  accessToken: string
): Promise<DisputeResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/disputes/${disputeId}/appeal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ appellantId, reason }),
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Dispute = await response.json();
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
// GET DISPUTE
// ============================================

export async function getDispute(
  disputeId: string,
  backendUrl: string,
  accessToken: string
): Promise<DisputeResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/disputes/${disputeId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Dispute = await response.json();
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
// REGISTER AS ARBITRATOR
// ============================================

/**
 * Register a Pioneer as a certified arbitrator.
 * Requires passing a basic arbitration knowledge test.
 */
export async function registerArbitrator(
  piUid: string,
  piUsername: string,
  walletAddress: string,
  testPassed: boolean,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: Arbitrator | null; error: string | null }> {
  try {
    const response = await fetch(`${backendUrl}/api/arbitrators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        piUid,
        piUsername,
        walletAddress,
        isCertified: testPassed,
        hasCleanRecord: true,
      }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Arbitrator = await response.json();
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
// HELPERS
// ============================================

/**
 * Check if a dispute amount qualifies for automatic mediation.
 */
export function qualifiesForAutoMediation(amountPi: number): boolean {
  return amountPi * 1_000_000 < AUTO_MEDIATION_THRESHOLD_MICRO_PI;
}

/**
 * Get the required number of arbitrators based on the tribunal level.
 */
export function getArbitratorCount(level: 'primary' | 'appeal'): number {
  return level === 'primary' ? 5 : 7;
}

/**
 * Calculate the total arbitrator fee for a tribunal.
 */
export function calculateArbitratorFees(
  level: 'primary' | 'appeal'
): { perArbitratorMicroPi: number; totalMicroPi: number } {
  const count = getArbitratorCount(level);
  return {
    perArbitratorMicroPi: ARBITRATOR_FEE_MICRO_PI,
    totalMicroPi: count * ARBITRATOR_FEE_MICRO_PI,
  };
}
