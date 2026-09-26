/**
 * EduPiFlow — Scholarship Types
 * Type definitions for the PiScholarship Engine.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 *
 * PAYMENT POLICY: All donations and scholarship receipts are settled exclusively in Pi Coin.
 */

import { EducationLevel } from './eduConnectTypes';

// ============================================
// SCHOLARSHIP
// ============================================
export type ScholarshipStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'fully_allocated'
  | 'closed';

export type ScholarshipType =
  | 'named'         // donor name is public
  | 'anonymous'     // donor stays anonymous
  | 'community';    // funded by the 2% pool

export interface Scholarship {
  id: string;                        // internal UUID
  name: string;
  description: string;
  type: ScholarshipType;
  donorId: string | null;            // null for community scholarships
  donorDisplayName: string | null;   // null if anonymous

  // Financial
  totalAmountPi: number;
  allocatedAmountPi: number;
  remainingAmountPi: number;
  maxRecipients: number;
  amountPerRecipientPi: number;

  // Eligibility criteria
  eligibleEducationLevels: EducationLevel[];
  eligibleCountries: string[];       // ISO country codes, empty = all
  eligibleRegions: string[];
  minAcademicScore: number;          // 0-100
  maxFamilyIncomeLevel: 'low' | 'medium' | 'any';

  // Timing
  applicationOpenDate: string;
  applicationCloseDate: string;
  scholarshipStartDate: string;
  scholarshipEndDate: string;

  // State
  status: ScholarshipStatus;
  recipientsCount: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CreateScholarshipRequest {
  name: string;
  description: string;
  type: ScholarshipType;
  totalAmountPi: number;
  maxRecipients: number;
  amountPerRecipientPi: number;
  eligibleEducationLevels: EducationLevel[];
  eligibleCountries: string[];
  eligibleRegions: string[];
  minAcademicScore: number;
  maxFamilyIncomeLevel: 'low' | 'medium' | 'any';
  applicationOpenDate: string;
  applicationCloseDate: string;
  scholarshipStartDate: string;
  scholarshipEndDate: string;
}

// ============================================
// SCHOLARSHIP APPLICATION
// ============================================
export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'matched'
  | 'awarded'
  | 'rejected'
  | 'waitlisted';

export interface ScholarshipApplication {
  id: string;
  scholarshipId: string;
  studentId: string;
  parentId: string;
  schoolId: string;

  // Scores
  academicMeritScore: number;        // 0-40
  financialNeedScore: number;        // 0-30
  regionalAlignmentScore: number;    // 0-20
  timeOnWaitlistScore: number;       // 0-10
  compositeScore: number;            // 0-100

  // State
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt: string | null;
  awardedAt: string | null;
  waitlistPosition: number | null;

  // Metadata
  notes: string | null;
}

// ============================================
// SCHOLARSHIP RECEIPT
// ============================================
export interface ScholarshipReceipt {
  id: string;
  applicationId: string;
  scholarshipId: string;
  studentId: string;
  parentId: string;
  amountPi: number;
  memo: 'EPF-SCHOLAR-R';
  txid: string | null;
  receivedAt: string;
}

// ============================================
// SCHOLARSHIP DONATION
// ============================================
export interface ScholarshipDonation {
  id: string;
  donorId: string;
  donorDisplayName: string | null;
  amountPi: number;
  memo: 'EPF-SCHOLAR-D';
  txid: string | null;
  scholarshipId: string | null;      // null = goes to community pool
  donatedAt: string;
}

// ============================================
// MATCHING SCORE BREAKDOWN
// ============================================
export interface MatchingScore {
  academicMeritScore: number;        // 0-40
  financialNeedScore: number;        // 0-30
  regionalAlignmentScore: number;    // 0-20
  timeOnWaitlistScore: number;       // 0-10
  compositeScore: number;            // 0-100
}

// ============================================
// SERVICE RESPONSES
// ============================================
export interface ScholarshipResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export type SingleScholarshipResponse = ScholarshipResponse<Scholarship>;
export type ApplicationResponse = ScholarshipResponse<ScholarshipApplication>;
export type DonationResponse = ScholarshipResponse<ScholarshipDonation>;
export type ReceiptResponse = ScholarshipResponse<ScholarshipReceipt>;
