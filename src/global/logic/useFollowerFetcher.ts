import { useState, useCallback } from 'react';
import * as UsersAPI from '../../services/users/usersService';

export interface UserListItem {
  id: string;
  username: string;
  displayName?: string;
  avatarUri?: string;
  isVerified?: boolean;
  followerCount?: number;
  followingCount?: number;
  bio?: string;
}

interface UseFollowerFetcherReturn {
  list: UserListItem[];
  loading: boolean;
  nextPageCursor: any;
  fetchFollowers: (userId: string, limit?: number, lastDoc?: any) => Promise<void>;
  fetchFollowing: (userId: string, limit?: number, lastDoc?: any) => Promise<void>;
  reset: () => void;
}

/**
 * Global hook for fetching followers and following lists with pagination
 * Supports infinite scroll lists on profile screen
 */
export function useFollowerFetcher(): UseFollowerFetcherReturn {
  const [list, setList] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [nextPageCursor, setNextPageCursor] = useState<any>(null);

  const fetchFollowers = useCallback(async (
    userId: string,
    limit: number = 20,
    lastDoc?: any
  ): Promise<void> => {
    // CRITICAL: Validate userId before fetching
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      console.warn('[useFollowerFetcher] fetchFollowers: Invalid userId');
      setList([]);
      setNextPageCursor(null);
      return;
    }
    
    setLoading(true);
    try {
      const result = await UsersAPI.getFollowers(userId, { limit, lastDoc });
      setList(result.users || []);
      setNextPageCursor(result.nextPageCursor || null);
    } catch (error) {
      console.error('Error fetching followers:', error);
      // Don't throw - set empty list instead
      setList([]);
      setNextPageCursor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFollowing = useCallback(async (
    userId: string,
    limit: number = 20,
    lastDoc?: any
  ): Promise<void> => {
    // CRITICAL: Validate userId before fetching
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      console.warn('[useFollowerFetcher] fetchFollowing: Invalid userId');
      setList([]);
      setNextPageCursor(null);
      return;
    }
    
    setLoading(true);
    try {
      const result = await UsersAPI.getFollowing(userId, { limit, lastDoc });
      setList(result.users || []);
      setNextPageCursor(result.nextPageCursor || null);
    } catch (error) {
      console.error('Error fetching following:', error);
      // Don't throw - set empty list instead
      setList([]);
      setNextPageCursor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback((): void => {
    setList([]);
    setNextPageCursor(null);
  }, []);

  return {
    list,
    loading,
    nextPageCursor,
    fetchFollowers,
    fetchFollowing,
    reset,
  };
}

