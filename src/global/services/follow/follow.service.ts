/**
 * Global Follow Service
 * 
 * Centralized service for follow/unfollow operations and follow state management
 * Uses Firestore subcollections: users/{userId}/followers/{followerId} and users/{userId}/following/{followingId}
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../services/auth/authService';

/**
 * Get followers IDs (one-time fetch)
 * @param targetUid - User ID to get followers for
 * @returns Array of follower user IDs
 */
export async function getFollowersIds(targetUid: string): Promise<string[]> {
  if (!targetUid) return [];

  try {
    // Try subcollection first: users/{userId}/followers
    const followersRef = collection(db, 'users', targetUid, 'followers');
    const snapshot = await getDocs(followersRef);
    
    const ids = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return data.uid || docSnap.id;
    });

    // If no followers in subcollection, try the follows collection as fallback
    if (ids.length === 0) {
      console.log('[getFollowersIds] No followers in subcollection, trying follows collection...');
      const followsRef = collection(db, 'follows');
      const followsQuery = query(followsRef, where('followingId', '==', targetUid));
      const followsSnapshot = await getDocs(followsQuery);
      
      const followIds = followsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return data.followerId;
      }).filter((id): id is string => !!id);

      console.log(`[getFollowersIds] Found ${followIds.length} followers in follows collection`);
      return followIds;
    }

    return ids;
  } catch (error: any) {
    console.error('[getFollowersIds] Error:', error);
    // Fallback to follows collection on error
    try {
      const followsRef = collection(db, 'follows');
      const followsQuery = query(followsRef, where('followingId', '==', targetUid));
      const followsSnapshot = await getDocs(followsQuery);
      
      return followsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return data.followerId;
      }).filter((id): id is string => !!id);
    } catch (fallbackError: any) {
      console.error('[getFollowersIds] Fallback error:', fallbackError);
      return [];
    }
  }
}

/**
 * Get following IDs (one-time fetch)
 * @param targetUid - User ID to get following for
 * @returns Array of following user IDs
 */
export async function getFollowingIds(targetUid: string): Promise<string[]> {
  if (!targetUid) return [];

  try {
    // Try subcollection first: users/{userId}/following
    const followingRef = collection(db, 'users', targetUid, 'following');
    const snapshot = await getDocs(followingRef);
    
    const ids = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return data.uid || docSnap.id;
    });

    // If no following in subcollection, try the follows collection as fallback
    if (ids.length === 0) {
      console.log('[getFollowingIds] No following in subcollection, trying follows collection...');
      const followsRef = collection(db, 'follows');
      const followsQuery = query(followsRef, where('followerId', '==', targetUid));
      const followsSnapshot = await getDocs(followsQuery);
      
      const followIds = followsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return data.followingId;
      }).filter((id): id is string => !!id);

      console.log(`[getFollowingIds] Found ${followIds.length} following in follows collection`);
      return followIds;
    }

    return ids;
  } catch (error: any) {
    console.error('[getFollowingIds] Error:', error);
    // Fallback to follows collection on error
    try {
      const followsRef = collection(db, 'follows');
      const followsQuery = query(followsRef, where('followerId', '==', targetUid));
      const followsSnapshot = await getDocs(followsQuery);
      
      return followsSnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return data.followingId;
      }).filter((id): id is string => !!id);
    } catch (fallbackError: any) {
      console.error('[getFollowingIds] Fallback error:', fallbackError);
      return [];
    }
  }
}

/**
 * Listen to followers IDs (realtime)
 * @param targetUid - User ID to listen to followers for
 * @param onUpdate - Callback with array of follower IDs
 * @returns Unsubscribe function
 */
export function listenToFollowersIds(
  targetUid: string,
  onUpdate: (ids: string[]) => void
): Unsubscribe {
  if (!targetUid) {
    onUpdate([]);
    return () => {};
  }

  try {
    const followersRef = collection(db, 'users', targetUid, 'followers');
    
    return onSnapshot(
      followersRef,
      (snapshot) => {
        const ids = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return data.uid || docSnap.id;
        });
        onUpdate(ids);
      },
      (error: any) => {
        console.error('[listenToFollowersIds] Error:', error);
        onUpdate([]);
      }
    );
  } catch (error: any) {
    console.error('[listenToFollowersIds] Setup error:', error);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Listen to following IDs (realtime)
 * @param targetUid - User ID to listen to following for
 * @param onUpdate - Callback with array of following IDs
 * @returns Unsubscribe function
 */
export function listenToFollowingIds(
  targetUid: string,
  onUpdate: (ids: string[]) => void
): Unsubscribe {
  if (!targetUid) {
    onUpdate([]);
    return () => {};
  }

  try {
    const followingRef = collection(db, 'users', targetUid, 'following');
    
    return onSnapshot(
      followingRef,
      (snapshot) => {
        const ids = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return data.uid || docSnap.id;
        });
        onUpdate(ids);
      },
      (error: any) => {
        console.error('[listenToFollowingIds] Error:', error);
        onUpdate([]);
      }
    );
  } catch (error: any) {
    console.error('[listenToFollowingIds] Setup error:', error);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Check if logged user is following target user (one-time fetch)
 * @param loggedUid - User ID of the logged-in user
 * @param targetUid - User ID to check if following
 * @returns true if following, false otherwise
 */
export async function isFollowing(loggedUid: string, targetUid: string): Promise<boolean> {
  if (!loggedUid || !targetUid || loggedUid === targetUid) return false;

  try {
    const followingRef = doc(db, 'users', loggedUid, 'following', targetUid);
    const snapshot = await getDoc(followingRef);
    return snapshot.exists();
  } catch (error: any) {
    console.error('[isFollowing] Error:', error);
    return false;
  }
}

/**
 * Listen to follow state (realtime)
 * @param loggedUid - User ID of the logged-in user
 * @param targetUid - User ID to check if following
 * @param onUpdate - Callback with boolean indicating if following
 * @returns Unsubscribe function
 */
export function listenToIsFollowing(
  loggedUid: string,
  targetUid: string,
  onUpdate: (isFollowing: boolean) => void
): Unsubscribe {
  if (!loggedUid || !targetUid || loggedUid === targetUid) {
    onUpdate(false);
    return () => {};
  }

  try {
    const followingRef = doc(db, 'users', loggedUid, 'following', targetUid);
    
    return onSnapshot(
      followingRef,
      (snapshot) => {
        onUpdate(snapshot.exists());
      },
      (error: any) => {
        console.error('[listenToIsFollowing] Error:', error);
        onUpdate(false);
      }
    );
  } catch (error: any) {
    console.error('[listenToIsFollowing] Setup error:', error);
    onUpdate(false);
    return () => {};
  }
}

/**
 * Follow a user
 * Creates documents in subcollections and updates counts atomically
 * @param loggedUid - User ID who is following
 * @param targetUid - User ID being followed
 */
export async function followUser(loggedUid: string, targetUid: string): Promise<void> {
  if (!loggedUid || !targetUid || loggedUid === targetUid) {
    throw new Error('Invalid user IDs for follow operation');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const sourceFollowingRef = doc(db, 'users', loggedUid, 'following', targetUid);
      const targetFollowersRef = doc(db, 'users', targetUid, 'followers', loggedUid);

      // Check if already following
      const followingSnap = await transaction.get(sourceFollowingRef);
      if (followingSnap.exists()) {
        return; // Already following, no-op
      }

      // Get user documents to get their data
      const sourceUserRef = doc(db, 'users', loggedUid);
      const targetUserRef = doc(db, 'users', targetUid);

      const sourceUserSnap = await transaction.get(sourceUserRef);
      const targetUserSnap = await transaction.get(targetUserRef);

      if (!sourceUserSnap.exists() || !targetUserSnap.exists()) {
        throw new Error('User not found');
      }

      const sourceUserData = sourceUserSnap.data();
      const targetUserData = targetUserSnap.data();

      // Create follow documents in subcollections
      transaction.set(sourceFollowingRef, {
        uid: targetUid,
        displayName: targetUserData.displayName || targetUserData.name || targetUserData.username || '',
        username: targetUserData.username || '',
        photoURL: targetUserData.photoURL || targetUserData.profilePic || '',
        verified: targetUserData.verified || false,
        createdAt: serverTimestamp(),
      });

      transaction.set(targetFollowersRef, {
        uid: loggedUid,
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
    console.error('[followUser] Error:', error);
    throw error;
  }
}

/**
 * Unfollow a user
 * Removes documents from subcollections and decrements counts atomically
 * @param loggedUid - User ID who is unfollowing
 * @param targetUid - User ID being unfollowed
 */
export async function unfollowUser(loggedUid: string, targetUid: string): Promise<void> {
  if (!loggedUid || !targetUid || loggedUid === targetUid) {
    throw new Error('Invalid user IDs for unfollow operation');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const sourceFollowingRef = doc(db, 'users', loggedUid, 'following', targetUid);
      const targetFollowersRef = doc(db, 'users', targetUid, 'followers', loggedUid);

      // Check if following
      const followingSnap = await transaction.get(sourceFollowingRef);
      if (!followingSnap.exists()) {
        return; // Not following, no-op
      }

      // Delete follow documents from subcollections
      transaction.delete(sourceFollowingRef);
      transaction.delete(targetFollowersRef);

      // Update counts
      const sourceUserRef = doc(db, 'users', loggedUid);
      const targetUserRef = doc(db, 'users', targetUid);

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
    console.error('[unfollowUser] Error:', error);
    throw error;
  }
}

