/**
 * User Relation Service
 * 
 * Unified service for follow/unfollow operations with optimistic updates
 */

import { doc, getDoc, setDoc, deleteDoc, runTransaction, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../auth/authService';
import { retryWithBackoff } from '../../utils/retry';
import { validateUserId } from '../../utils/safeFirestore';

/**
 * Follow a user
 * Updates backend and returns updated counts
 */
export async function followUser(currentUserId: string, targetUserId: string): Promise<{
  currentUserFollowingCount: number;
  targetUserFollowersCount: number;
}> {
  // CRITICAL: Validate userIds before any operations
  if (!validateUserId(currentUserId) || !validateUserId(targetUserId)) {
    throw { code: 'invalid-user-id', message: 'Invalid user ID' };
  }
  
  if (currentUserId === targetUserId) {
    throw { code: 'cannot-follow-self', message: 'Cannot follow yourself' };
  }

  return retryWithBackoff(async () => {
    const followId = `${currentUserId}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);

    // Check if already following
    const existing = await getDoc(followRef);
    if (existing.exists()) {
      // Already following, return current counts
      const [currentUserDoc, targetUserDoc] = await Promise.all([
        getDoc(doc(db, 'users', currentUserId)),
        getDoc(doc(db, 'users', targetUserId)),
      ]);

      return {
        currentUserFollowingCount: currentUserDoc.data()?.followingCount || 0,
        targetUserFollowersCount: targetUserDoc.data()?.followersCount || 0,
      };
    }

    // Use transaction for atomicity
    let currentUserFollowingCount = 0;
    let targetUserFollowersCount = 0;

    await runTransaction(db, async (transaction) => {
      // Create follow document
      transaction.set(followRef, {
        followerId: currentUserId,
        followingId: targetUserId,
        createdAt: serverTimestamp(),
      });

      // Update counts
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      const currentUserDoc = await transaction.get(currentUserRef);
      const targetUserDoc = await transaction.get(targetUserRef);

      if (currentUserDoc.exists()) {
        const currentCount = currentUserDoc.data().followingCount || 0;
        currentUserFollowingCount = currentCount + 1;
        transaction.update(currentUserRef, {
          followingCount: increment(1),
        });
      }

      if (targetUserDoc.exists()) {
        const targetCount = targetUserDoc.data().followersCount || 0;
        targetUserFollowersCount = targetCount + 1;
        transaction.update(targetUserRef, {
          followersCount: increment(1),
        });
      }
    });

    return {
      currentUserFollowingCount,
      targetUserFollowersCount,
    };
  }, {
    maxRetries: 3,
    retryableErrors: ['unavailable', 'deadline-exceeded', 'network-error'],
  });
}

/**
 * Unfollow a user
 * Updates backend and returns updated counts
 */
export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<{
  currentUserFollowingCount: number;
  targetUserFollowersCount: number;
}> {
  // CRITICAL: Validate userIds before any operations
  if (!validateUserId(currentUserId) || !validateUserId(targetUserId)) {
    throw { code: 'invalid-user-id', message: 'Invalid user ID' };
  }
  
  return retryWithBackoff(async () => {
    const followId = `${currentUserId}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);

    // Check if not following
    const existing = await getDoc(followRef);
    if (!existing.exists()) {
      // Not following, return current counts
      const [currentUserDoc, targetUserDoc] = await Promise.all([
        getDoc(doc(db, 'users', currentUserId)),
        getDoc(doc(db, 'users', targetUserId)),
      ]);

      return {
        currentUserFollowingCount: currentUserDoc.data()?.followingCount || 0,
        targetUserFollowersCount: targetUserDoc.data()?.followersCount || 0,
      };
    }

    // Use transaction for atomicity
    let currentUserFollowingCount = 0;
    let targetUserFollowersCount = 0;

    await runTransaction(db, async (transaction) => {
      // Delete follow document
      transaction.delete(followRef);

      // Update counts
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      const currentUserDoc = await transaction.get(currentUserRef);
      const targetUserDoc = await transaction.get(targetUserRef);

      if (currentUserDoc.exists()) {
        const currentCount = currentUserDoc.data().followingCount || 0;
        currentUserFollowingCount = Math.max(0, currentCount - 1);
        transaction.update(currentUserRef, {
          followingCount: increment(-1),
        });
      }

      if (targetUserDoc.exists()) {
        const targetCount = targetUserDoc.data().followersCount || 0;
        targetUserFollowersCount = Math.max(0, targetCount - 1);
        transaction.update(targetUserRef, {
          followersCount: increment(-1),
        });
      }
    });

    return {
      currentUserFollowingCount,
      targetUserFollowersCount,
    };
  }, {
    maxRetries: 3,
    retryableErrors: ['unavailable', 'deadline-exceeded', 'network-error'],
  });
}

/**
 * Get following list for a user
 */
export async function getFollowingList(userId: string): Promise<string[]> {
  // CRITICAL: Validate userId before any operations
  if (!validateUserId(userId)) {
    console.warn('[getFollowingList] Invalid userId');
    return [];
  }
  
  try {
    const usersService = await import('./usersService');
    const result = await usersService.getFollowing(userId);
    return result.users.map(u => u.id).filter(id => id && id.trim().length > 0);
  } catch (error: any) {
    console.error('Error getting following list:', error);
    return [];
  }
}

/**
 * Get followers list for a user
 */
export async function getFollowersList(userId: string): Promise<string[]> {
  // CRITICAL: Validate userId before any operations
  if (!validateUserId(userId)) {
    console.warn('[getFollowersList] Invalid userId');
    return [];
  }
  
  try {
    const usersService = await import('./usersService');
    const result = await usersService.getFollowers(userId);
    return result.users.map(u => u.id).filter(id => id && id.trim().length > 0);
  } catch (error: any) {
    console.error('Error getting followers list:', error);
    return [];
  }
}

