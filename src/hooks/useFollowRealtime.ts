/**
 * useFollowRealtime Hook
 * 
 * Global hook for managing followers and following with realtime updates
 * Uses Firestore subcollections for realtime listeners
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import * as FollowService from '../services/follow/followRealtimeService';
import type { FollowerUser } from '../services/follow/followRealtimeService';

interface UseFollowRealtimeReturn {
  followers: FollowerUser[];
  following: FollowerUser[];
  isFollowing: (targetUserId: string) => boolean;
  toggleFollow: (targetUserId: string) => Promise<void>;
  loading: boolean;
}

/**
 * Hook for managing followers and following with realtime updates
 * @param userId - User ID to manage followers/following for
 * @returns Follow state and operations
 */
export function useFollowRealtime(userId: string): UseFollowRealtimeReturn {
  const { user: currentUser } = useAuth();
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [following, setFollowing] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Realtime listener for followers
  useEffect(() => {
    if (!userId) {
      setFollowers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = FollowService.listenToFollowers(userId, (followersList) => {
      setFollowers(followersList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Realtime listener for following
  useEffect(() => {
    if (!userId) {
      setFollowing([]);
      return;
    }

    const unsubscribe = FollowService.listenToFollowing(userId, (followingList) => {
      setFollowing(followingList);
    });

    return () => unsubscribe();
  }, [userId]);

  // Check if current user is following a target user
  const isFollowing = useCallback(
    (targetUserId: string): boolean => {
      if (!currentUser?.uid || !targetUserId) return false;
      return following.some((user) => user.uid === targetUserId);
    },
    [following, currentUser?.uid]
  );

  // Toggle follow/unfollow
  const toggleFollow = useCallback(
    async (targetUserId: string): Promise<void> => {
      if (!currentUser?.uid || !targetUserId || currentUser.uid === targetUserId) {
        return;
      }

      const currentlyFollowing = isFollowing(targetUserId);

      try {
        if (currentlyFollowing) {
          await FollowService.unfollowUser(currentUser.uid, targetUserId);
        } else {
          await FollowService.followUser(currentUser.uid, targetUserId);
        }
      } catch (error: any) {
        console.error('Error toggling follow:', error);
        throw error;
      }
    },
    [currentUser?.uid, isFollowing]
  );

  return {
    followers,
    following,
    isFollowing,
    toggleFollow,
    loading,
  };
}


