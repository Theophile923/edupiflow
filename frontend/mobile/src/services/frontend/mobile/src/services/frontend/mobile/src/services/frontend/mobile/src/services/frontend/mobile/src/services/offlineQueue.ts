/**
 * EduPiFlow — Offline Payment Queue
 * Manages payments made while the device is offline.
 *
 * Specs:
 * - Max 3 simultaneous queued payments
 * - Queue expiry: 72 hours from local timestamp
 * - Priority: oldest timestamp first
 * - Local timestamp accepted as good-faith proof for grace window
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 */

import {
  OFFLINE_QUEUE_MAX,
  OFFLINE_QUEUE_EXPIRY_HOURS,
  MemoCode,
} from './piConfig';

// ============================================
// TYPES
// ============================================
export interface QueuedPayment {
  id: string;
  amount: number; // Amount in Pi
  memo: MemoCode;
  metadata: Record<string, string>;
  localTimestamp: string; // ISO 8601
  synced: boolean;
  contractId: string;
}

const STORAGE_KEY = 'edupiflow_offline_queue';

// ============================================
// QUEUE OPERATIONS
// ============================================

/**
 * Load the offline queue from local storage.
 */
export function loadQueue(): QueuedPayment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const queue = JSON.parse(raw) as QueuedPayment[];
    return queue.filter((p) => !isExpired(p));
  } catch (error) {
    console.warn('[offlineQueue] Could not load queue:', error);
    return [];
  }
}

/**
 * Save the offline queue to local storage.
 */
function saveQueue(queue: QueuedPayment[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('[offlineQueue] Could not save queue:', error);
  }
}

/**
 * Check if a queued payment has expired (older than 72 hours).
 */
function isExpired(payment: QueuedPayment): boolean {
  const ageMs = Date.now() - new Date(payment.localTimestamp).getTime();
  return ageMs > OFFLINE_QUEUE_EXPIRY_HOURS * 60 * 60 * 1000;
}

/**
 * Add a payment to the offline queue.
 * Returns false if the queue is full (max 3 payments).
 */
export function enqueuePayment(
  payment: Omit<QueuedPayment, 'id' | 'localTimestamp' | 'synced'>
): boolean {
  const queue = loadQueue();

  if (queue.length >= OFFLINE_QUEUE_MAX) {
    console.warn('[offlineQueue] Queue is full (max 3 payments).');
    return false;
  }

  const queued: QueuedPayment = {
    ...payment,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    localTimestamp: new Date().toISOString(),
    synced: false,
  };

  queue.push(queued);
  saveQueue(queue);
  return true;
}

/**
 * Get the next payment to sync (oldest first).
 */
export function peekNextPayment(): QueuedPayment | null {
  const queue = loadQueue().filter((p) => !p.synced);
  if (queue.length === 0) return null;
  queue.sort(
    (a, b) =>
      new Date(a.localTimestamp).getTime() -
      new Date(b.localTimestamp).getTime()
  );
  return queue[0];
}

/**
 * Mark a payment as synced.
 */
export function markSynced(paymentId: string): void {
  const queue = loadQueue();
  const index = queue.findIndex((p) => p.id === paymentId);
  if (index >= 0) {
    queue[index].synced = true;
    saveQueue(queue);
  }
}

/**
 * Remove a payment from the queue.
 */
export function removePayment(paymentId: string): void {
  const queue = loadQueue().filter((p) => p.id !== paymentId);
  saveQueue(queue);
}

/**
 * Clear all synced payments and expired payments.
 */
export function cleanupQueue(): void {
  const queue = loadQueue().filter((p) => !p.synced && !isExpired(p));
  saveQueue(queue);
}

/**
 * Clear the entire queue (use with caution).
 */
export function clearQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[offlineQueue] Could not clear queue:', error);
  }
}

// ============================================
// SYNC ORCHESTRATION
// ============================================

/**
 * Sync all queued payments with the backend.
 * Called automatically when connection is restored.
 *
 * @param backendUrl - The EduPiFlow backend URL
 * @param onProgress - Callback for each synced payment
 * @param onComplete - Callback when all payments are synced
 */
export async function syncQueue(
  backendUrl: string,
  onProgress: (payment: QueuedPayment) => void,
  onComplete: (totalSynced: number, totalFailed: number) => void
): Promise<void> {
  cleanupQueue();
  const queue = loadQueue().filter((p) => !p.synced);

  let totalSynced = 0;
  let totalFailed = 0;

  for (const payment of queue) {
    try {
      const response = await fetch(`${backendUrl}/api/payments/offline-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      markSynced(payment.id);
      onProgress(payment);
      totalSynced++;
    } catch (error) {
      console.warn(`[offlineQueue] Sync failed for ${payment.id}:`, error);
      totalFailed++;
    }
  }

  onComplete(totalSynced, totalFailed);
}

// ============================================
// CONNECTION LISTENER
// ============================================

/**
 * Register a listener that triggers syncQueue when connection is restored.
 */
export function registerOnlineListener(
  backendUrl: string,
  onProgress: (payment: QueuedPayment) => void,
  onComplete: (totalSynced: number, totalFailed: number) => void
): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.log('[offlineQueue] Connection restored, syncing queue...');
    syncQueue(backendUrl, onProgress, onComplete);
  });
}
