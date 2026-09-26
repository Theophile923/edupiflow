/**
 * EduPiFlow — Link Service
 * Handles child-school linking, confirmation, rejection, and transfer.
 *
 * Rules:
 * - Each child can be linked to only ONE active school at a time.
 * - School transfer costs 0.5 μπ.
 * - School must confirm the link before the smart contract is available.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  ChildSchoolLink,
  RequestLinkRequest,
  ConfirmLinkRequest,
  RejectLinkRequest,
  LinkServiceResponse,
} from './eduConnectTypes';

const TRANSFER_FEE_MICRO_PI = 0.5;

// ============================================
// REQUEST LINK (parent-initiated)
// ============================================

/**
 * Parent requests to link a child to a school.
 * The school must confirm before the link is active.
 */
export async function requestLink(
  parentId: string,
  request: RequestLinkRequest,
  backendUrl: string,
  accessToken: string
): Promise<LinkServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        parentId,
        childId: request.childId,
        schoolId: request.schoolId,
        notes: request.notes || null,
        linkedBy: 'parent',
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

    const data: ChildSchoolLink = await response.json();
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
// CONFIRM LINK (school-initiated)
// ============================================

/**
 * School confirms a pending link request.
 * After confirmation, the smart contract becomes available.
 */
export async function confirmLink(
  request: ConfirmLinkRequest,
  backendUrl: string,
  accessToken: string
): Promise<LinkServiceResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/links/${request.linkId}/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

    const data: ChildSchoolLink = await response.json();
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
// REJECT LINK (school-initiated)
// ============================================

/**
 * School rejects a pending link request with a reason.
 */
export async function rejectLink(
  request: RejectLinkRequest,
  backendUrl: string,
  accessToken: string
): Promise<LinkServiceResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/links/${request.linkId}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: request.reason }),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data: ChildSchoolLink = await response.json();
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
// TRANSFER CHILD (parent-initiated)
// ============================================

/**
 * Parent transfers a child from one school to another.
 * Costs 0.5 μπ (EPF-TRANSFER memo).
 */
export async function requestTransfer(
  parentId: string,
  childId: string,
  fromSchoolId: string,
  toSchoolId: string,
  backendUrl: string,
  accessToken: string
): Promise<LinkServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/links/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        parentId,
        childId,
        fromSchoolId,
        toSchoolId,
        transferFeeMicroPi: TRANSFER_FEE_MICRO_PI,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data: ChildSchoolLink = await response.json();
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
// LIST PENDING LINKS (for school)
// ============================================

/**
 * School lists all pending link requests awaiting confirmation.
 */
export async function listPendingLinks(
  schoolId: string,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: ChildSchoolLink[] | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/schools/${schoolId}/pending-links`,
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

    const data: ChildSchoolLink[] = await response.json();
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
// GET LINK STATUS
// ============================================

export async function getLinkStatus(
  linkId: string,
  backendUrl: string,
  accessToken: string
): Promise<LinkServiceResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/links/${linkId}`, {
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

    const data: ChildSchoolLink = await response.json();
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
