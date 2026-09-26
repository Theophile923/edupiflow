/**
 * EduPiFlow — EduConnect Types
 * Type definitions for the EduConnect registration module.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import { PaymentPlan, SupportedLanguage, DisplayCurrency } from './piConfig';

// ============================================
// SHARED TYPES
// ============================================
export type ActorRole = 'parent' | 'school' | 'student' | 'donor';

export type EducationLevel =
  | 'nursery'
  | 'primary'
  | 'secondary'
  | 'higher'
  | 'vocational';

export type LinkStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'transferred'
  | 'expired';

// ============================================
// PARENT PROFILE
// ============================================
export interface ParentProfile {
  id: string;                    // Pi UID
  piUsername: string;
  walletAddress: string;
  fullName: string;
  country: string;
  preferredLanguage: SupportedLanguage;
  preferredCurrency: DisplayCurrency;
  plan: 'FlowBasic' | 'FlowFamily' | 'FlowPremium';
  createdAt: string;
  children: ChildProfile[];
}

export interface ChildProfile {
  id: string;                    // internal UUID
  fullName: string;
  dateOfBirth: string;           // ISO 8601
  educationLevel: EducationLevel;
  currentSchoolId: string | null;
  academicTokens: string[];      // SBT IDs
  createdAt: string;
}

// ============================================
// SCHOOL PROFILE
// ============================================
export interface SchoolProfile {
  id: string;                    // internal UUID
  piUsername: string;
  walletAddress: string;
  officialName: string;
  registrationNumber: string;
  country: string;
  region: string;
  educationLevels: EducationLevel[];
  contactEmail: string;
  preferredLanguage: SupportedLanguage;
  academicCalendar: AcademicCalendar;
  paymentPlans: PaymentPlan[];
  securityDepositPaid: boolean;
  securityDepositAmount: number; // in Pi
  isActive: boolean;
  isBlacklisted: boolean;
  createdAt: string;
  totalEnrolledStudents: number;
}

export interface AcademicCalendar {
  startMonth: number;            // 1-12
  endMonth: number;              // 1-12
  semesterStructure: 'two_semesters' | 'three_terms' | 'four_terms';
}

// ============================================
// CHILD-SCHOOL LINK
// ============================================
export interface ChildSchoolLink {
  id: string;                    // internal UUID
  childId: string;
  parentId: string;
  schoolId: string;
  status: LinkStatus;
  requestedAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  linkedBy: 'parent' | 'school';
  transferFeePaid: boolean;      // 0.5 μπ if transfer
  notes: string | null;
}

// ============================================
// REGISTRATION REQUESTS
// ============================================
export interface CreateParentProfileRequest {
  fullName: string;
  country: string;
  preferredLanguage: SupportedLanguage;
  preferredCurrency: DisplayCurrency;
}

export interface CreateSchoolProfileRequest {
  officialName: string;
  registrationNumber: string;
  country: string;
  region: string;
  educationLevels: EducationLevel[];
  contactEmail: string;
  preferredLanguage: SupportedLanguage;
  academicCalendar: AcademicCalendar;
  paymentPlans: PaymentPlan[];
}

export interface AddChildRequest {
  fullName: string;
  dateOfBirth: string;
  educationLevel: EducationLevel;
}

export interface RequestLinkRequest {
  childId: string;
  schoolId: string;
  notes?: string;
}

export interface ConfirmLinkRequest {
  linkId: string;
}

export interface RejectLinkRequest {
  linkId: string;
  reason: string;
}

// ============================================
// SERVICE RESPONSES
// ============================================
export interface ServiceResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export type ParentServiceResponse = ServiceResponse<ParentProfile>;
export type SchoolServiceResponse = ServiceResponse<SchoolProfile>;
export type LinkServiceResponse = ServiceResponse<ChildSchoolLink>;
export type ChildListResponse = ServiceResponse<ChildProfile[]>;
