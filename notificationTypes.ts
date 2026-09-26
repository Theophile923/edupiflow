/**
 * EduPiFlow — Notification Types
 * Type definitions for the notification system.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

export type NotificationType =
  // Real-time
  | 'payment_confirmed'
  | 'dispute_raised'
  | 'tribunal_verdict'
  | 'scholarship_matched'
  | 'sbt_issued'
  // Scheduled
  | 'payment_due_7_days'
  | 'payment_due_3_days'
  | 'payment_due_1_day'
  | 'contract_renewal_upcoming'
  | 'deposit_refund_processed'
  // Delayed
  | 'late_payment_warning'
  | 'access_suspension_warning'
  | 'school_alert'
  | 'contract_termination_warning';

export type NotificationChannel = 'pi_native' | 'in_app' | 'email';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  recipientId: string;              // Pi UID
  recipientRole: 'parent' | 'school' | 'student' | 'donor' | 'arbitrator';
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  channel: NotificationChannel;

  // Context
  contractId: string | null;
  paymentId: string | null;
  disputeId: string | null;
  scholarshipId: string | null;
  tokenId: string | null;

  // Delivery
  isRead: boolean;
  isDelivered: boolean;
  deliveredAt: string | null;
  readAt: string | null;

  // Metadata
  language: string;                 // 'en', 'fr', 'rw', 'sw'
  createdAt: string;
}

// ============================================
// SERVICE RESPONSES
// ============================================
export interface NotificationResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export type SingleNotificationResponse = NotificationResponse<Notification>;
export type NotificationListResponse = NotificationResponse<Notification[]>;
