/**
 * Normalize Post Document
 * 
 * Converts raw Firestore document to typed Post interface
 * Ensures all required fields exist with safe defaults
 * CRITICAL: Always ensures createdAt exists to prevent orderBy errors
 */

import { Timestamp } from '../../core/firebase/compat';
import { Post } from '../../types/firestore';

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
 * Normalize post document to Post interface
 * @param raw - Raw Firestore document data
 * @returns Normalized Post object with safe defaults
 */
export function normalizePost(raw: any): Post {
  if (!raw || typeof raw !== 'object') {
    // Return minimal safe post
    return {
      id: raw?.id || '',
      createdBy: '',
      createdAt: Timestamp.now(),
      likeCount: 0,
      commentCount: 0,
      imageURL: null,
    };
  }

  // Extract owner ID - CRITICAL for queries
  const ownerId = raw.createdBy || raw.userId || raw.ownerId || raw.authorId || '';

  // Extract createdAt - CRITICAL for orderBy queries
  const createdAt = raw.createdAt ? toTimestamp(raw.createdAt) : Timestamp.now();

  // Extract media URL
  const imageURL = raw.imageURL || raw.imageUrl || raw.mediaUrl ||
    raw.coverImage ||
    (Array.isArray(raw.media) && raw.media[0]) ||
    (Array.isArray(raw.mediaUrls) && raw.mediaUrls[0]) ||
    (Array.isArray(raw.gallery) && raw.gallery[0]) ||
    null;

  // Extract gallery
  let gallery: string[] = [];
  if (Array.isArray(raw.gallery)) {
    gallery = raw.gallery.filter((url: any) => url && typeof url === 'string');
  } else if (imageURL) {
    gallery = [imageURL];
  }

  return {
    id: raw.id || '',
    createdBy: ownerId,
    userId: ownerId || undefined,
    ownerId: ownerId || undefined,
    authorId: ownerId || undefined,
    createdAt,
    imageURL,
    imageUrl: imageURL || undefined,
    mediaUrl: imageURL || undefined,
    coverImage: raw.coverImage || imageURL || undefined,
    gallery: gallery.length > 0 ? gallery : undefined,
    media: Array.isArray(raw.media) ? raw.media : undefined,
    mediaUrls: Array.isArray(raw.mediaUrls) ? raw.mediaUrls : undefined,
    likeCount: typeof raw.likeCount === 'number' ? Math.max(0, raw.likeCount) :
      (typeof raw.likesCount === 'number' ? Math.max(0, raw.likesCount) : 0),
    likesCount: typeof raw.likesCount === 'number' ? Math.max(0, raw.likesCount) :
      (typeof raw.likeCount === 'number' ? Math.max(0, raw.likeCount) : 0),
    commentCount: typeof raw.commentCount === 'number' ? Math.max(0, raw.commentCount) :
      (typeof raw.commentsCount === 'number' ? Math.max(0, raw.commentsCount) : 0),
    commentsCount: typeof raw.commentsCount === 'number' ? Math.max(0, raw.commentsCount) :
      (typeof raw.commentCount === 'number' ? Math.max(0, raw.commentCount) : 0),
    savedCount: typeof raw.savedCount === 'number' ? Math.max(0, raw.savedCount) : undefined,
    caption: raw.caption || raw.content || '',
    content: raw.content || raw.caption || undefined,
    savedBy: Array.isArray(raw.savedBy) ? raw.savedBy : undefined,
    isPublic: raw.isPublic !== undefined ? Boolean(raw.isPublic) : true,
    metadata: raw.metadata || undefined,
    aspectRatio: typeof raw.aspectRatio === 'number' ? raw.aspectRatio : undefined,
    ratio: typeof raw.ratio === 'string' ? raw.ratio : undefined,
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : undefined,
    location: raw.location || undefined,
  };
}

