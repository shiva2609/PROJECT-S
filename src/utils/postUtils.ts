/**
 * Post Utilities
 * Normalization and safety checks for posts
 */

import { serverTimestamp } from 'firebase/firestore';

export interface PostData {
  id?: string;
  createdBy?: string;
  userId?: string;
  createdAt?: any;
  [key: string]: any;
}

/**
 * Normalize post author field (userId -> createdBy)
 */
export function normalizePostAuthor(post: PostData): PostData {
  if (!post.createdBy && post.userId) {
    return { ...post, createdBy: post.userId };
  }
  return post;
}

/**
 * Check if post has valid createdAt
 */
export function hasValidCreatedAt(post: PostData): boolean {
  return !!post.createdAt;
}

/**
 * Get timestamp value from createdAt (handles Firestore Timestamp)
 */
export function getCreatedAtTimestamp(createdAt: any): number {
  if (!createdAt) return 0;
  if (typeof createdAt === 'number') return createdAt;
  if (createdAt.toMillis && typeof createdAt.toMillis === 'function') {
    return createdAt.toMillis();
  }
  if (createdAt.seconds) {
    return createdAt.seconds * 1000;
  }
  return 0;
}

/**
 * Sort posts by createdAt descending, with missing createdAt at the end
 */
export function sortPostsByCreatedAt(posts: PostData[]): PostData[] {
  return posts.sort((a, b) => {
    const aTime = getCreatedAtTimestamp(a.createdAt);
    const bTime = getCreatedAtTimestamp(b.createdAt);
    
    // Posts without createdAt go to the end
    if (aTime === 0 && bTime === 0) return 0;
    if (aTime === 0) return 1;
    if (bTime === 0) return -1;
    
    return bTime - aTime; // Descending
  });
}

/**
 * Filter out posts without createdAt
 */
export function filterValidPosts(posts: PostData[]): PostData[] {
  return posts.filter(hasValidCreatedAt);
}

/**
 * Ensure post has createdAt using serverTimestamp
 */
export function ensurePostCreatedAt(postData: any): any {
  if (!postData.createdAt) {
    return {
      ...postData,
      createdAt: serverTimestamp(),
    };
  }
  return postData;
}

/**
 * Ensure post has both createdBy and userId for backward compatibility
 */
export function ensurePostAuthorFields(postData: any, userId: string): any {
  return {
    ...postData,
    createdBy: postData.createdBy || userId,
    userId: postData.userId || userId,
  };
}

/**
 * Normalize post to support multi-image posts (Instagram-like)
 * Ensures mediaUrls is always an array, converting from legacy fields if needed
 * CRITICAL: Preserves aspectRatio and ratio fields - these are set by the user during upload and MUST NEVER be changed
 */
export function normalizePost(post: PostData): PostData {
  const normalized = { ...post };

  // CRITICAL: Preserve aspectRatio and ratio - these are set by the user during upload
  // aspectRatio is the numeric value (1, 0.8, 1.777, etc.)
  // ratio is the string value ('1:1', '4:5', '16:9')
  // These MUST be preserved exactly as stored - never override or default
  const preservedAspectRatio = (normalized as any).aspectRatio;
  const preservedRatio = (normalized as any).ratio;

  // CRITICAL: If mediaUrls already exists and is an array, use it (contains final cropped bitmaps)
  if (Array.isArray(normalized.mediaUrls) && normalized.mediaUrls.length > 0) {
    // Ensure aspectRatio and ratio are preserved
    if (preservedAspectRatio !== undefined) {
      (normalized as any).aspectRatio = preservedAspectRatio;
    }
    if (preservedRatio !== undefined) {
      (normalized as any).ratio = preservedRatio;
    }
    return normalized; // Already normalized - mediaUrls contains final cropped bitmaps
  }

  // CRITICAL: Convert to mediaUrls array using ONLY final cropped bitmaps
  // PRIORITY ORDER: 
  // 1. finalCroppedUrl (REAL cropped bitmap from CropAdjustScreen) - HIGHEST PRIORITY
  // 2. media array with url/uri fields (these should contain final cropped bitmaps from upload)
  // 
  // DO NOT use imageUrl, coverImage, or gallery as fallbacks - these might be original images
  // Only use media array if it contains url/uri fields (which should be final cropped bitmaps)
  const mediaUrls: string[] = [];

  // Priority 1: finalCroppedUrl (REAL cropped bitmap from CropAdjustScreen) - HIGHEST PRIORITY
  if ((normalized as any).finalCroppedUrl && typeof (normalized as any).finalCroppedUrl === 'string' && (normalized as any).finalCroppedUrl.length > 0) {
    mediaUrls.push((normalized as any).finalCroppedUrl);
  }
  // Priority 2: Check for media array (should contain final cropped bitmap URLs from upload)
  // Only use media array if it has url/uri fields (these should be final cropped bitmaps)
  // CRITICAL: Filter out undefined/null items before processing
  else if (Array.isArray(normalized.media) && normalized.media.length > 0) {
    normalized.media
      .filter((item: any) => item != null && typeof item === 'object') // Filter out undefined/null items
      .forEach((item: any) => {
        try {
          // Use url or uri from media array (these should be final cropped bitmap URLs)
          const url = item?.url || item?.uri;
          if (url && typeof url === 'string' && url.length > 0) {
            mediaUrls.push(url);
          }
        } catch (error) {
          console.warn('Error processing media item in normalizePost:', error, item);
          // Skip this item and continue
        }
      });
  }
  // Priority 3: Check for mediaUrl (single string - should be final cropped bitmap)
  // Only use if media array is not available
  if (mediaUrls.length === 0 && normalized.mediaUrl && typeof normalized.mediaUrl === 'string' && normalized.mediaUrl.length > 0) {
    mediaUrls.push(normalized.mediaUrl);
  }
  
  // Priority 4: Check for imageUrl (legacy field - use as fallback)
  if (mediaUrls.length === 0 && normalized.imageUrl && typeof normalized.imageUrl === 'string' && normalized.imageUrl.length > 0) {
    mediaUrls.push(normalized.imageUrl);
  }
  
  // Priority 5: Check for photoUrl (alternative field)
  if (mediaUrls.length === 0 && (normalized as any).photoUrl && typeof (normalized as any).photoUrl === 'string' && (normalized as any).photoUrl.length > 0) {
    mediaUrls.push((normalized as any).photoUrl);
  }
  
  // Priority 6: Check for files[0]?.url (nested structure)
  if (mediaUrls.length === 0 && Array.isArray((normalized as any).files) && (normalized as any).files.length > 0) {
    const fileUrl = (normalized as any).files[0]?.url || (normalized as any).files[0]?.uri;
    if (fileUrl && typeof fileUrl === 'string' && fileUrl.length > 0) {
      mediaUrls.push(fileUrl);
    }
  }
  
  // NOTE: We prioritize final cropped bitmaps, but fallback to other fields if needed
  // This ensures images always render, even if the post structure is non-standard

  // Set mediaUrls (always an array, even if empty)
  normalized.mediaUrls = mediaUrls.length > 0 ? mediaUrls : [];

  // CRITICAL: Always preserve aspectRatio and ratio - these are set by the user during upload
  // Never override or default these values - they determine the post card's display ratio
  if (preservedAspectRatio !== undefined) {
    (normalized as any).aspectRatio = preservedAspectRatio;
  }
  if (preservedRatio !== undefined) {
    (normalized as any).ratio = preservedRatio;
  }

  return normalized;
}

