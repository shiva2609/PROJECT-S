/**
 * Follow Realtime Service
 * 
 * Handles follow/unfollow operations with realtime Firestore listeners
 * Uses subcollections: users/{userId}/followers/{followerId} and users/{userId}/following/{followingId}
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
} from '../../core/firebase/compat';
import { db } from '../../core/firebase';

export interface FollowerUser {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
  verified?: boolean;
}

/**
 * Get followers list with realtime updates
 * @param userId - User ID to get followers for
 * @param callback - Callback function that receives the followers list
 * @returns Unsubscribe function
 */
export function listenToFollowers(
  userId: string,
  callback: (followers: FollowerUser[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => { };
  }

  const followersRef = collection(db, 'users', userId, 'followers');

  const unsubscribe = onSnapshot(
    followersRef,
    async (snapshot) => {
      const followers: FollowerUser[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        followers.push({
          uid: data.uid || docSnap.id,
          displayName: data.displayName || data.name || '',
          username: data.username || '',
          photoURL: data.photoURL || data.profilePic || '',
          verified: data.verified || false,
        });
      }

      callback(followers);
    },
    (error) => {
      console.error('Error listening to followers:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Get following list with realtime updates
 * @param userId - User ID to get following for
 * @param callback - Callback function that receives the following list
 * @returns Unsubscribe function
 */
export function listenToFollowing(
  userId: string,
  callback: (following: FollowerUser[]) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => { };
  }

  const followingRef = collection(db, 'users', userId, 'following');

  const unsubscribe = onSnapshot(
    followingRef,
    async (snapshot) => {
      const following: FollowerUser[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        following.push({
          uid: data.uid || docSnap.id,
          displayName: data.displayName || data.name || '',
          username: data.username || '',
          photoURL: data.photoURL || data.profilePic || '',
          verified: data.verified || false,
        });
      }

      callback(following);
    },
    (error) => {
      console.error('Error listening to following:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Follow a user
 * Creates documents in subcollections and updates counts atomically
 * @param sourceUserId - User who is following
 * @param targetUserId - User being followed
 */
export async function followUser(sourceUserId: string, targetUserId: string): Promise<void> {
  if (sourceUserId === targetUserId) {
    throw { code: 'cannot-follow-self', message: 'Cannot follow yourself' };
  }

  try {
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      // Check if already following
      const sourceFollowingRef = doc(db, 'users', sourceUserId, 'following', targetUserId);
      const targetFollowersRef = doc(db, 'users', targetUserId, 'followers', sourceUserId);

      // Get user documents to get their data
      const sourceUserRef = doc(db, 'users', sourceUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      const sourceUserSnap = await transaction.get(sourceUserRef);
      const targetUserSnap = await transaction.get(targetUserRef);

      if (!sourceUserSnap.exists() || !targetUserSnap.exists()) {
        throw new Error('User not found');
      }

      const sourceUserData = sourceUserSnap.data();
      const targetUserData = targetUserSnap.data();

      // Check if already following
      const followingSnap = await transaction.get(sourceFollowingRef);
      if (followingSnap.exists()) {
        return; // Already following, no-op
      }

      // Create follow documents in subcollections
      transaction.set(sourceFollowingRef, {
        uid: targetUserId,
        displayName: targetUserData.displayName || targetUserData.name || targetUserData.username || '',
        username: targetUserData.username || '',
        photoURL: targetUserData.photoURL || targetUserData.profilePic || '',
        verified: targetUserData.verified || false,
        createdAt: serverTimestamp(),
      });

      transaction.set(targetFollowersRef, {
        uid: sourceUserId,
        displayName: sourceUserData.displayName || sourceUserData.name || sourceUserData.username || '',
        username: sourceUserData.username || '',
        photoURL: sourceUserData.photoURL || sourceUserData.profilePic || '',
        verified: sourceUserData.verified || false,
        createdAt: serverTimestamp(),
      });

      // Update counts
      transaction.update(sourceUserRef, {
        followingCount: increment(1),
      });

      transaction.update(targetUserRef, {
        followersCount: increment(1),
      });
    });
  } catch (error: any) {
    console.error('Error following user:', error);
    throw { code: 'follow-failed', message: 'Failed to follow user' };
  }
}

/**
 * Unfollow a user
 * Removes documents from subcollections and decrements counts atomically
 * @param sourceUserId - User who is unfollowing
 * @param targetUserId - User being unfollowed
 */
export async function unfollowUser(sourceUserId: string, targetUserId: string): Promise<void> {
  try {
    // Use transaction to ensure atomicity
    await runTransaction(db, async (transaction) => {
      const sourceFollowingRef = doc(db, 'users', sourceUserId, 'following', targetUserId);
      const targetFollowersRef = doc(db, 'users', targetUserId, 'followers', sourceUserId);

      // Check if following
      const followingSnap = await transaction.get(sourceFollowingRef);
      if (!followingSnap.exists()) {
        return; // Not following, no-op
      }

      // Delete follow documents from subcollections
      transaction.delete(sourceFollowingRef);
      transaction.delete(targetFollowersRef);

      // Update counts
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
    if (!sourceUserId || !targetUserId) return false;

    const followingRef = doc(db, 'users', sourceUserId, 'following', targetUserId);
    const followingSnap = await getDocs(query(collection(db, 'users', sourceUserId, 'following')));

    // Check if targetUserId exists in the following subcollection
    return followingSnap.docs.some(docSnap => docSnap.id === targetUserId);
  } catch (error: any) {
    // If subcollection doesn't exist or error, return false
    console.error('Error checking follow status:', error);
    return false;
  }
}

/**
 * Get followers list (one-time fetch, no realtime)
 * @param userId - User ID to get followers for
 * @returns Array of follower users
 */
export async function getFollowers(userId: string): Promise<FollowerUser[]> {
  if (!userId) {
    console.warn('[getFollowers] No userId provided');
    return [];
  }

  try {
    // Try subcollection first: users/{userId}/followers
    const followersRef = collection(db, 'users', userId, 'followers');
    const snapshot = await getDocs(followersRef);

    console.log(`[getFollowers] Found ${snapshot.docs.length} followers in subcollection for userId: ${userId}`);

    const followers: FollowerUser[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const uid = data.uid || docSnap.id;
      followers.push({
        uid,
        displayName: data.displayName || data.name || '',
        username: data.username || '',
        photoURL: data.photoURL || data.profilePic || '',
        verified: data.verified || false,
      });
    });

    // If no followers in subcollection, try the follows collection
    if (followers.length === 0) {
      console.log('[getFollowers] No followers in subcollection, trying follows collection...');
      const followsRef = collection(db, 'follows');
      const followsQuery = query(followsRef, where('followingId', '==', userId));
      const followsSnapshot = await getDocs(followsQuery);

      console.log(`[getFollowers] Found ${followsSnapshot.docs.length} follows in collection`);

      for (const followDoc of followsSnapshot.docs) {
        const followData = followDoc.data();
        const followerId = followData.followerId;
        if (followerId) {
          // Fetch user data
          const userRef = doc(db, 'users', followerId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            followers.push({
              uid: followerId,
              displayName: userData.displayName || userData.name || userData.username || 'User',
              username: userData.username || '',
              photoURL: userData.photoURL || userData.profilePic || userData.photoUrl || '',
              verified: userData.verified || false,
            });
          }
        }
      }
    }

    console.log(`[getFollowers] Returning ${followers.length} followers total`);
    return followers;
  } catch (error: any) {
    console.error('[getFollowers] Error getting followers:', error);
    console.error('[getFollowers] Error details:', error.message, error.code);
    return [];
  }
}

/**
 * Get following list (one-time fetch, no realtime)
 * @param userId - User ID to get following for
 * @returns Array of following users
 */
export async function getFollowing(userId: string): Promise<FollowerUser[]> {
  if (!userId) {
    console.warn('[getFollowing] No userId provided');
    return [];
  }

  try {
    // Try subcollection first: users/{userId}/following
    const followingRef = collection(db, 'users', userId, 'following');
    const snapshot = await getDocs(followingRef);

    console.log(`[getFollowing] Found ${snapshot.docs.length} following in subcollection for userId: ${userId}`);

    const following: FollowerUser[] = [];
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const uid = data.uid || docSnap.id;
      following.push({
        uid,
        displayName: data.displayName || data.name || '',
        username: data.username || '',
        photoURL: data.photoURL || data.profilePic || '',
        verified: data.verified || false,
      });
    });

    // If no following in subcollection, try the follows collection
    if (following.length === 0) {
      console.log('[getFollowing] No following in subcollection, trying follows collection...');
      const followsRef = collection(db, 'follows');
      const followsQuery = query(followsRef, where('followerId', '==', userId));
      const followsSnapshot = await getDocs(followsQuery);

      console.log(`[getFollowing] Found ${followsSnapshot.docs.length} follows in collection`);

      for (const followDoc of followsSnapshot.docs) {
        const followData = followDoc.data();
        const followingId = followData.followingId;
        if (followingId) {
          // Fetch user data
          const userRef = doc(db, 'users', followingId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            following.push({
              uid: followingId,
              displayName: userData.displayName || userData.name || userData.username || 'User',
              username: userData.username || '',
              photoURL: userData.photoURL || userData.profilePic || userData.photoUrl || '',
              verified: userData.verified || false,
            });
          }
        }
      }
    }

    console.log(`[getFollowing] Returning ${following.length} following total`);
    return following;
  } catch (error: any) {
    console.error('[getFollowing] Error getting following:', error);
    console.error('[getFollowing] Error details:', error.message, error.code);
    return [];
  }
}

