/**
 * Likes API
 * 
 * Handles post likes/unlikes with idempotent operations.
 * REDIRECTS to centralized PostInteractions service.
 */

import * as PostInteractions from '../../global/services/posts/post.interactions.service';
import { doc, getDoc, collection, query, where, orderBy, getDocs, limit as firestoreLimit, startAfter } from '../../core/firebase/compat';
import { db } from '../../core/firebase';

// ---------- Types ----------

interface PaginationOptions {
  limit?: number;
  lastDoc?: any;
}

interface PaginationResult {
  postIds: string[];
  nextCursor?: any;
}

// ---------- Exported Functions ----------

/**
 * Like a post (idempotent)
 * @param userId - User ID
 * @param postId - Post ID
 */
export async function likePost(userId: string, postId: string): Promise<void> {
  console.log('[likesService] Redirecting likePost to PostInteractions', { userId, postId });
  return PostInteractions.toggleLike(postId, userId, true);
}

/**
 * Unlike a post (idempotent)
 * @param userId - User ID
 * @param postId - Post ID
 */
export async function unlikePost(userId: string, postId: string): Promise<void> {
  console.log('[likesService] Redirecting unlikePost to PostInteractions', { userId, postId });
  return PostInteractions.toggleLike(postId, userId, false);
}

/**
 * Check if post is liked by user
 * @param userId - User ID
 * @param postId - Post ID
 * @returns true if liked, false otherwise
 */
export async function isPostLiked(userId: string, postId: string): Promise<boolean> {
  try {
    // Check the source of truth: posts/{postId}/likes/{userId}
    const likeRef = doc(db, 'posts', postId, 'likes', userId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
}

/**
 * Get liked posts for a user
 * @param userId - User ID
 * @param options - Pagination options
 * @returns Paginated post IDs
 */
export async function getLikedPosts(
  userId: string,
  options?: PaginationOptions
): Promise<PaginationResult> {
  try {
    const limit = options?.limit || 20;
    const likesRef = collection(db, 'likes');

    let q = query(
      likesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    if (options?.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const postIds = querySnapshot.docs.map(doc => doc.data().postId);
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

    return {
      postIds,
      nextCursor: querySnapshot.docs.length === limit ? lastDoc : undefined,
    };
  } catch (error: any) {
    console.error('Error getting liked posts:', error);
    throw { code: 'get-liked-posts-failed', message: 'Failed to fetch liked posts' };
  }
}
