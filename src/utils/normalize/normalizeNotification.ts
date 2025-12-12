/**
 * Normalize Notification Document
 * 
 * Converts raw Firestore document to typed Notification interface
 * Ensures all required fields exist with safe defaults
 */

import { Timestamp } from 'firebase/firestore';
import { Notification } from '../../types/firestore';

/**
 * Check if value is a Firestore Timestamp
 */
function isTimestamp(v: any): v is Timestamp {
  return v && (
    (typeof v.toDate === 'function') ||
    (v._seconds !== undefined && v._nanoseconds !== undefined) ||
    (v.seconds !== undefined && v.nanoseconds !== undefined)
  );
}

/**
 * Convert value to Timestamp
 */
function toTimestamp(v: any): Timestamp {
  if (isTimestamp(v)) {
    return v;
  }
  if (typeof v === 'string') {
    try {
      return Timestamp.fromDate(new Date(v));
    } catch {
      return Timestamp.now();
    }
  }
  if (typeof v === 'number') {
    try {
      return Timestamp.fromMillis(v);
    } catch {
      return Timestamp.now();
    }
  }
  return Timestamp.now();
}

/**
 * Normalize notification document to Notification interface
 * @param raw - Raw Firestore document data
 * @returns Normalized Notification object with safe defaults
 */
export function normalizeNotification(raw: any): Notification {
  if (!raw || typeof raw !== 'object') {
    // Return minimal safe notification
    return {
      id: raw?.id || '',
      userId: '',
      type: 'unknown',
      timestamp: Timestamp.now(),
      read: false,
    };
  }

  // Extract userId - required
  const userId = raw.userId || raw.recipientId || '';

  // Extract timestamp/createdAt
  const timestamp = (raw.timestamp || raw.createdAt) ? 
    toTimestamp(raw.timestamp || raw.createdAt) : 
    Timestamp.now();

  return {
    id: raw.id || '',
    userId,
    recipientId: userId || undefined,
    type: raw.type || raw.notificationType || 'unknown',
    category: raw.category || undefined,
    actorId: raw.actorId || raw.sourceUserId || undefined,
    sourceUserId: raw.sourceUserId || raw.actorId || undefined,
    postId: raw.postId || undefined,
    message: raw.message || undefined,
    data: raw.data || undefined,
    timestamp,
    createdAt: timestamp || undefined,
    read: raw.read === true,
    notificationType: raw.notificationType || raw.type || undefined,
  };
}

