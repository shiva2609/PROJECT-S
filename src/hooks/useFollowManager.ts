import { useCallback, useRef } from 'react';
import { useUserRelations } from '../providers/UserRelationProvider';
import * as FollowAPI from '../services/follow/followAPI';
import * as UsersAPI from '../services/users/usersService';

interface UseFollowManagerReturn {
  toggleFollow: (targetUserId: string) => Promise<void>;
  isFollowing: (targetUserId: string) => boolean;
}

/**
 * Global hook for managing follow/unfollow operations
 * Integrates with UserRelationContext for instant updates across the app
 * Handles optimistic updates and count synchronization
 */
export function useFollowManager(): UseFollowManagerReturn {
  const {
    following,
    addFollowing,
    removeFollowing,
  } = useUserRelations();
  
  const processingRef = useRef<Set<string>>(new Set());

  const isFollowing = useCallback((targetUserId: string): boolean => {
    return following.has(targetUserId);
  }, [following]);

  const toggleFollow = useCallback(async (targetUserId: string): Promise<void> => {
    // Prevent double-tapping
    if (processingRef.current.has(targetUserId)) {
      return;
    }

    const wasFollowing = following.has(targetUserId);

    // Optimistic UI update - update UserRelationContext immediately
    if (wasFollowing) {
      removeFollowing(targetUserId);
    } else {
      addFollowing(targetUserId);
    }

    processingRef.current.add(targetUserId);

    try {
      if (wasFollowing) {
        await FollowAPI.unfollowUser(targetUserId);
        // Update follower/following counts
        await UsersAPI.decrementFollowerCount(targetUserId);
        await UsersAPI.decrementFollowingCount();
      } else {
        await FollowAPI.followUser(targetUserId);
        // Update follower/following counts
        await UsersAPI.incrementFollowerCount(targetUserId);
        await UsersAPI.incrementFollowingCount();
      }
    } catch (error) {
      // Rollback optimistic update on error
      if (wasFollowing) {
        addFollowing(targetUserId);
      } else {
        removeFollowing(targetUserId);
      }
      console.error('Error toggling follow:', error);
      throw error;
    } finally {
      processingRef.current.delete(targetUserId);
    }
  }, [following, addFollowing, removeFollowing]);

  return {
    toggleFollow,
    isFollowing,
  };
}
