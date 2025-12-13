import { useState, useCallback } from 'react';
import * as UsersAPI from '../services/users/usersService';
import * as PostsAPI from '../services/posts/postsService';

export interface UserResult {
  id: string;
  username: string;
  displayName?: string;
  avatarUri?: string;
  isVerified?: boolean;
  followerCount?: number;
}

export interface HashtagResult {
  tag: string;
  postCount: number;
}

export interface RecentSearch {
  id: string;
  type: 'user' | 'hashtag';
  query: string;
  data?: UserResult | HashtagResult;
  timestamp: number;
}

interface UseSearchManagerReturn {
  usersResults: UserResult[];
  hashtagResults: HashtagResult[];
  recentSearch: RecentSearch[];
  searchUsers: (query: string) => Promise<void>;
  searchHashtags: (query: string) => Promise<void>;
  addRecentSearch: (item: Omit<RecentSearch, 'timestamp'>) => void;
  clearRecentSearch: () => void;
  loading: boolean;
}

const MAX_RECENT_SEARCHES = 10;

/**
 * Global hook for managing search functionality
 * Handles user and hashtag searches with recent search history
 */
export function useSearchManager(): UseSearchManagerReturn {
  const [usersResults, setUsersResults] = useState<UserResult[]>([]);
  const [hashtagResults, setHashtagResults] = useState<HashtagResult[]>([]);
  const [recentSearch, setRecentSearch] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const searchUsers = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setUsersResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await UsersAPI.searchUsers(query);
      setUsersResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsersResults([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchHashtags = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setHashtagResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await PostsAPI.searchHashtags(query);
      // Transform API results to match HashtagResult interface
      const transformedResults: HashtagResult[] = results.map((item) => ({
        tag: item.tag,
        postCount: item.count,
      }));
      setHashtagResults(transformedResults);
    } catch (error) {
      console.error('Error searching hashtags:', error);
      setHashtagResults([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addRecentSearch = useCallback((item: Omit<RecentSearch, 'timestamp'>): void => {
    setRecentSearch(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(
        search => !(search.type === item.type && search.query === item.query)
      );
      
      // Add new item at the beginning
      const newItem: RecentSearch = {
        ...item,
        timestamp: Date.now(),
      };
      
      // Keep only MAX_RECENT_SEARCHES items
      const updated = [newItem, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      return updated;
    });
  }, []);

  const clearRecentSearch = useCallback((): void => {
    setRecentSearch([]);
  }, []);

  return {
    usersResults,
    hashtagResults,
    recentSearch,
    searchUsers,
    searchHashtags,
    addRecentSearch,
    clearRecentSearch,
    loading,
  };
}

