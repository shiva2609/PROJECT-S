import { useCallback, useRef } from 'react';
import { useUserRelations } from '../providers/UserRelationProvider';
import * as FollowAPI from '../services/follow/followAPI';
import * as UsersAPI from '../services/users/usersService';

import { useAuth } from '../providers/AuthProvider';
import { sendNotification } from '../services/notifications/NotificationAPI';

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

  const { user } = useAuth();

  const processingRef = useRef<Set<string>>(new Set());

  const isFollowing = useCallback((targetUserId: string): boolean => {
    return following.has(targetUserId);
  }, [following]);

  const toggleFollow = useCallback(async (targetUserId: string): Promise<void> => {
    console.log("🔥 TOGGLE FOLLOW FUNCTION HIT", { userId: user?.uid, targetUserId });

    if (!user?.uid) {
      console.warn('Cannot follow: User not authenticated');
      return;
    }

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
        // Unfollow: Pass source, target
        await FollowAPI.unfollowUser(user.uid, targetUserId);

        const { decrementFollowerCount, incrementFollowingCount } = await import('../services/users/usersService');
        await decrementFollowerCount(targetUserId);
        await incrementFollowingCount(user.uid, -1);
      } else {
        console.log("🔥 FOLLOWING USER", targetUserId);
        // Follow: Pass source, target
        await FollowAPI.followUser(user.uid, targetUserId);

        const { incrementFollowerCount, incrementFollowingCount } = await import('../services/users/usersService');
        await incrementFollowerCount(targetUserId);
        await incrementFollowingCount(user.uid);

        // TRIGGER NOTIFICATION
        console.log("🔥 ABOUT TO TRIGGER FOLLOW NOTIFICATION");
        try {
          console.log("🔥 FOLLOW NOTIFICATION TRIGGER ENTERED");
          if (user.uid !== targetUserId) {
            console.log("🔥 SENDING FOLLOW NOTIFICATION TO:", targetUserId);
            // Fetch follower details
            const { getUserById } = await import('../services/users/usersService');
            const followerData = await getUserById(user.uid);

            await sendNotification(targetUserId, {
              type: 'follow',
              actorId: user.uid,
              message: 'started following you',
              data: {
                sourceUsername: followerData?.username || 'Someone',
                sourceAvatarUri: followerData?.photoUrl
              }
            });
            console.log("✅ FOLLOW NOTIFICATION WRITE SUCCESS");
          } else {
            console.log("⚠️ SKIPPED: Self-follow");
          }
        } catch (nErr) {
          console.error("❌ FOLLOW NOTIFICATION FAILED", nErr);
        }
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
  }, [following, addFollowing, removeFollowing, user?.uid]);

  return {
    toggleFollow,
    isFollowing,
  };
}
