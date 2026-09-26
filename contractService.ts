/**
 * EduPiFlow — Contract Service
 * Handles smart contract creation, signing, activation, and renewal.
 *
 * Every smart contract contains:
 * - Pi wallet IDs of parent and school
 * - Student profile ID
 * - Fee amount per period
 * - Parent security deposit (one monthly installment)
 * - Payment frequency
 * - Start and end dates
 * - 7-day grace window
 * - Automatic renewal clause (opt-out 30 days before expiry)
 * - Force majeure clause
 * - Deposit refund conditions
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  SmartContract,
  CreateContractRequest,
  ContractResponse,
  ContractStatus,
} from './flowPayTypes';
import { PaymentPlan, PAYMENT_PLAN_MONTHS } from './piConfig';

// ============================================
// CONSTANTS
// ============================================
const GRACE_WINDOW_DAYS = 7;
const RENEWAL_NOTICE_DAYS = 30;

const FORCE_MAJEURE_CLAUSE = `
Force majeure events recognized by this contract include:
- Declared national or international pandemics (WHO classification)
- Armed conflict or war declared by relevant authorities
- Natural disasters (earthquakes, floods, hurricanes above Category 3, volcanic eruptions) affecting the school's operating region
- Government-ordered school closures of more than 30 consecutive days
- National financial system failures preventing Pi Network access for more than 14 consecutive days

Upon force majeure declaration by either party (requiring documentary evidence uploaded to the EduPiFlow platform):
- All penalty accrual is immediately frozen
- The contract is suspended without deposit loss for either party
- A 30-day negotiation window opens for contract resumption or termination terms
- If no agreement is reached within 30 days, full deposit refund is triggered automatically for both parties
`.trim();

const DEPOSIT_REFUND_CONDITIONS = `
Parent security deposit refund conditions:
- Full refund if all payments on time, no delays, contract reached natural end, no open dispute
- Forfeiture scale: 1 delay regularized within 7 days = 10%; 2 delays = 25%; 3+ delays = 50%; early termination without notice = 75%; total default = 100%
- Forfeited funds distribution: 60% to school, 25% to promoter, 15% to Reserve Fund

School security deposit refund conditions:
- Full refund if all obligations met, no complaints, no confirmed fraud
- Forfeiture scale: report cards not published on time = 10%; closure without notice = 100% redistributed to parents; confirmed fraud = 100% plus permanent blacklist; non-conforming service = 25% to 50%
- Forfeited funds distribution: 70% to affected parents pro-rata, 20% to promoter, 10% to Reserve Fund
`.trim();

// ============================================
// CALCULATE PARENT SECURITY DEPOSIT
// ============================================

/**
 * Parent security deposit equals exactly one monthly installment,
 * regardless of the chosen payment plan.
 *
 * - Monthly: deposit = monthly amount
 * - Quarterly: deposit = quarterly amount / 3
 * - Semester: deposit = semester amount / 6
 * - Annual: deposit = annual amount / 12
 */
export function calculateParentDeposit(
  feeAmountPerPeriod: number,
  plan: PaymentPlan
): number {
  const months = PAYMENT_PLAN_MONTHS[plan];
  return feeAmountPerPeriod / months;
}

// ============================================
// CREATE CONTRACT
// ============================================

/**
 * Create a draft smart contract between a parent and a school.
 * The contract is not active until both parties sign and the parent deposits the security deposit.
 */
export async function createContract(
  request: CreateContractRequest,
  parentWalletAddress: string,
  schoolWalletAddress: string,
  parentDeposit: number,
  schoolDeposit: number,
  backendUrl: string,
  accessToken: string
): Promise<ContractResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/contracts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...request,
        parentWalletAddress,
        schoolWalletAddress,
        parentSecurityDeposit: parentDeposit,
        schoolSecurityDeposit: schoolDeposit,
        graceWindowDays: GRACE_WINDOW_DAYS,
        renewalNoticeDays: RENEWAL_NOTICE_DAYS,
        forceMajeureClause: FORCE_MAJEURE_CLAUSE,
        depositRefundConditions: DEPOSIT_REFUND_CONDITIONS,
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

    const data: SmartContract = await response.json();
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
// SIGN CONTRACT
// ============================================

/**
 * Sign the contract as parent or school.
 * When both parties have signed, the contract becomes "pending_parent_deposit".
 */
export async function signContract(
  contractId: string,
  actor: 'parent' | 'school',
  backendUrl: string,
  accessToken: string
): Promise<ContractResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/contracts/${contractId}/sign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ actor }),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data: SmartContract = await response.json();
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
// ACTIVATE CONTRACT
// ============================================

/**
 * Activate the contract after the parent security deposit is paid.
 * The contract becomes active and the smart contract subscription starts.
 */
export async function activateContract(
  contractId: string,
  depositPaymentId: string,
  backendUrl: string,
  accessToken: string
): Promise<ContractResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/contracts/${contractId}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ depositPaymentId }),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data: SmartContract = await response.json();
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
// GET CONTRACT
// ============================================

export async function getContract(
  contractId: string,
  backendUrl: string,
  accessToken: string
): Promise<ContractResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/contracts/${contractId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: SmartContract = await response.json();
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
// LIST PARENT CONTRACTS
// ============================================

export async function listParentContracts(
  parentId: string,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: SmartContract[] | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/parents/${parentId}/contracts`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: SmartContract[] = await response.json();
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
// OPT-OUT RENEWAL
// ============================================

/**
 * Parent opts out of automatic renewal.
 * Must be done at least 30 days before contract expiry.
 */
export async function optOutRenewal(
  contractId: string,
  backendUrl: string,
  accessToken: string
): Promise<ContractResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/contracts/${contractId}/opt-out-renewal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: SmartContract = await response.json();
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
// HELPER: VALIDATE CONTRACT DATES
// ============================================

/**
 * Validate that the contract start/end dates match the academic calendar.
 */
export function validateContractDates(
  startDate: string,
  endDate: string
): { valid: boolean; message?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    return { valid: false, message: 'Start date must be before end date.' };
  }

  const durationMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (durationMonths < 1 || durationMonths > 12) {
    return {
      valid: false,
      message: 'Contract duration must be between 1 and 12 months.',
    };
  }

  return { valid: true };
}
