/**
 * EduPiFlow — Notification Service
 * Handles real-time, scheduled, and delayed notifications.
 *
 * All notifications are delivered via Pi Network's native notification system
 * and in-app alerts. Notification language follows the user's profile preference.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  Notification,
  NotificationType,
  NotificationPriority,
  SingleNotificationResponse,
  NotificationListResponse,
} from './notificationTypes';

// ============================================
// SEND NOTIFICATION
// ============================================

/**
 * Send a notification to a user.
 * The backend determines the language from the user's profile.
 */
export async function sendNotification(
  recipientId: string,
  recipientRole: 'parent' | 'school' | 'student' | 'donor' | 'arbitrator',
  type: NotificationType,
  priority: NotificationPriority,
  context: {
    contractId?: string;
    paymentId?: string;
    disputeId?: string;
    scholarshipId?: string;
    tokenId?: string;
  },
  backendUrl: string,
  accessToken: string
): Promise<SingleNotificationResponse> {
  try {
    const response = await fetch(`${backendUrl}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipientId,
        recipientRole,
        type,
        priority,
        ...context,
      }),
    });

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Notification = await response.json();
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
// LIST USER NOTIFICATIONS
// ============================================

export async function listUserNotifications(
  userId: string,
  unreadOnly: boolean,
  backendUrl: string,
  accessToken: string
): Promise<NotificationListResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/users/${userId}/notifications?unread=${unreadOnly}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Notification[] = await response.json();
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
// MARK AS READ
// ============================================

export async function markAsRead(
  notificationId: string,
  backendUrl: string,
  accessToken: string
): Promise<SingleNotificationResponse> {
  try {
    const response = await fetch(
      `${backendUrl}/api/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP ${response.status}` };
    }

    const data: Notification = await response.json();
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
// SCHEDULED NOTIFICATION TEMPLATES
// ============================================

/**
 * Get the list of scheduled notifications for a given payment.
 * Used by the backend cron job.
 */
export function getScheduledNotifications(
  paymentDueDate: string,
  contractEndDate: string
): Array<{ type: NotificationType; triggerDate: string; priority: NotificationPriority }> {
  const due = new Date(paymentDueDate);
  const end = new Date(contractEndDate);

  const minus7 = new Date(due.getTime() - 7 * 24 * 60 * 60 * 1000);
  const minus3 = new Date(due.getTime() - 3 * 24 * 60 * 60 * 1000);
  const minus1 = new Date(due.getTime() - 1 * 24 * 60 * 60 * 1000);
  const renewal30 = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  return [
    {
      type: 'payment_due_7_days',
      triggerDate: minus7.toISOString(),
      priority: 'normal',
    },
    {
      type: 'payment_due_3_days',
      triggerDate: minus3.toISOString(),
      priority: 'normal',
    },
    {
      type: 'payment_due_1_day',
      triggerDate: minus1.toISOString(),
      priority: 'high',
    },
    {
      type: 'contract_renewal_upcoming',
      triggerDate: renewal30.toISOString(),
      priority: 'normal',
    },
  ];
}

/**
 * Get the list of delayed notifications for a late payment.
 */
export function getDelayedNotifications(
  daysLate: number
): Array<{ type: NotificationType; priority: NotificationPriority }> {
  const notifications: Array<{
    type: NotificationType;
    priority: NotificationPriority;
  }> = [];

  if (daysLate === 1) {
    notifications.push({ type: 'late_payment_warning', priority: 'high' });
  }

  if (daysLate === 7) {
    notifications.push({
      type: 'access_suspension_warning',
      priority: 'high',
    });
  }

  if (daysLate === 15) {
    notifications.push({ type: 'school_alert', priority: 'urgent' });
  }

  if (daysLate === 28) {
    notifications.push({
      type: 'contract_termination_warning',
      priority: 'urgent',
    });
  }

  return notifications;
}

// ============================================
// REAL-TIME NOTIFICATION HELPERS
// ============================================

/**
 * Send a payment confirmation notification (within 60 seconds of blockchain validation).
 */
export async function notifyPaymentConfirmed(
  parentId: string,
  paymentId: string,
  contractId: string,
  backendUrl: string,
  accessToken: string
): Promise<SingleNotificationResponse> {
  return sendNotification(
    parentId,
    'parent',
    'payment_confirmed',
    'normal',
    { paymentId, contractId },
    backendUrl,
    accessToken
  );
}

/**
 * Send a dispute raised notification (immediate).
 */
export async function notifyDisputeRaised(
  recipientId: string,
  recipientRole: 'parent' | 'school',
  disputeId: string,
  backendUrl: string,
  accessToken: string
): Promise<SingleNotificationResponse> {
  return sendNotification(
    recipientId,
    recipientRole,
    'dispute_raised',
    'urgent',
    { disputeId },
    backendUrl,
    accessToken
  );
}

/**
 * Send a scholarship matched notification (immediate).
 */
export async function notifyScholarshipMatched(
  parentId: string,
  scholarshipId: string,
  backendUrl: string,
  accessToken: string
): Promise<SingleNotificationResponse> {
  return sendNotification(
    parentId,
    'parent',
    'scholarship_matched',
    'high',
    { scholarshipId },
    backendUrl,
    accessToken
  );
}

/**
 * Send an SBT issued notification (immediate).
 */
export async function notifySbtIssued(
  parentId: string,
  tokenId: string,
  backendUrl: string,
  accessToken: string
): Promise<SingleNotificationResponse> {
  return sendNotification(
    parentId,
    'parent',
    'sbt_issued',
    'normal',
    { tokenId },
    backendUrl,
    accessToken
  );
}
