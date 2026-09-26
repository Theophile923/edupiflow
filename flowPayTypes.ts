/**
 * EduPiFlow — FlowPay Types
 * Type definitions for the FlowPay payment and smart contract module.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 *
 * PAYMENT POLICY: All payments are settled exclusively in Pi Coin.
 * RWF and USD are used only for display and conversion purposes.
 */

import { MemoCode, PaymentPlan } from './piConfig';

// ============================================
// SMART CONTRACT
// ============================================
export type ContractStatus =
  | 'draft'
  | 'pending_parent_signature'
  | 'pending_school_signature'
  | 'active'
  | 'suspended'
  | 'disputed'
  | 'completed'
  | 'terminated';

export interface SmartContract {
  id: string;                        // internal UUID
  parentId: string;                  // Pi UID of parent
  parentWalletAddress: string;
  schoolId: string;                  // internal UUID of school
  schoolWalletAddress: string;
  studentId: string;                 // internal UUID of student
  studentProfileId: string;

  // Financial terms
  feeAmountPerPeriod: number;        // in Pi
  paymentPlan: PaymentPlan;
  parentSecurityDeposit: number;     // in Pi (one monthly installment)
  schoolSecurityDeposit: number;     // in Pi (10% of annual revenue)

  // Timing
  startDate: string;                 // ISO 8601
  endDate: string;                   // ISO 8601
  graceWindowDays: number;           // default 7
  autoRenewal: boolean;
  renewalNoticeDays: number;         // default 30

  // Legal clauses
  forceMajeureClause: string;
  depositRefundConditions: string;

  // State
  status: ContractStatus;
  signedByParent: boolean;
  signedBySchool: boolean;
  parentSignedAt: string | null;
  schoolSignedAt: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractRequest {
  parentId: string;
  schoolId: string;
  studentId: string;
  feeAmountPerPeriod: number;
  paymentPlan: PaymentPlan;
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
}

// ============================================
// PAYMENT
// ============================================
export type PaymentStatus =
  | 'pending'
  | 'in_escrow'
  | 'released'
  | 'disputed'
  | 'refunded'
  | 'failed'
  | 'cancelled';

export interface TuitionPayment {
  id: string;                        // payment ID from Pi
  contractId: string;
  parentId: string;
  schoolId: string;
  studentId: string;
  amount: number;                    // in Pi
  memo: MemoCode;
  status: PaymentStatus;
  txid: string | null;               // Pi blockchain transaction ID
  escrowEnteredAt: string | null;
  escrowReleaseAt: string | null;    // 48h after escrowEnteredAt
  releasedAt: string | null;
  disputedAt: string | null;
  disputeReason: string | null;
  createdAt: string;
}

// ============================================
// DISTRIBUTION (92/5/2/1)
// ============================================
export interface PaymentDistribution {
  paymentId: string;
  totalAmount: number;               // in Pi
  schoolShare: number;               // 92%
  promoterShare: number;             // 5%
  scholarshipPoolShare: number;      // 2%
  reserveShare: number;              // 1%
  distributedAt: string;
  schoolTxid: string | null;
  promoterTxid: string | null;
  scholarshipTxid: string | null;
  reserveTxid: string | null;
}

// ============================================
// SECURITY DEPOSIT
// ============================================
export type DepositType = 'parent' | 'school';
export type DepositStatus =
  | 'pending'
  | 'frozen'
  | 'partially_forfeited'
  | 'fully_forfeited'
  | 'refunded';

export interface SecurityDeposit {
  id: string;
  type: DepositType;
  ownerId: string;                   // parent UID or school UUID
  contractId: string | null;         // null for school activation deposit
  amount: number;                    // in Pi
  memo: MemoCode;                    // EPF-CAUTION-P or EPF-CAUTION-E
  status: DepositStatus;
  depositedAt: string;
  frozenUntil: string | null;        // contract end date
  forfeitedAmount: number;           // in Pi
  refundedAmount: number;            // in Pi
  forfeitureReason: string | null;
  refundTxid: string | null;
}

// ============================================
// FORFEITURE
// ============================================
export interface ForfeitureCalculation {
  depositId: string;
  originalAmount: number;            // in Pi
  forfeiturePercentage: number;      // 0.00 to 1.00
  forfeitedAmount: number;           // in Pi
  refundedAmount: number;            // in Pi
  reason: string;
  breakdown: {
    schoolShare?: number;            // for parent deposits
    promoterShare: number;
    reserveShare: number;
    affectedParentsShare?: number;   // for school deposits
  };
}

// ============================================
// PENALTY
// ============================================
export interface LatePaymentPenalty {
  id: string;
  paymentId: string;
  contractId: string;
  parentId: string;
  daysLate: number;
  dailyPenaltyMicroPi: number;       // 0.1 μπ
  totalPenaltyMicroPi: number;       // daysLate × 0.1
  cappedAtMax: boolean;              // true if reached 3.0 μπ
  promoterShareMicroPi: number;      // 50%
  reserveShareMicroPi: number;       // 50%
  createdAt: string;
}

// ============================================
// SERVICE RESPONSES
// ============================================
export interface FlowPayResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export type ContractResponse = FlowPayResponse<SmartContract>;
export type PaymentResponse = FlowPayResponse<TuitionPayment>;
export type DepositResponse = FlowPayResponse<SecurityDeposit>;
export type DistributionResponse = FlowPayResponse<PaymentDistribution>;
export type PenaltyResponse = FlowPayResponse<LatePaymentPenalty>;
