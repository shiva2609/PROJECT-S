/**
 * Global useUser Hook
 * 
 * Centralized hook for fetching user information with realtime updates
 * Used by all profile screens, followers/following lists, and post grids
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import * as UserService from '../services/user/user.service';
import * as FollowService from '../services/follow/follow.service';
import type { UserPublicInfo, UserCounts, UserData } from '../services/user/user.types';
import { Post } from '../../types/firestore';

interface UseUserOptions {
  listenPosts?: boolean;
}

interface UseUserReturn {
  user: UserPublicInfo | null;
  posts: Post[];
  counts: UserCounts;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Global hook for user data with realtime updates
 * @param userId - User ID to fetch data for
 * @param options - Optional configuration (listenPosts: default true)
 * @returns User data, posts, counts, loading, error, and refresh function
 */
export function useUser(
  userId: string | null | undefined,
  options: UseUserOptions = {}
): UseUserReturn {
  const { listenPosts = true } = options;
  const [user, setUser] = useState<UserPublicInfo | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [counts, setCounts] = useState<UserCounts>({ followers: 0, following: 0, posts: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Realtime listener for user info
  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = UserService.listenToUserPublicInfo(
      userId,
      (userInfo) => {
        setUser(userInfo);
        setLoading(false);
        setError(null);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Realtime listener for user posts (optional)
  useEffect(() => {
    if (!userId || !listenPosts) {
      setPosts([]);
      return;
    }

    const unsubscribe = UserService.listenToUserPosts(userId, (postsData) => {
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [userId, listenPosts]);

  // Realtime listener for user counts
  useEffect(() => {
    if (!userId) {
      setCounts({ followers: 0, following: 0, posts: 0 });
      return;
    }

    const unsubscribe = UserService.listenToUserCounts(userId, (userCounts) => {
      setCounts(userCounts);
    });

    return () => unsubscribe();
  }, [userId]);

  // Refresh all user data
  const refresh = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const [userInfo, userCounts] = await Promise.all([
        UserService.getUserPublicInfo(userId),
        UserService.getUserCounts(userId),
      ]);

      setUser(userInfo);
      setCounts(userCounts);

      if (listenPosts) {
        const postsData = await UserService.getUserPosts(userId);
        setPosts(postsData);
      }

      setLoading(false);
    } catch (err: any) {
      const error = err instanceof Error ? err : new Error('Failed to refresh user data');
      setError(error);
      setLoading(false);
      console.error('[useUser] Error refreshing:', error);
    }
  }, [userId, listenPosts]);

  return {
    user,
    posts,
    counts,
    loading,
    error,
    refresh,
  };
}

