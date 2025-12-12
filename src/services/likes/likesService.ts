/**
 * Likes API
 * 
 * Handles post likes/unlikes with idempotent operations.
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  startAfter,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  increment,
} from 'firebase/firestore';
import { db } from '../auth/authService';

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
  try {
    const likeId = `${userId}_${postId}`;
    const likeRef = doc(db, 'likes', likeId);
    
    // Check if already liked
    const likeSnap = await getDoc(likeRef);
    if (likeSnap.exists()) {
      return; // Already liked, no-op
    }
    
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      // Create like document
      transaction.set(likeRef, {
        userId,
        postId,
        createdAt: serverTimestamp(),
      });
      
      // Increment post like count
      const postRef = doc(db, 'posts', postId);
      transaction.update(postRef, {
        likeCount: increment(1),
      });
    });
  } catch (error: any) {
    console.error('Error liking post:', error);
    throw { code: 'like-post-failed', message: 'Failed to like post' };
  }
}

/**
 * Unlike a post (idempotent)
 * @param userId - User ID
 * @param postId - Post ID
 */
export async function unlikePost(userId: string, postId: string): Promise<void> {
  try {
    const likeId = `${userId}_${postId}`;
    const likeRef = doc(db, 'likes', likeId);
    
    // Check if liked
    const likeSnap = await getDoc(likeRef);
    if (!likeSnap.exists()) {
      return; // Not liked, no-op
    }
    
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      // Delete like document
      transaction.delete(likeRef);
      
      // Decrement post like count
      const postRef = doc(db, 'posts', postId);
      const postSnap = await transaction.get(postRef);
      if (postSnap.exists()) {
        const currentCount = postSnap.data().likeCount || 0;
        transaction.update(postRef, {
          likeCount: Math.max(0, currentCount - 1),
        });
      }
    });
  } catch (error: any) {
    console.error('Error unliking post:', error);
    throw { code: 'unlike-post-failed', message: 'Failed to unlike post' };
  }
}

/**
 * Check if post is liked by user
 * @param userId - User ID
 * @param postId - Post ID
 * @returns true if liked, false otherwise
 */
export async function isPostLiked(userId: string, postId: string): Promise<boolean> {
  try {
    const likeId = `${userId}_${postId}`;
    const likeRef = doc(db, 'likes', likeId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  } catch (error: any) {
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

// Note: Hooks call likePost(postId) and unlikePost(postId) without userId
// These functions should get userId from auth context in the hook implementation
// For now, we export the full signature functions above
// Hooks will need to be updated to pass userId, or we can add wrapper functions here

