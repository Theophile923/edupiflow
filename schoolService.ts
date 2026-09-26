/**
 * EduPiFlow — School Service
 * Handles school registration, institutional profile, and security deposit.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  SchoolProfile,
  CreateSchoolProfileRequest,
  SchoolServiceResponse,
} from './eduConnectTypes';
import { getExchangeRates } from './exchangeRate';

// ============================================
// CREATE SCHOOL PROFILE
// ============================================

/**
 * Create a school/institution profile after Pi authentication.
 *
 * Flow: Pi.authenticate() → create institutional profile → deposit security deposit (frozen)
 *       → configure payment plans → activate profile
 *
 * IMPORTANT: Schools cannot receive payments until the security deposit is paid.
 *
 * @param piUsername - The Pi username
 * @param walletAddress - The Pi wallet address
 * @param request - The school profile creation request
 * @param backendUrl - The EduPiFlow backend URL
 * @param accessToken - The Pi access token
 */
export async function createSchoolProfile(
  piUsername: string,
  walletAddress: string,
  request: CreateSchoolProfileRequest,
  backendUrl: string,
  accessToken: string
): Promise<SchoolServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/schools`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        piUsername,
        walletAddress,
        ...request,
        securityDepositPaid: false,
        isActive: false,
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

    const data: SchoolProfile = await response.json();
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
// GET SCHOOL PROFILE
// ============================================

export async function getSchoolProfile(
  schoolId: string,
  backendUrl: string,
  accessToken: string
): Promise<SchoolServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/schools/${schoolId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data: SchoolProfile = await response.json();
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
// CALCULATE REQUIRED SECURITY DEPOSIT
// ============================================

/**
 * Calculate the school institutional security deposit.
 *
 * Formula: 10% of total annual expected revenue from enrolled students.
 * Minimum: 50 μπ
 * Maximum: 5,000 μπ (standard schools) — no cap for Enterprise networks.
 *
 * @param annualRevenueInPi - The total annual expected revenue in Pi
 * @param isEnterprise - Whether this is an Enterprise network
 */
export function calculateSchoolDeposit(
  annualRevenueInPi: number,
  isEnterprise: boolean = false
): {
  depositInPi: number;
  depositInMicroPi: number;
  capped: boolean;
  reason: string;
} {
  const rawDeposit = annualRevenueInPi * 0.10;
  const MIN_DEPOSIT_MICRO_PI = 50;
  const MAX_DEPOSIT_MICRO_PI = 5000;

  const rawDepositMicroPi = rawDeposit * 1_000_000;

  if (rawDepositMicroPi < MIN_DEPOSIT_MICRO_PI) {
    return {
      depositInPi: MIN_DEPOSIT_MICRO_PI / 1_000_000,
      depositInMicroPi: MIN_DEPOSIT_MICRO_PI,
      capped: true,
      reason: `Minimum deposit applied (50 μπ). Raw calculation was ${rawDepositMicroPi.toFixed(2)} μπ.`,
    };
  }

  if (!isEnterprise && rawDepositMicroPi > MAX_DEPOSIT_MICRO_PI) {
    return {
      depositInPi: MAX_DEPOSIT_MICRO_PI / 1_000_000,
      depositInMicroPi: MAX_DEPOSIT_MICRO_PI,
      capped: true,
      reason: `Maximum deposit applied (5,000 μπ). Raw calculation was ${rawDepositMicroPi.toFixed(2)} μπ.`,
    };
  }

  return {
    depositInPi: rawDeposit,
    depositInMicroPi: rawDepositMicroPi,
    capped: false,
    reason: 'Standard 10% calculation applied.',
  };
}

// ============================================
// ACTIVATE SCHOOL PROFILE
// ============================================

/**
 * Activate the school profile after the security deposit is paid.
 */
export async function activateSchoolProfile(
  schoolId: string,
  depositPaymentId: string,
  backendUrl: string,
  accessToken: string
): Promise<SchoolServiceResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/schools/${schoolId}/activate`,
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

    const data: SchoolProfile = await response.json();
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
// VALIDATE FEE (against reference ranges)
// ============================================

/**
 * Validate that the school's proposed tuition fee is within expected ranges.
 * Triggers a verification step if the fee is unusually high or low.
 *
 * Reference ranges (annual, USD equivalent at GCV):
 * - Nursery: $200 - $30,000
 * - Primary: $100 - $20,000
 * - Secondary: $200 - $40,000
 * - Higher: $500 - $60,000
 */
export function validateFeeRange(
  annualFeeUsd: number,
  level: string
): { valid: boolean; warning?: string } {
  const ranges: Record<string, [number, number]> = {
    nursery: [200, 30000],
    primary: [100, 20000],
    secondary: [200, 40000],
    higher: [500, 60000],
    vocational: [100, 60000],
  };

  const range = ranges[level.toLowerCase()];
  if (!range) {
    return { valid: true, warning: 'Unknown education level, no validation applied.' };
  }

  const [min, max] = range;

  if (annualFeeUsd < min) {
    return {
      valid: false,
      warning: `Fee ($${annualFeeUsd}) is below the expected range for ${level} ($${min}-$${max}). Manual verification required.`,
    };
  }

  if (annualFeeUsd > max) {
    return {
      valid: false,
      warning: `Fee ($${annualFeeUsd}) is above the expected range for ${level} ($${min}-$${max}). Manual verification required.`,
    };
  }

  return { valid: true };
}
