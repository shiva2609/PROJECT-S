/**
 * Safe Firestore Utilities
 * 
 * Global utilities for safe Firestore operations that prevent INTERNAL ASSERTION FAILED errors
 */

import {
  Query,
  QueryDocumentSnapshot,
  DocumentData,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/auth/authService';

// Cache resolved storage URLs
const mediaUrlCache = new Map<string, string>();

/**
 * Validate userId before any Firestore operation
 */
export function validateUserId(userId: any): userId is string {
  return typeof userId === 'string' && userId.trim().length > 0;
}

/**
 * Safe getDocs wrapper that never throws
 * Returns empty array on any error to prevent crashes
 */
export async function safeGetDocs(
  query: Query<DocumentData>
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  try {
    const snapshot = await getDocs(query);
    return snapshot.docs || [];
  } catch (error: any) {
    // Suppress all Firestore errors - return empty array instead of crashing
    // This includes: INTERNAL ASSERTION FAILED, index errors, failed-precondition
    if (error?.code === 'failed-precondition' || 
        error?.message?.includes('INTERNAL ASSERTION FAILED') || 
        error?.message?.includes('Unexpected state') ||
        error?.message?.includes('index') ||
        error?.message?.includes('requires an index')) {
      console.warn('[safeGetDocs] Firestore query error (non-fatal, returning empty):', error?.code || error?.message?.substring(0, 150));
      return [];
    }
    // For any other error, also return empty to prevent crashes
    console.warn('[safeGetDocs] Unexpected error (returning empty):', error?.code || error?.message?.substring(0, 150));
    return [];
  }
}

/**
 * Safe onSnapshot wrapper that never throws
 * CRITICAL: Catches INTERNAL ASSERTION FAILED errors before they crash the app
 */
export function safeOnSnapshot(
  query: Query<DocumentData>,
  onUpdate: (docs: QueryDocumentSnapshot<DocumentData>[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  try {
    return onSnapshot(
      query,
      (snapshot) => {
        try {
          onUpdate(snapshot.docs || []);
        } catch (snapshotErr: any) {
          // Catch errors during snapshot processing
          if (snapshotErr?.message?.includes('INTERNAL ASSERTION FAILED') || 
              snapshotErr?.message?.includes('Unexpected state') ||
              snapshotErr?.message?.includes('AsyncQueue')) {
            console.warn('[safeOnSnapshot] Error processing snapshot (non-fatal):', snapshotErr?.message?.substring(0, 150));
            onUpdate([]);
            return;
          }
          console.error('[safeOnSnapshot] Snapshot processing error:', snapshotErr);
          onUpdate([]);
        }
      },
      (error: any) => {
        // CRITICAL: Suppress INTERNAL ASSERTION FAILED errors
        if (error?.message?.includes('INTERNAL ASSERTION FAILED') || 
            error?.message?.includes('Unexpected state') ||
            error?.message?.includes('AsyncQueue')) {
          console.warn('[safeOnSnapshot] Firestore internal error (non-fatal):', error?.message?.substring(0, 150));
          onUpdate([]); // Return empty array instead of crashing
          return;
        }
        if (onError) {
          onError(error);
        } else {
          console.error('[safeOnSnapshot] Error:', error);
          onUpdate([]);
        }
      }
    );
  } catch (error: any) {
    // Catch errors during query setup
    if (error?.message?.includes('INTERNAL ASSERTION FAILED') || 
        error?.message?.includes('Unexpected state') ||
        error?.message?.includes('AsyncQueue')) {
      console.warn('[safeOnSnapshot] Setup error (non-fatal):', error?.message?.substring(0, 150));
      onUpdate([]);
      return () => {}; // Return no-op unsubscribe
    }
    console.error('[safeOnSnapshot] Setup error:', error);
    onUpdate([]);
    // Return no-op unsubscribe
    return () => {};
  }
}

/**
 * Safe createdAt extraction from Firestore document
 */
export function extractCreatedAt(data: any): number {
  if (!data || typeof data !== 'object') return 0;
  
  try {
    if (data.createdAt?.toMillis && typeof data.createdAt.toMillis === 'function') {
      return data.createdAt.toMillis();
    }
    if (typeof data.createdAt?.seconds === 'number') {
      return data.createdAt.seconds * 1000;
    }
    if (typeof data.createdAt === 'number') {
      return data.createdAt;
    }
  } catch (err) {
    // Ignore
  }
  
  return 0;
}

/**
 * Safe media URL extraction from post document
 */
export function extractMediaUrl(data: any): string | null {
  if (!data || typeof data !== 'object') return null;
  
  try {
    // Priority order for media extraction
    if (Array.isArray(data.mediaUrls) && data.mediaUrls.length > 0 && data.mediaUrls[0]) {
      return String(data.mediaUrls[0]);
    }
    if (data.finalCroppedUrl && typeof data.finalCroppedUrl === 'string') {
      return data.finalCroppedUrl;
    }
    if (data.mediaUrl && typeof data.mediaUrl === 'string') {
      return data.mediaUrl;
    }
    if (data.imageUrl && typeof data.imageUrl === 'string') {
      return data.imageUrl;
    }
    if (data.imageURL && typeof data.imageURL === 'string') {
      return data.imageURL;
    }
    if (data.photoUrl && typeof data.photoUrl === 'string') {
      return data.photoUrl;
    }
    if (Array.isArray(data.media) && data.media.length > 0) {
      const firstMedia = data.media[0];
      if (firstMedia && typeof firstMedia === 'object') {
        const url = firstMedia.url || firstMedia.uri;
        if (url && typeof url === 'string') {
          return url;
        }
      }
    }
    if (Array.isArray(data.files) && data.files.length > 0 && data.files[0]) {
      const fileUrl = data.files[0].url || data.files[0].uri;
      if (fileUrl && typeof fileUrl === 'string') {
        return fileUrl;
      }
    }
    if (data.coverImage && typeof data.coverImage === 'string') {
      return data.coverImage;
    }
    if (Array.isArray(data.gallery) && data.gallery.length > 0 && data.gallery[0]) {
      return String(data.gallery[0]);
    }
  } catch (err) {
    console.warn('[extractMediaUrl] Error extracting media:', err);
  }
  
  return null;
}

/**
 * Resolve storage path to download URL if needed
 */
export async function resolveMediaUrlIfNeeded(path: string | null): Promise<string | null> {
  if (!path || typeof path !== 'string') return null;
  
  // If already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Check cache
  if (mediaUrlCache.has(path)) {
    return mediaUrlCache.get(path)!;
  }
  
  // Try to resolve from storage
  try {
    const url = await getDownloadURL(ref(storage, path));
    mediaUrlCache.set(path, url);
    return url;
  } catch (err) {
    console.warn('[resolveMediaUrlIfNeeded] Failed to resolve storage path:', path, err);
    return null;
  }
}

/**
 * Global post document normalizer
 * Returns safe, normalized post object with all required fields
 */
export function normalizePostDocument(
  docSnap: QueryDocumentSnapshot<DocumentData>
): {
  id: string;
  ownerId: string | null;
  createdAt: number;
  mediaUrl: string | null;
  caption: string;
  likesCount: number;
  commentsCount: number;
  [key: string]: any;
} | null {
  if (!docSnap || !docSnap.id) {
    return null;
  }
  
  const data = docSnap.data();
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  const ownerId = data.ownerId || data.userId || data.createdBy || data.authorId || null;
  const createdAt = extractCreatedAt(data);
  const mediaUrl = extractMediaUrl(data);
  
  return {
    id: docSnap.id,
    ownerId: ownerId ? String(ownerId) : null,
    createdAt,
    mediaUrl,
    caption: (data.caption && typeof data.caption === 'string') ? data.caption : '',
    likesCount: Number(data.likesCount || data.likeCount || 0),
    commentsCount: Number(data.commentsCount || data.commentCount || 0),
    // Preserve other fields
    ...data,
  };
}

/**
 * Global relation document normalizer
 * Returns safe, normalized relation object
 */
export function normalizeRelationDocument(
  docSnap: QueryDocumentSnapshot<DocumentData>
): {
  followerId: string | null;
  followedId: string | null;
  followingId: string | null;
  createdAt: number;
} | null {
  if (!docSnap || !docSnap.id) {
    return null;
  }
  
  const data = docSnap.data();
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  const followerId = data.followerId || null;
  const followedId = data.followedId || null;
  const followingId = data.followingId || null;
  const createdAt = extractCreatedAt(data);
  
  // If both followerId and followedId are null, skip this record
  if (!followerId && !followedId && !followingId) {
    return null;
  }
  
  return {
    followerId: followerId ? String(followerId) : null,
    followedId: followedId ? String(followedId) : null,
    followingId: followingId ? String(followingId) : null,
    createdAt,
  };
}

/**
 * Safe query builder with orderBy fallback
 * Note: Query building is synchronous, but we wrap in async for consistency
 */
export function buildSafeQuery(
  baseQuery: Query<DocumentData>,
  withOrderBy: (q: Query<DocumentData>) => Query<DocumentData>,
  withoutOrderBy: (q: Query<DocumentData>) => Query<DocumentData>
): Query<DocumentData> {
  try {
    // Try with orderBy first
    return withOrderBy(baseQuery);
  } catch (err: any) {
    // If orderBy fails, fallback without orderBy
    if (err?.code === 'failed-precondition' || 
        err?.message?.includes('INTERNAL ASSERTION') ||
        err?.message?.includes('index') ||
        err?.message?.includes('createdAt')) {
      console.warn('[buildSafeQuery] orderBy failed, using fallback:', err?.message?.substring(0, 100));
      return withoutOrderBy(baseQuery);
    }
    // For other errors, still fallback to prevent crashes
    console.warn('[buildSafeQuery] Query error, using fallback:', err?.message?.substring(0, 100));
    return withoutOrderBy(baseQuery);
  }
}

/**
 * Client-side sort by createdAt descending
 */
export function sortByCreatedAtDesc<T extends { createdAt?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt || 0;
    const bTime = b.createdAt || 0;
    return bTime - aTime; // Descending
  });
}

