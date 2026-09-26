/**
 * EduPiFlow — Scholarship Service
 * Handles scholarship creation, application, and management.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  Scholarship,
  ScholarshipApplication,
  CreateScholarshipRequest,
  SingleScholarshipResponse,
  ApplicationResponse,
} from './scholarshipTypes';
import { EducationLevel } from './eduConnectTypes';

// ============================================
// CREATE SCHOLARSHIP
// ============================================

/**
 * Create a new scholarship (by a Pioneer donor).
 * The scholarship is funded by a Pi donation (memo EPF-SCHOLAR-D).
 */
export async function createScholarship(
  request: CreateScholarshipRequest,
  donorId: string,
  donorDisplayName: string | null,
  backendUrl: string,
  accessToken: string
): Promise<SingleScholarshipResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/scholarships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...request,
        donorId,
        donorDisplayName,
        allocatedAmountPi: 0,
        remainingAmountPi: request.totalAmountPi,
        recipientsCount: 0,
        status: 'draft',
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

    const data: Scholarship = await response.json();
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
// ACTIVATE SCHOLARSHIP
// ============================================

/**
 * Activate a scholarship after the donor's Pi donation is confirmed.
 */
export async function activateScholarship(
  scholarshipId: string,
  donationPaymentId: string,
  txid: string,
  backendUrl: string,
  accessToken: string
): Promise<SingleScholarshipResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/scholarships/${scholarshipId}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ donationPaymentId, txid }),
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Scholarship = await response.json();
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
// GET SCHOLARSHIP
// ============================================

export async function getScholarship(
  scholarshipId: string,
  backendUrl: string,
  accessToken: string
): Promise<SingleScholarshipResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/scholarships/${scholarshipId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Scholarship = await response.json();
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
// LIST SCHOLARSHIPS
// ============================================

export async function listScholarships(
  filters: {
    status?: string;
    educationLevel?: EducationLevel;
    country?: string;
  },
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: Scholarship[] | null; error: string | null }> {
  try {
    const query = new URLSearchParams();
    if (filters.status) query.append('status', filters.status);
    if (filters.educationLevel) query.append('level', filters.educationLevel);
    if (filters.country) query.append('country', filters.country);

    const response = await fetch(
      `${backendUrl}/api/scholarships?${query.toString()}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Scholarship[] = await response.json();
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
// APPLY FOR SCHOLARSHIP
// ============================================

/**
 * Parent applies for a scholarship for their child.
 * The matching algorithm will compute the composite score.
 */
export async function applyForScholarship(
  scholarshipId: string,
  studentId: string,
  parentId: string,
  schoolId: string,
  backendUrl: string,
  accessToken: string
): Promise<ApplicationResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/scholarships/${scholarshipId}/apply`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ studentId, parentId, schoolId }),
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: ScholarshipApplication = await response.json();
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
// LIST APPLICATIONS FOR A STUDENT
// ============================================

export async function listStudentApplications(
  studentId: string,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: ScholarshipApplication[] | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/students/${studentId}/applications`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: ScholarshipApplication[] = await response.json();
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
// AWARD SCHOLARSHIP (called by matching engine)
// ============================================

/**
 * Award a scholarship to an application.
 * Triggers the EPF-SCHOLAR-R payment to the parent's wallet.
 */
export async function awardScholarship(
  applicationId: string,
  backendUrl: string,
  accessToken: string
): Promise<ApplicationResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/applications/${applicationId}/award`,
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

    const data: ScholarshipApplication = await response.json();
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
