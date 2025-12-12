/**
 * Follow API
 * 
 * Handles follow/unfollow operations with atomic count updates.
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  increment,
} from 'firebase/firestore';
import { db } from '../auth/authService';

// ---------- Exported Functions ----------

/**
 * Follow a user
 * Creates documents in both /follows collection and updates counts atomically
 * @param sourceUserId - User who is following
 * @param targetUserId - User being followed
 */
export async function followUser(sourceUserId: string, targetUserId: string): Promise<void> {
  if (sourceUserId === targetUserId) {
    throw { code: 'cannot-follow-self', message: 'Cannot follow yourself' };
  }
  
  try {
    const followId = `${sourceUserId}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);
    
    // Check if already following
    const followSnap = await getDoc(followRef);
    if (followSnap.exists()) {
      return; // Already following, no-op
    }
    
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      // Create follow document
      transaction.set(followRef, {
        followerId: sourceUserId,
        followingId: targetUserId,
        createdAt: serverTimestamp(),
      });
      
      // Increment counts
      const sourceUserRef = doc(db, 'users', sourceUserId);
      const targetUserRef = doc(db, 'users', targetUserId);
      
      const sourceUserSnap = await transaction.get(sourceUserRef);
      const targetUserSnap = await transaction.get(targetUserRef);
      
      if (sourceUserSnap.exists()) {
        const currentFollowing = sourceUserSnap.data().followingCount || 0;
        transaction.update(sourceUserRef, {
          followingCount: currentFollowing + 1,
        });
      }
      
      if (targetUserSnap.exists()) {
        const currentFollowers = targetUserSnap.data().followersCount || 0;
        transaction.update(targetUserRef, {
          followersCount: currentFollowers + 1,
        });
      }
    });
  } catch (error: any) {
    console.error('Error following user:', error);
    throw { code: 'follow-failed', message: 'Failed to follow user' };
  }
}

/**
 * Unfollow a user
 * Removes documents and decrements counts atomically
 * @param sourceUserId - User who is unfollowing
 * @param targetUserId - User being unfollowed
 */
export async function unfollowUser(sourceUserId: string, targetUserId: string): Promise<void> {
  try {
    const followId = `${sourceUserId}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);
    
    // Check if following
    const followSnap = await getDoc(followRef);
    if (!followSnap.exists()) {
      return; // Not following, no-op
    }
    
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      // Delete follow document
      transaction.delete(followRef);
      
      // Decrement counts
      const sourceUserRef = doc(db, 'users', sourceUserId);
      const targetUserRef = doc(db, 'users', targetUserId);
      
      const sourceUserSnap = await transaction.get(sourceUserRef);
      const targetUserSnap = await transaction.get(targetUserRef);
      
      if (sourceUserSnap.exists()) {
        const currentFollowing = sourceUserSnap.data().followingCount || 0;
        transaction.update(sourceUserRef, {
          followingCount: Math.max(0, currentFollowing - 1),
        });
      }
      
      if (targetUserSnap.exists()) {
        const currentFollowers = targetUserSnap.data().followersCount || 0;
        transaction.update(targetUserRef, {
          followersCount: Math.max(0, currentFollowers - 1),
        });
      }
    });
  } catch (error: any) {
    console.error('Error unfollowing user:', error);
    throw { code: 'unfollow-failed', message: 'Failed to unfollow user' };
  }
}

/**
 * Check if source user is following target user
 * @param sourceUserId - User to check
 * @param targetUserId - User being checked
 * @returns true if following, false otherwise
 */
export async function isFollowing(sourceUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const followId = `${sourceUserId}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);
    const followSnap = await getDoc(followRef);
    return followSnap.exists();
  } catch (error: any) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

// Convenience functions for hooks that only pass targetUserId
// Note: Hooks call followUser(targetUserId) and unfollowUser(targetUserId)
// These should get sourceUserId from auth context in hook implementation

