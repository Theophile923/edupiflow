/**
 * EduPiFlow — Tribunal Types
 * Type definitions for the Pi Community Tribunal.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

// ============================================
// DISPUTE
// ============================================
export type DisputeStatus =
  | 'open'
  | 'under_mediation'
  | 'under_tribunal'
  | 'under_appeal'
  | 'resolved'
  | 'closed';

export type DisputeType =
  | 'payment_delay'
  | 'deposit_forfeiture'
  | 'service_non_conformity'
  | 'report_card_delay'
  | 'contract_termination'
  | 'other';

export interface Dispute {
  id: string;
  contractId: string;
  paymentId: string | null;
  raisedBy: 'parent' | 'school';
  raisedById: string;
  disputeType: DisputeType;
  description: string;
  evidenceUrls: string[];        // uploaded documents/photos

  // Financial
  disputedAmountPi: number;
  disputedAmountMicroPi: number;

  // Resolution path
  status: DisputeStatus;
  isAutoMediation: boolean;      // true if < 10 μπ
  tribunalId: string | null;     // null if auto-mediation
  appealTribunalId: string | null;

  // Outcome
  verdict: string | null;
  verdictDate: string | null;
  verdictExecuted: boolean;

  // Metadata
  raisedAt: string;
  resolvedAt: string | null;
}

// ============================================
// TRIBUNAL PANEL
// ============================================
export type TribunalLevel = 'primary' | 'appeal';

export interface TribunalPanel {
  id: string;
  disputeId: string;
  level: TribunalLevel;
  arbitratorIds: string[];        // 5 for primary, 7 for appeal
  arbitratorWallets: string[];
  createdAt: string;
  votingDeadline: string;         // 5 business days after creation
  votesSubmitted: number;

  // Outcome
  verdict: 'parent_wins' | 'school_wins' | 'split' | 'pending';
  verdictDetails: string | null;
  majorityCount: number;
  minorityCount: number;
  executedAt: string | null;
}

// ============================================
// ARBITRATOR
// ============================================
export interface Arbitrator {
  id: string;                     // Pi UID
  piUsername: string;
  walletAddress: string;
  isCertified: boolean;
  hasCleanRecord: boolean;
  casesHandled: number;
  feeEarnedMicroPi: number;       // 0.5 μπ per case
  createdAt: string;
}

export interface ArbitratorVote {
  id: string;
  tribunalId: string;
  arbitratorId: string;
  vote: 'parent_wins' | 'school_wins' | 'split';
  reasoning: string;
  votedAt: string;
}

// ============================================
// SERVICE RESPONSES
// ============================================
export interface TribunalResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export type DisputeResponse = TribunalResponse<Dispute>;
export type PanelResponse = TribunalResponse<TribunalPanel>;
