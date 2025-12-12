/**
 * Follow Service
 * 
 * Firestore functions for follow/unfollow operations
 * Updates following[] and followers[] arrays and counts
 * Never touches likes/comments/saves
 */

import { db } from '../auth/authService';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  increment,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { store } from '../../store';
import { setUserFollowState } from '../../store/slices/userFollowStateSlice';
import type { FollowState } from '../../store/slices/userFollowStateSlice';

/**
 * Follow a user
 * - Adds targetUserId to currentUser's following[] array
 * - Adds currentUserId to targetUser's followers[] array
 * - Updates followingCount and followersCount
 * - Creates follow document in /follows collection
 */
export async function followUser(currentUserId: string, targetUserId: string): Promise<void> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    throw new Error('Invalid user IDs for follow operation');
  }

  try {
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      // Get current user document
      const currentUserDoc = await transaction.get(currentUserRef);
      if (!currentUserDoc.exists()) {
        throw new Error('Current user not found');
      }

      // Get target user document
      const targetUserDoc = await transaction.get(targetUserRef);
      if (!targetUserDoc.exists()) {
        throw new Error('Target user not found');
      }

      const currentUserData = currentUserDoc.data();
      const targetUserData = targetUserDoc.data();

      // Check if already following
      const following = currentUserData.following || [];
      if (following.includes(targetUserId)) {
        console.log('Already following this user');
        return; // Already following, no-op
      }

      // Update current user: add to following[] and increment followingCount
      transaction.update(currentUserRef, {
        following: arrayUnion(targetUserId),
        followingCount: increment(1),
      });

      // Update target user: add to followers[] and increment followersCount
      transaction.update(targetUserRef, {
        followers: arrayUnion(currentUserId),
        followersCount: increment(1),
      });
    });

    // Create follow document in /follows collection (for queries)
    const followId = `${currentUserId}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);
    await setDoc(followRef, {
      followerId: currentUserId,
      followingId: targetUserId,
      timestamp: serverTimestamp(),
    });

    console.log('✅ User followed successfully');
  } catch (error: any) {
    console.error('❌ Error following user:', error);
    throw error;
  }
}

/**
 * Unfollow a user
 * - Removes targetUserId from currentUser's following[] array
 * - Removes currentUserId from targetUser's followers[] array
 * - Decrements followingCount and followersCount
 * - Deletes follow document from /follows collection
 */
export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    throw new Error('Invalid user IDs for unfollow operation');
  }

  try {
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      // Get current user document
      const currentUserDoc = await transaction.get(currentUserRef);
      if (!currentUserDoc.exists()) {
        throw new Error('Current user not found');
      }

      // Get target user document
      const targetUserDoc = await transaction.get(targetUserRef);
      if (!targetUserDoc.exists()) {
        throw new Error('Target user not found');
      }

      const currentUserData = currentUserDoc.data();
      const targetUserData = targetUserDoc.data();

      // Check if actually following
      const following = currentUserData.following || [];
      if (!following.includes(targetUserId)) {
        console.log('Not following this user');
        return; // Not following, no-op
      }

      // Update current user: remove from following[] and decrement followingCount
      const currentFollowingCount = currentUserData.followingCount || 0;
      transaction.update(currentUserRef, {
        following: arrayRemove(targetUserId),
        followingCount: Math.max(0, currentFollowingCount - 1),
      });

      // Update target user: remove from followers[] and decrement followersCount
      const targetFollowersCount = targetUserData.followersCount || 0;
      transaction.update(targetUserRef, {
        followers: arrayRemove(currentUserId),
        followersCount: Math.max(0, targetFollowersCount - 1),
      });
    });

    // Delete follow document from /follows collection
    const followId = `${currentUserId}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);
    await deleteDoc(followRef);

    console.log('✅ User unfollowed successfully');
  } catch (error: any) {
    console.error('❌ Error unfollowing user:', error);
    throw error;
  }
}

