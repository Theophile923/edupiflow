/**
 * EduPiFlow — Donor Service
 * Handles Pioneer donor registration, donations, and impact tracking.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 *
 * PAYMENT POLICY: All donations are settled exclusively in Pi Coin (memo EPF-SCHOLAR-D).
 */

import {
  ScholarshipDonation,
  DonationResponse,
} from './scholarshipTypes';

// ============================================
// TYPES
// ============================================
export interface DonorProfile {
  id: string;                       // Pi UID
  piUsername: string;
  walletAddress: string;
  displayName: string | null;       // null = anonymous donor
  isAnonymous: boolean;
  totalDonatedPi: number;
  totalScholarshipsFunded: number;
  totalStudentsImpacted: number;
  createdAt: string;
}

export interface DonorImpact {
  donorId: string;
  totalDonatedPi: number;
  totalScholarshipsFunded: number;
  totalStudentsImpacted: number;
  totalCountriesReached: number;
  totalEducationLevelsSupported: string[];
  recentDonations: ScholarshipDonation[];
  impactByCountry: Record<string, number>;
  impactByLevel: Record<string, number>;
}

// ============================================
// CREATE DONOR PROFILE
// ============================================

/**
 * Create a donor profile after Pi authentication.
 * Donors can choose to remain anonymous.
 */
export async function createDonorProfile(
  piUid: string,
  piUsername: string,
  walletAddress: string,
  displayName: string | null,
  isAnonymous: boolean,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: DonorProfile | null; error: string | null }> {
  try {
    const response = await fetch(`${backendUrl}/api/donors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        piUid,
        piUsername,
        walletAddress,
        displayName,
        isAnonymous,
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

    const data: DonorProfile = await response.json();
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
// RECORD DONATION
// ============================================

/**
 * Record a scholarship donation after Pi payment (memo EPF-SCHOLAR-D).
 */
export async function recordDonation(
  donorId: string,
  amountPi: number,
  txid: string,
  scholarshipId: string | null,
  backendUrl: string,
  accessToken: string
): Promise<DonationResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        donorId,
        amountPi,
        txid,
        scholarshipId,
        memo: 'EPF-SCHOLAR-D',
      }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: ScholarshipDonation = await response.json();
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
// GET DONOR IMPACT
// ============================================

/**
 * Get the full impact report for a donor.
 * Shows total donated, scholarships funded, students impacted, and geographic reach.
 */
export async function getDonorImpact(
  donorId: string,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: DonorImpact | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/donors/${donorId}/impact`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: DonorImpact = await response.json();
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
// LIST DONOR DONATIONS
// ============================================

export async function listDonorDonations(
  donorId: string,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: ScholarshipDonation[] | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/donors/${donorId}/donations`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: ScholarshipDonation[] = await response.json();
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
// GET GLOBAL IMPACT STATS
// ============================================

/**
 * Get global impact statistics for the PiScholarship Engine.
 * Publicly visible on the EduPiFlow transparency dashboard.
 */
export async function getGlobalImpactStats(
  backendUrl: string
): Promise<{
  success: boolean;
  data: {
    totalDonatedPi: number;
    totalScholarshipsActive: number;
    totalStudentsImpacted: number;
    totalCountriesReached: number;
  } | null;
  error: string | null;
}> {
  try {
    const response = await fetch(`${backendUrl}/api/impact/global`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
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
// UPDATE DONOR ANONYMITY
// ============================================

/**
 * Toggle the donor's anonymity preference.
 */
export async function updateAnonymity(
  donorId: string,
  isAnonymous: boolean,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: DonorProfile | null; error: string | null }> {
  try {
    const response = await fetch(`${backendUrl}/api/donors/${donorId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ isAnonymous }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: DonorProfile = await response.json();
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
