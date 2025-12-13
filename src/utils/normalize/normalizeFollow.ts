/**
 * Normalize Follow Document
 * 
 * Converts raw Firestore document to typed Follow interface
 * Ensures all required fields exist with safe defaults
 */

import { Timestamp } from 'firebase/firestore';
import { Follow } from '../../types/firestore';

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
 * Normalize follow document to Follow interface
 * @param raw - Raw Firestore document data
 * @returns Normalized Follow object with safe defaults
 */
export function normalizeFollow(raw: any): Follow {
  if (!raw || typeof raw !== 'object') {
    // Return minimal safe follow
    return {
      id: raw?.id || '',
      followerId: '',
      followingId: '',
      createdAt: Timestamp.now(),
    };
  }

  // Normalize field names
  const followerId = raw.followerId || raw.follower || '';
  const followingId = raw.followingId || raw.following || raw.followedId || '';

  // Extract createdAt
  const createdAt = (raw.createdAt || raw.timestamp) ? 
    toTimestamp(raw.createdAt || raw.timestamp) : 
    Timestamp.now();

  return {
    id: raw.id || '',
    followerId,
    followingId,
    followedId: followingId || undefined,
    follower: followerId || undefined,
    following: followingId || undefined,
    createdAt,
    timestamp: createdAt || undefined,
  };
}


