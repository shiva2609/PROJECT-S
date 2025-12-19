/**
 * useFollow Hook
 * Handles follow/unfollow operations with optimistic updates and real-time listeners
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../core/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  runTransaction,
  updateDoc,
  increment,
  onSnapshot,
  serverTimestamp,
} from '../core/firebase/compat';
import { useAuth } from '../providers/AuthProvider';
import { Alert } from 'react-native';

export interface FollowState {
  isFollowing: boolean;
  isLoading: boolean;
}

/**
 * Hook for managing follow/unfollow state and operations
 * Uses real-time listeners for instant updates
 */
export function useFollow(targetUserId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<FollowState>({
    isFollowing: false,
    isLoading: false,
  });
  const optimisticRef = useRef<boolean | null>(null);

  // Real-time listener for follow state
  useEffect(() => {
    if (!user || !targetUserId) return;

    const followId = `${user.uid}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);

    const unsubscribe = onSnapshot(followRef, (snapshot) => {
      const isFollowing = snapshot.exists();
      // Only update if not in optimistic state or if server confirms
      if (optimisticRef.current === null || optimisticRef.current === isFollowing) {
        setState(prev => ({ ...prev, isFollowing, isLoading: false }));
        optimisticRef.current = null;
      }
    }, (error: any) => {
      console.warn('Firestore query error:', error.message || error);
    });

    return () => unsubscribe();
  }, [user, targetUserId]);

  // Follow a user - Optimistic update with instant UI feedback
  const follow = useCallback(async () => {
    if (!user || !targetUserId || user.uid === targetUserId) return;

    // Optimistic update - instantly show ✓ Following
    optimisticRef.current = true;
    setState(prev => ({ ...prev, isFollowing: true, isLoading: true }));

    try {
      const followId = `${user.uid}_${targetUserId}`;
      const followRef = doc(db, 'follows', followId);

      // Check if already exists
      const existing = await getDocs(query(
        collection(db, 'follows'),
        where('followerId', '==', user.uid),
        where('followingId', '==', targetUserId)
      ));

      if (!existing.empty) {
        setState(prev => ({ ...prev, isLoading: false }));
        optimisticRef.current = null;
        return;
      }

      // Create follow document
      await setDoc(followRef, {
        followerId: user.uid,
        followingId: targetUserId,
        timestamp: serverTimestamp(),
      });

      // Update counts in transaction
      await runTransaction(db, async (transaction) => {
        const currentUserRef = doc(db, 'users', user.uid);
        const targetUserRef = doc(db, 'users', targetUserId);

        transaction.update(currentUserRef, {
          followingCount: increment(1),
        });

        transaction.update(targetUserRef, {
          followersCount: increment(1),
        });
      });

      // Real-time listener will update state automatically
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      // Rollback optimistic update
      optimisticRef.current = false;
      setState(prev => ({ ...prev, isFollowing: false, isLoading: false }));
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    }
  }, [user, targetUserId]);

  // Unfollow a user - Optimistic update
  const unfollow = useCallback(async () => {
    if (!user || !targetUserId) return;

    // Optimistic update
    optimisticRef.current = false;
    setState(prev => ({ ...prev, isFollowing: false, isLoading: true }));

    try {
      const followId = `${user.uid}_${targetUserId}`;
      const followRef = doc(db, 'follows', followId);

      // Delete follow document
      await deleteDoc(followRef);

      // Update counts in transaction
      await runTransaction(db, async (transaction) => {
        const currentUserRef = doc(db, 'users', user.uid);
        const targetUserRef = doc(db, 'users', targetUserId);

        const currentUserDoc = await transaction.get(currentUserRef);
        const targetUserDoc = await transaction.get(targetUserRef);

        if (currentUserDoc.exists()) {
          const currentCount = currentUserDoc.data().followingCount || 0;
          transaction.update(currentUserRef, {
            followingCount: Math.max(0, currentCount - 1),
          });
        }

        if (targetUserDoc.exists()) {
          const targetCount = targetUserDoc.data().followersCount || 0;
          transaction.update(targetUserRef, {
            followersCount: Math.max(0, targetCount - 1),
          });
        }
      });

      // Real-time listener will update state automatically
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      // Rollback optimistic update
      optimisticRef.current = true;
      setState(prev => ({ ...prev, isFollowing: true, isLoading: false }));
      Alert.alert('Error', 'Failed to unfollow user. Please try again.');
    }
  }, [user, targetUserId]);

  // Toggle follow/unfollow
  const toggleFollow = useCallback(async () => {
    if (state.isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  }, [state.isFollowing, follow, unfollow]);

  return {
    isFollowing: state.isFollowing,
    isLoading: state.isLoading,
    follow,
    unfollow,
    toggleFollow,
  };
}

