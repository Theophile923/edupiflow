/**
 * EduPiFlow — Pi Authentication Service
 * Wraps Pi.authenticate() and handles incomplete payments.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import { PI_SCOPES } from './piConfig';

// ============================================
// TYPES
// ============================================
export interface PiAuthResult {
  accessToken: string;
  user: {
    uid: string;
    username: string;
    wallet_address?: string;
  };
}

export interface IncompletePayment {
  identifier: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  transaction?: {
    txid: string;
    verified: boolean;
  };
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Authenticate the Pioneer using Pi.authenticate().
 * This is the ONLY allowed authentication method in EduPiFlow.
 *
 * @param onIncompletePaymentFound - Callback invoked when an incomplete payment is detected.
 * @returns Promise resolving to the authenticated user's data.
 */
export async function authenticatePioneer(
  onIncompletePaymentFound: (payment: IncompletePayment) => void
): Promise<PiAuthResult> {
  // Ensure the Pi SDK is available
  if (typeof window === 'undefined' || !(window as any).Pi) {
    throw new Error(
      'Pi SDK not loaded. Please open EduPiFlow inside Pi Browser.'
    );
  }

  const Pi = (window as any).Pi;

  try {
    const auth = await Pi.authenticate(PI_SCOPES, onIncompletePaymentFound);
    return auth as PiAuthResult;
  } catch (error) {
    console.error('[piAuth] Authentication failed:', error);
    throw new Error(
      'Pi authentication failed. Please open EduPiFlow inside Pi Browser and try again.'
    );
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const SESSION_KEY = 'edupiflow_session';

export function saveSession(auth: PiAuthResult): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(auth));
  } catch (error) {
    console.warn('[piAuth] Could not save session:', error);
  }
}

export function loadSession(): PiAuthResult | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PiAuthResult;
  } catch (error) {
    console.warn('[piAuth] Could not load session:', error);
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('[piAuth] Could not clear session:', error);
  }
}

// ============================================
// SERVER-SIDE TOKEN VERIFICATION
// ============================================

/**
 * Verify the access token with the backend.
 * The backend will call Pi Platform API to verify.
 *
 * @param accessToken - The access token from Pi.authenticate()
 * @param backendUrl - The EduPiFlow backend URL
 * @returns Promise resolving to the verified user data.
 */
export async function verifyTokenWithBackend(
  accessToken: string,
  backendUrl: string
): Promise<PiAuthResult['user']> {
  const response = await fetch(`${backendUrl}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Token verification failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
