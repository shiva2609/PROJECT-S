/**
 * Global useFollowStatus Hook
 * 
 * Hook for managing follow status between logged-in user and target user
 * Provides isFollowing, isFollowedBy, isMutual, and toggleFollow
 */

import { useState, useEffect, useCallback } from 'react';
import * as FollowService from '../services/follow/follow.service';

interface UseFollowStatusReturn {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isMutual: boolean;
  loading: boolean;
  toggleFollow: () => Promise<void>;
}

/**
 * Hook for follow status between two users
 * @param loggedUid - User ID of the logged-in user
 * @param targetUid - User ID of the target user
 * @returns Follow status and toggle function
 */
export function useFollowStatus(
  loggedUid: string | null | undefined,
  targetUid: string | null | undefined
): UseFollowStatusReturn {
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isFollowedBy, setIsFollowedBy] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Listen to follow state (loggedUid → targetUid)
  useEffect(() => {
    if (!loggedUid || !targetUid || loggedUid === targetUid) {
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = FollowService.listenToIsFollowing(loggedUid, targetUid, (following) => {
      setIsFollowing(following);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loggedUid, targetUid]);

  // Listen to reverse follow state (targetUid → loggedUid)
  useEffect(() => {
    if (!loggedUid || !targetUid || loggedUid === targetUid) {
      setIsFollowedBy(false);
      return;
    }

    const unsubscribe = FollowService.listenToIsFollowing(targetUid, loggedUid, (followedBy) => {
      setIsFollowedBy(followedBy);
    });

    return () => unsubscribe();
  }, [loggedUid, targetUid]);

  // Toggle follow with optimistic updates
  const toggleFollow = useCallback(async () => {
    if (!loggedUid || !targetUid || loggedUid === targetUid) {
      return;
    }

    const wasFollowing = isFollowing;

    // Optimistic update
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        await FollowService.unfollowUser(loggedUid, targetUid);
      } else {
        await FollowService.followUser(loggedUid, targetUid);
      }
    } catch (error: any) {
      // Rollback on error
      setIsFollowing(wasFollowing);
      console.error('[useFollowStatus] Error toggling follow:', error);
      throw error;
    }
  }, [loggedUid, targetUid, isFollowing]);

  const isMutual = isFollowing && isFollowedBy;

  return {
    isFollowing,
    isFollowedBy,
    isMutual,
    loading,
    toggleFollow,
  };
}

