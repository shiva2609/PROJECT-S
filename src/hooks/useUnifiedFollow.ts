/**
 * Unified Follow Hook
 * 
 * Uses GLOBAL follow service for real-time subcollection updates
 * Integrates with UserRelationProvider for optimistic UI updates
 * Ensures follow writes match feed listener reads
 */

import { useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useUserRelations } from '../providers/UserRelationProvider';
import * as FollowService from '../global/services/follow/follow.service';
import { useSingleFlight } from './useSingleFlight';
import { checkNetworkStatus } from './useNetworkState';
import { AppError, ErrorType, withTimeout } from '../utils/AppError';

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
  const { user, checkSession } = useAuth();
  const {
    following,
    addFollowing,
    removeFollowing,
    refreshRelations,
  } = useUserRelations();

  // 🔐 SINGLE FLIGHT GUARD
  // Prevents rapid clicking/spamming follow buttons
  const singleFlight = useSingleFlight();

  const isFollowing = useCallback((targetUserId: string): boolean => {
    return following.has(targetUserId);
  }, [following]);

  const followUser = useCallback(async (targetUserId: string): Promise<void> => {
    // 🔐 AUTH GATE: Valid Session Check
    checkSession();

    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    // 🔐 1. NETWORK & FLIGHT CHECK
    await singleFlight.execute(`follow:${targetUserId}`, async () => {
      // 🔐 RE-CHECK SESSION inside lock
      checkSession();

      // Pre-flight network check
      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new AppError('No internet connection', ErrorType.NETWORK);
      }

      // Optimistic update
      addFollowing(targetUserId);

      try {
        // 🔐 TIMEOUT: Wrap network call
        await withTimeout(FollowService.followUser(user.uid, targetUserId), 15000);
        await refreshRelations(user.uid);
      } catch (error: any) {
        // Rollback on error
        removeFollowing(targetUserId);

        console.error('❌ [useUnifiedFollow] Error following user:', error);

        // Use standard error normalization if needed for UI, 
        // but here we just rethrow so the component can handle alert/toast
        throw AppError.fromError(error);
      }
    });
  }, [user?.uid, addFollowing, removeFollowing, refreshRelations, singleFlight, checkSession]);

  const unfollowUser = useCallback(async (targetUserId: string): Promise<void> => {
    // 🔐 AUTH GATE: Valid Session Check
    checkSession();

    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    // 🔐 1. NETWORK & FLIGHT CHECK
    await singleFlight.execute(`unfollow:${targetUserId}`, async () => {
      checkSession();

      const isConnected = await checkNetworkStatus();
      if (!isConnected) {
        throw new AppError('No internet connection', ErrorType.NETWORK);
      }

      // Optimistic update
      removeFollowing(targetUserId);

      try {
        // 🔐 TIMEOUT: Wrap network call
        await withTimeout(FollowService.unfollowUser(user.uid, targetUserId), 15000);
        await refreshRelations(user.uid);
      } catch (error: any) {
        // Rollback
        addFollowing(targetUserId);
        console.error('❌ [useUnifiedFollow] Error unfollowing user:', error);
        throw AppError.fromError(error);
      }
    });
  }, [user?.uid, addFollowing, removeFollowing, refreshRelations, singleFlight, checkSession]);

  const toggleFollow = useCallback(async (targetUserId: string): Promise<void> => {
    // If currently following, call unfollow. Otherwise follow.
    // The individual functions handle the single flight locking efficiently.
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

