/**
 * EduPiFlow — Academic Token Service
 * Handles the issuance and verification of Academic SoulBound Tokens (SBTs).
 *
 * Academic SBTs are:
 * - Non-transferable
 * - Permanently bound to the student's Pi wallet
 * - Cryptographically signed by the issuing school's Pi wallet
 * - Independently verifiable by third parties
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import { PaymentPlan } from './piConfig';

// ============================================
// TYPES
// ============================================
export interface AcademicResult {
  subject: string;
  score: number;                  // 0-100
  maxScore: number;               // usually 100
  grade: string;                  // A, B, C, etc.
  teacherComment: string | null;
}

export interface AcademicToken {
  id: string;                     // SBT identifier
  memo: 'EPF-TOKEN-AC';
  studentId: string;
  studentWalletAddress: string;
  schoolId: string;
  schoolWalletAddress: string;
  academicYear: string;           // e.g. "2025-2026"
  term: string;                   // e.g. "Term 1"
  educationLevel: string;
  results: AcademicResult[];
  overallAverage: number;
  overallGrade: string;
  attendanceRate: number;         // 0-100
  teacherGeneralComment: string | null;

  // Blockchain metadata
  issuedAt: string;
  txid: string | null;
  cryptographicSignature: string | null;
  isVerified: boolean;

  // Privacy
  isMinor: boolean;               // true if student < 18 years old
  custodianWallet: string;        // parent wallet if minor, student wallet if adult
}

export interface IssueTokenRequest {
  studentId: string;
  studentWalletAddress: string;
  schoolId: string;
  academicYear: string;
  term: string;
  educationLevel: string;
  results: AcademicResult[];
  attendanceRate: number;
  teacherGeneralComment: string | null;
  isMinor: boolean;
  custodianWallet: string;
}

// ============================================
// ISSUE ACADEMIC TOKEN
// ============================================

/**
 * Issue an Academic SoulBound Token for a validated report card.
 * The token is signed by the school's Pi wallet and bound to the student's wallet.
 */
export async function issueAcademicToken(
  request: IssueTokenRequest,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: AcademicToken | null; error: string | null }> {
  try {
    // Compute overall average and grade
    const totalScore = request.results.reduce((sum, r) => sum + r.score, 0);
    const overallAverage = request.results.length > 0
      ? totalScore / request.results.length
      : 0;
    const overallGrade = scoreToGrade(overallAverage);

    const response = await fetch(`${backendUrl}/api/academic-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...request,
        overallAverage,
        overallGrade,
        memo: 'EPF-TOKEN-AC',
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

    const data: AcademicToken = await response.json();
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
// VERIFY ACADEMIC TOKEN
// ============================================

/**
 * Verify an Academic SBT independently.
 * Can be called by universities, employers, or government institutions.
 */
export async function verifyAcademicToken(
  tokenId: string,
  backendUrl: string
): Promise<{ success: boolean; data: AcademicToken | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/academic-tokens/${tokenId}/verify`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: AcademicToken = await response.json();
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
// LIST STUDENT TOKENS
// ============================================

export async function listStudentTokens(
  studentId: string,
  backendUrl: string,
  accessToken: string
): Promise<{ success: boolean; data: AcademicToken[] | null; error: string | null }> {
  try {
    const response = await fetch(
      `${backendUrl}/api/students/${studentId}/academic-tokens`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: AcademicToken[] = await response.json();
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
 * Convert a numeric score (0-100) to a letter grade.
 */
export function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  return 'F';
}

/**
 * Compute the overall average from a list of results.
 */
export function computeOverallAverage(results: AcademicResult[]): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, r) => sum + r.score, 0);
  return total / results.length;
}

/**
 * Validate that a report card is complete before issuing the SBT.
 */
export function validateReportCard(
  results: AcademicResult[],
  attendanceRate: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (results.length === 0) {
    errors.push('At least one subject result is required.');
  }

  for (const result of results) {
    if (result.score < 0 || result.score > result.maxScore) {
      errors.push(
        `Invalid score for ${result.subject}: ${result.score}/${result.maxScore}`
      );
    }
  }

  if (attendanceRate < 0 || attendanceRate > 100) {
    errors.push(`Invalid attendance rate: ${attendanceRate}%`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Determine if a student is a minor based on date of birth.
 */
export function isStudentMinor(dateOfBirth: string): boolean {
  const birth = new Date(dateOfBirth);
  const ageMs = Date.now() - birth.getTime();
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  return ageYears < 18;
}
