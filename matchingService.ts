/**
 * EduPiFlow — Matching Service
 * Implements the PiScholarship matching algorithm.
 *
 * Priority scoring (max 100 points):
 * - Academic merit score: 0 to 40 points
 * - Financial need score: 0 to 30 points
 * - Regional alignment score: 0 to 20 points
 * - Time on waitlist score: 0 to 10 points
 *
 * Tie-breaker: student with longer waitlist time takes priority.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  Scholarship,
  ScholarshipApplication,
  MatchingScore,
} from './scholarshipTypes';
import { ParentProfile } from './eduConnectTypes';

// ============================================
// ACADEMIC MERIT SCORE (0-40 points)
// ============================================

/**
 * Calculate the academic merit score based on the student's last validated results.
 *
 * - Average score 90-100% → 40 points
 * - Average score 80-89%  → 32 points
 * - Average score 70-79%  → 24 points
 * - Average score 60-69%  → 16 points
 * - Average score 50-59%  → 8 points
 * - Average score < 50%   → 0 points
 */
export function calculateAcademicMeritScore(
  lastAveragePercentage: number
): number {
  if (lastAveragePercentage >= 90) return 40;
  if (lastAveragePercentage >= 80) return 32;
  if (lastAveragePercentage >= 70) return 24;
  if (lastAveragePercentage >= 60) return 16;
  if (lastAveragePercentage >= 50) return 8;
  return 0;
}

// ============================================
// FINANCIAL NEED SCORE (0-30 points)
// ============================================

/**
 * Calculate the financial need score based on:
 * - Parent plan (FlowBasic = high need, FlowFamily = medium, FlowPremium = low)
 * - Payment history (on-time payments = lower need, late payments = higher need)
 */
export function calculateFinancialNeedScore(
  parentPlan: 'FlowBasic' | 'FlowFamily' | 'FlowPremium',
  latePaymentsCount: number,
  totalPaymentsCount: number
): number {
  let planScore = 0;

  // Plan-based score (max 20 points)
  switch (parentPlan) {
    case 'FlowBasic':
      planScore = 20;
      break;
    case 'FlowFamily':
      planScore = 10;
      break;
    case 'FlowPremium':
      planScore = 0;
      break;
  }

  // Payment history score (max 10 points)
  let paymentScore = 0;
  if (totalPaymentsCount > 0) {
    const lateRatio = latePaymentsCount / totalPaymentsCount;
    paymentScore = Math.round(lateRatio * 10);
  }

  return Math.min(planScore + paymentScore, 30);
}

// ============================================
// REGIONAL ALIGNMENT SCORE (0-20 points)
// ============================================

/**
 * Calculate the regional alignment score.
 * - Donor's country matches student's country → 20 points
 * - Donor's region matches student's region  → 10 points
 * - No match                                  → 0 points
 */
export function calculateRegionalAlignmentScore(
  donorCountries: string[],
  donorRegions: string[],
  studentCountry: string,
  studentRegion: string
): number {
  // If donor has no geographic preference, give full score
  if (donorCountries.length === 0 && donorRegions.length === 0) {
    return 20;
  }

  if (donorCountries.includes(studentCountry)) {
    return 20;
  }

  if (donorRegions.includes(studentRegion)) {
    return 10;
  }

  return 0;
}

// ============================================
// TIME ON WAITLIST SCORE (0-10 points)
// ============================================

/**
 * Calculate the time-on-waitlist score.
 * - More than 90 days waiting → 10 points
 * - 60-90 days               → 7 points
 * - 30-59 days               → 4 points
 * - Less than 30 days        → 0 points
 */
export function calculateTimeOnWaitlistScore(
  daysOnWaitlist: number
): number {
  if (daysOnWaitlist >= 90) return 10;
  if (daysOnWaitlist >= 60) return 7;
  if (daysOnWaitlist >= 30) return 4;
  return 0;
}

// ============================================
// COMPOSITE SCORE (0-100 points)
// ============================================

/**
 * Calculate the full matching score for an application.
 */
export function calculateMatchingScore(params: {
  lastAveragePercentage: number;
  parentPlan: 'FlowBasic' | 'FlowFamily' | 'FlowPremium';
  latePaymentsCount: number;
  totalPaymentsCount: number;
  donorCountries: string[];
  donorRegions: string[];
  studentCountry: string;
  studentRegion: string;
  daysOnWaitlist: number;
}): MatchingScore {
  const academicMeritScore = calculateAcademicMeritScore(
    params.lastAveragePercentage
  );
  const financialNeedScore = calculateFinancialNeedScore(
    params.parentPlan,
    params.latePaymentsCount,
    params.totalPaymentsCount
  );
  const regionalAlignmentScore = calculateRegionalAlignmentScore(
    params.donorCountries,
    params.donorRegions,
    params.studentCountry,
    params.studentRegion
  );
  const timeOnWaitlistScore = calculateTimeOnWaitlistScore(
    params.daysOnWaitlist
  );

  const compositeScore =
    academicMeritScore +
    financialNeedScore +
    regionalAlignmentScore +
    timeOnWaitlistScore;

  return {
    academicMeritScore,
    financialNeedScore,
    regionalAlignmentScore,
    timeOnWaitlistScore,
    compositeScore,
  };
}

// ============================================
// RANK APPLICATIONS
// ============================================

/**
 * Rank applications by composite score (descending).
 * Tie-breaker: longer waitlist time takes priority.
 */
export function rankApplications(
  applications: ScholarshipApplication[]
): ScholarshipApplication[] {
  return [...applications].sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }
    // Tie-breaker: longer waitlist time wins
    const aDate = new Date(a.appliedAt).getTime();
    const bDate = new Date(b.appliedAt).getTime();
    return aDate - bDate; // earlier application = longer wait
  });
}

// ============================================
// SELECT RECIPIENTS
// ============================================

/**
 * Select the top N recipients for a scholarship.
 */
export function selectRecipients(
  applications: ScholarshipApplication[],
  maxRecipients: number
): ScholarshipApplication[] {
  const ranked = rankApplications(applications);
  return ranked.slice(0, maxRecipients);
}

// ============================================
// CHECK ELIGIBILITY
// ============================================

/**
 * Check if a student is eligible for a scholarship based on the criteria.
 */
export function checkEligibility(
  scholarship: Scholarship,
  student: {
    educationLevel: string;
    country: string;
    region: string;
    lastAveragePercentage: number;
    parentPlan: 'FlowBasic' | 'FlowFamily' | 'FlowPremium';
  }
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (
    scholarship.eligibleEducationLevels.length > 0 &&
    !scholarship.eligibleEducationLevels.includes(
      student.educationLevel as any
    )
  ) {
    reasons.push(
      `Education level "${student.educationLevel}" is not eligible.`
    );
  }

  if (
    scholarship.eligibleCountries.length > 0 &&
    !scholarship.eligibleCountries.includes(student.country)
  ) {
    reasons.push(`Country "${student.country}" is not eligible.`);
  }

  if (
    scholarship.eligibleRegions.length > 0 &&
    !scholarship.eligibleRegions.includes(student.region)
  ) {
    reasons.push(`Region "${student.region}" is not eligible.`);
  }

  if (student.lastAveragePercentage < scholarship.minAcademicScore) {
    reasons.push(
      `Academic score (${student.lastAveragePercentage}%) is below the minimum (${scholarship.minAcademicScore}%).`
    );
  }

  if (
    scholarship.maxFamilyIncomeLevel !== 'any' &&
    scholarship.maxFamilyIncomeLevel === 'low' &&
    student.parentPlan !== 'FlowBasic'
  ) {
    reasons.push(
      'This scholarship is reserved for low-income families (FlowBasic plan).'
    );
  }

  return { eligible: reasons.length === 0, reasons };
}

// ============================================
// AUTO-MATCH (called by backend cron)
// ============================================

/**
 * Automatically match eligible applications to available scholarships.
 * Returns the list of applications to be awarded.
 */
export async function runAutoMatch(
  scholarship: Scholarship,
  applications: ScholarshipApplication[],
  studentData: Map<string, {
    educationLevel: string;
    country: string;
    region: string;
    lastAveragePercentage: number;
    parentPlan: 'FlowBasic' | 'FlowFamily' | 'FlowPremium';
  }>,
  backendUrl: string,
  accessToken: string
): Promise<ScholarshipApplication[]> {
  // Filter eligible applications
  const eligible = applications.filter((app) => {
    const data = studentData.get(app.studentId);
    if (!data) return false;
    const { eligible: isEligible } = checkEligibility(scholarship, data);
    return isEligible;
  });

  // Select top recipients
  const recipients = selectRecipients(eligible, scholarship.maxRecipients);

  // Award each recipient via backend
  for (const recipient of recipients) {
    try {
      await fetch(
        `${backendUrl}/api/applications/${recipient.id}/award`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.warn(
        `[matchingService] Could not award ${recipient.id}:`,
        error
      );
    }
  }

  return recipients;
}
