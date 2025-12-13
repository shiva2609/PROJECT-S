/**
 * Unified Follow Hook
 * 
 * Uses GLOBAL follow service for real-time subcollection updates
 * Integrates with UserRelationProvider for optimistic UI updates
 * Ensures follow writes match feed listener reads
 */

import { useCallback, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useUserRelations } from '../providers/UserRelationProvider';
import * as FollowService from '../global/services/follow/follow.service';

interface UseUnifiedFollowReturn {
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  toggleFollow: (targetUserId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => boolean;
}

/**
 * Unified hook for follow/unfollow operations
 * Updates global state and triggers feed refresh
 */
export function useUnifiedFollow(): UseUnifiedFollowReturn {
  const { user } = useAuth();
  const {
    following,
    addFollowing,
    removeFollowing,
    refreshRelations,
  } = useUserRelations();

  const processingRef = useRef<Set<string>>(new Set());

  const isFollowing = useCallback((targetUserId: string): boolean => {
    return following.has(targetUserId);
  }, [following]);

  const followUser = useCallback(async (targetUserId: string): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    if (processingRef.current.has(targetUserId)) {
      return;
    }

    // Optimistic update - update global state immediately
    addFollowing(targetUserId);
    processingRef.current.add(targetUserId);

    try {
      // Use global follow service - writes to users/{uid}/following subcollection
      await FollowService.followUser(user.uid, targetUserId);

      // Refresh relations to sync with backend
      await refreshRelations(user.uid);
    } catch (error: any) {
      // Rollback optimistic update
      removeFollowing(targetUserId);
      console.error('Error following user:', error);
      throw error;
    } finally {
      processingRef.current.delete(targetUserId);
    }
  }, [user?.uid, addFollowing, removeFollowing, refreshRelations]);

  const unfollowUser = useCallback(async (targetUserId: string): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    if (processingRef.current.has(targetUserId)) {
      return;
    }

    // Optimistic update - update global state immediately
    removeFollowing(targetUserId);
    processingRef.current.add(targetUserId);

    try {
      // Use global follow service - writes to users/{uid}/following subcollection
      await FollowService.unfollowUser(user.uid, targetUserId);

      // Refresh relations to sync with backend
      await refreshRelations(user.uid);
    } catch (error: any) {
      // Rollback optimistic update
      addFollowing(targetUserId);
      console.error('Error unfollowing user:', error);
      throw error;
    } finally {
      processingRef.current.delete(targetUserId);
    }
  }, [user?.uid, addFollowing, removeFollowing, refreshRelations]);

  const toggleFollow = useCallback(async (targetUserId: string): Promise<void> => {
    if (isFollowing(targetUserId)) {
      await unfollowUser(targetUserId);
    } else {
      await followUser(targetUserId);
    }
  }, [isFollowing, followUser, unfollowUser]);

  return {
    followUser,
    unfollowUser,
    toggleFollow,
    isFollowing,
  };
}

