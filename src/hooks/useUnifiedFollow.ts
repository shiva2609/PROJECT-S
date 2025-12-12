/**
 * Unified Follow Hook
 * 
 * Integrates with UserRelationProvider for global state updates
 * Handles optimistic updates and feed refresh
 */

import { useCallback, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useUserRelations } from '../providers/UserRelationProvider';
import * as UserRelationService from '../services/users/userRelationService';

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
      await UserRelationService.followUser(user.uid, targetUserId);
      
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
      await UserRelationService.unfollowUser(user.uid, targetUserId);
      
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

