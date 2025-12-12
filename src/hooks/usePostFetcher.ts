import { useState, useCallback, useRef } from 'react';
import * as PostsAPI from '../services/posts/postsService';

export interface Post {
  id: string;
  userId: string;
  username: string;
  avatarUri?: string;
  isVerified?: boolean;
  timestamp: number;
  media?: Array<{
    uri: string;
    type: 'image' | 'video';
  }>;
  aspectRatio?: number;
  caption?: string;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

interface UsePostFetcherReturn {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  lastDoc: any;
  fetchInitialPosts: () => Promise<void>;
  fetchMorePosts: () => Promise<void>;
  refreshPosts: () => Promise<void>;
  hasMore: boolean;
}

const POSTS_PER_PAGE = 10;

/**
 * Global hook for fetching and managing posts feed
 * Implements Instagram-style pagination with caching
 */
export function usePostFetcher(): UsePostFetcherReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  
  // In-memory cache
  const cacheRef = useRef<Map<string, Post[]>>(new Map());

  const fetchInitialPosts = useCallback(async (): Promise<void> => {
    if (loading) return;

    setLoading(true);
    try {
      const result = await PostsAPI.fetchFeed({
        limit: POSTS_PER_PAGE,
        lastDoc: null,
      });

      setPosts(result.posts);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      
      // Cache the results
      cacheRef.current.set('initial', result.posts);
    } catch (error) {
      console.error('Error fetching initial posts:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const fetchMorePosts = useCallback(async (): Promise<void> => {
    if (loading || !hasMore || !lastDoc) return;

    setLoading(true);
    try {
      const result = await PostsAPI.fetchFeed({
        limit: POSTS_PER_PAGE,
        lastDoc: lastDoc,
      });

      setPosts(prev => [...prev, ...result.posts]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error fetching more posts:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, lastDoc]);

  const refreshPosts = useCallback(async (): Promise<void> => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      const result = await PostsAPI.fetchFeed({
        limit: POSTS_PER_PAGE,
        lastDoc: null,
      });

      setPosts(result.posts);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      
      // Update cache
      cacheRef.current.set('initial', result.posts);
    } catch (error) {
      console.error('Error refreshing posts:', error);
      throw error;
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  return {
    posts,
    loading,
    refreshing,
    lastDoc,
    fetchInitialPosts,
    fetchMorePosts,
    refreshPosts,
    hasMore,
  };
}

