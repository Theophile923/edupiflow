/**
 * EduPiFlow — Parent Service
 * Handles parent registration, profile management, and children management.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  ParentProfile,
  ChildProfile,
  CreateParentProfileRequest,
  AddChildRequest,
  ParentServiceResponse,
  ChildListResponse,
  EducationLevel,
} from './eduConnectTypes';
import { SupportedLanguage, DisplayCurrency } from './piConfig';

// ============================================
// CREATE PARENT PROFILE
// ============================================

/**
 * Create a parent profile after Pi authentication.
 *
 * Flow: Pi.authenticate() → create profile → add children → link to school
 *
 * @param piUid - The authenticated Pi user UID
 * @param piUsername - The Pi username
 * @param walletAddress - The Pi wallet address
 * @param request - The parent profile creation request
 * @param backendUrl - The EduPiFlow backend URL
 * @param accessToken - The Pi access token for server verification
 */
export async function createParentProfile(
  piUid: string,
  piUsername: string,
  walletAddress: string,
  request: CreateParentProfileRequest,
  backendUrl: string,
  accessToken: string
): Promise<ParentServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/parents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        piUid,
        piUsername,
        walletAddress,
        ...request,
        plan: 'FlowBasic', // default free plan
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

    const data: ParentProfile = await response.json();
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
// GET PARENT PROFILE
// ============================================

export async function getParentProfile(
  piUid: string,
  backendUrl: string,
  accessToken: string
): Promise<ParentServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/parents/${piUid}`, {
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

    const data: ParentProfile = await response.json();
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
// ADD CHILD
// ============================================

/**
 * Add a child to the parent profile.
 * A child can be linked to only ONE active school at a time.
 */
export async function addChild(
  parentId: string,
  request: AddChildRequest,
  backendUrl: string,
  accessToken: string
): Promise<ChildListResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/parents/${parentId}/children`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        data: null,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data: ChildProfile[] = await response.json();
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
// LIST CHILDREN
// ============================================

export async function listChildren(
  parentId: string,
  backendUrl: string,
  accessToken: string
): Promise<ChildListResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/parents/${parentId}/children`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data: ChildProfile[] = await response.json();
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
// UPDATE PREFERRED LANGUAGE
// ============================================

export async function updateLanguage(
  parentId: string,
  language: SupportedLanguage,
  backendUrl: string,
  accessToken: string
): Promise<ParentServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/parents/${parentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ preferredLanguage: language }),
    });

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data: ParentProfile = await response.json();
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
// UPDATE PREFERRED CURRENCY
// ============================================

export async function updateCurrency(
  parentId: string,
  currency: DisplayCurrency,
  backendUrl: string,
  accessToken: string
): Promise<ParentServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/parents/${parentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ preferredCurrency: currency }),
    });

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data: ParentProfile = await response.json();
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
// HELPER: VALIDATE CHILD AGE vs EDUCATION LEVEL
// ============================================

/**
 * Validates that the child's age matches the expected range for the education level.
 * Nursery: 2-6, Primary: 6-12, Secondary: 12-18, Higher: 18+
 */
export function validateChildEducationLevel(
  dateOfBirth: string,
  level: EducationLevel
): { valid: boolean; message?: string } {
  const birthDate = new Date(dateOfBirth);
  const ageMs = Date.now() - birthDate.getTime();
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);

  const ranges: Record<EducationLevel, [number, number]> = {
    nursery: [2, 6],
    primary: [6, 12],
    secondary: [12, 18],
    higher: [18, 100],
    vocational: [0, 100],
  };

  const [minAge, maxAge] = ranges[level];

  if (ageYears < minAge || ageYears > maxAge) {
    return {
      valid: false,
      message: `Child age (${ageYears.toFixed(1)} years) does not match ${level} level (expected ${minAge}-${maxAge} years).`,
    };
  }

  return { valid: true };
}
