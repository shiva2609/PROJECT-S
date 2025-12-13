/**
 * Normalize Message Document
 * 
 * Converts raw Firestore document to typed Message interface
 * Ensures all required fields exist with safe defaults
 */

import { Timestamp } from 'firebase/firestore';
import { Message } from '../../types/firestore';

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
 * Normalize message document to Message interface
 * @param raw - Raw Firestore document data
 * @returns Normalized Message object with safe defaults
 */
export function normalizeMessage(raw: any): Message {
  if (!raw || typeof raw !== 'object') {
    // Return minimal safe message
    return {
      id: raw?.id || '',
      from: '',
      to: [],
      type: 'text',
      createdAt: Timestamp.now(),
      read: false,
    };
  }

  // Extract participants array
  let participants: string[] = [];
  if (Array.isArray(raw.participants)) {
    participants = raw.participants.filter((id: any) => id && typeof id === 'string');
  } else if (raw.participant && typeof raw.participant === 'string') {
    participants = [raw.participant];
  } else if (Array.isArray(raw.to)) {
    participants = raw.to.filter((id: any) => id && typeof id === 'string');
  } else if (raw.to && typeof raw.to === 'string') {
    participants = [raw.to];
  } else if (raw.from) {
    participants = [raw.from];
  }

  // Extract 'to' array
  let to: string[] = [];
  if (Array.isArray(raw.to)) {
    to = raw.to.filter((id: any) => id && typeof id === 'string');
  } else if (raw.to && typeof raw.to === 'string') {
    to = [raw.to];
  } else if (participants.length > 0) {
    to = participants.filter((id: string) => id !== raw.from);
  }

  // Extract from/senderId
  const from = raw.from || raw.senderId || '';

  // Extract createdAt
  const createdAt = raw.createdAt ? toTimestamp(raw.createdAt) : Timestamp.now();

  // Determine type
  const type: 'text' | 'image' | 'video' = 
    (raw.type === 'image' || raw.type === 'video') ? raw.type : 'text';

  return {
    id: raw.id || '',
    threadId: raw.threadId || raw.conversationId || undefined,
    conversationId: raw.conversationId || raw.threadId || undefined,
    from,
    senderId: from || undefined,
    to,
    participants: participants.length > 0 ? participants : undefined,
    participant: participants[0] || undefined,
    text: raw.text || raw.message || '',
    message: raw.message || raw.text || undefined,
    mediaUrl: raw.mediaUrl || undefined,
    media: Array.isArray(raw.media) ? raw.media : undefined,
    type,
    createdAt,
    delivered: raw.delivered === true,
    read: raw.read === true,
  };
}


