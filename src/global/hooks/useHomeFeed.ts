/**
 * Global useHomeFeed Hook
 * 
 * Centralized hook for home feed (Following and For You tabs)
 * Uses global feed classification for strict, deterministic feed separation
 */

import { useState, useEffect, useCallback } from 'react';
import * as PostService from '../services/posts/post.service';
import * as FollowService from '../services/follow/follow.service';
import * as UserService from '../services/user/user.service';
import { classifyPostsForFeeds } from '../services/feed/feed.filter';
import type { PostWithAuthor } from '../services/posts/post.service';

interface UseHomeFeedOptions {
  feedType?: 'following' | 'foryou';
  limit?: number;
}

interface UseHomeFeedReturn {
  feed: PostWithAuthor[];
  loading: boolean;
  error: Error | null;
  refreshing: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  fetchMore: () => Promise<void>;
  type: 'following' | 'foryou';
}

/**
 * Hook for home feed with author information
 * @param loggedUid - Logged-in user ID
 * @param options - Feed options
 * @returns Feed data with loading states
 */
export function useHomeFeed(
  loggedUid: string | null | undefined,
  options: UseHomeFeedOptions = {}
): UseHomeFeedReturn {
  const { feedType = 'foryou', limit = 10 } = options;
  const [feed, setFeed] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // Fetch following IDs
  useEffect(() => {
    const fetchFollowing = async () => {
      if (!loggedUid) {
        setFollowingIds([]);
        return;
      }

      try {
        const ids = await FollowService.getFollowingIds(loggedUid);
        setFollowingIds(ids);
      } catch (err: any) {
        console.error('[useHomeFeed] Error fetching following IDs:', err);
        setFollowingIds([]);
      }
    };

    fetchFollowing();
  }, [loggedUid]);

  // Determine feed type (no fallback - respect the requested type)
  const actualFeedType: 'following' | 'foryou' = feedType;

  // Fetch posts and enrich with author data using global classification
  const fetchPosts = useCallback(async (isRefresh: boolean = false) => {
    if (!loggedUid) {
      setFeed([]);
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // STEP 1: Fetch candidate posts ONCE (larger batch for classification)
      const candidateLimit = 80; // Fetch more for classification
      const candidateResult = await PostService.getCandidatePostsForClassification({
        limit: candidateLimit,
        cursor: isRefresh ? undefined : lastDoc,
      });

      const candidatePosts = candidateResult.posts || [];

      // STEP 2: Classify posts using global filter
      const { followingFeedPosts, forYouFeedPosts } = classifyPostsForFeeds({
        posts: candidatePosts,
        followingIds,
        loggedUserId: loggedUid,
      });

      // STEP 3: Apply feed-specific rules
      let selectedPosts: PostWithAuthor[] = [];
      let hasMoreResult = false;
      let lastDocResult: any = null;

      if (actualFeedType === 'following') {
        // FOLLOWING FEED RULES:
        // - Use followingFeedPosts ONLY
        // - Sort by createdAt desc (already sorted from query)
        // - Slice to MAX 15 posts
        // - NO infinite scroll (hasMore = false)
        selectedPosts = followingFeedPosts.slice(0, 15);
        hasMoreResult = false; // Following feed doesn't support pagination
        lastDocResult = null;
      } else {
        // FOR YOU FEED RULES:
        // - Use forYouFeedPosts ONLY
        // - Sort by createdAt desc (already sorted from query)
        // - Infinite scroll allowed
        // - Pagination cursor applies
        selectedPosts = forYouFeedPosts;
        hasMoreResult = candidateResult.nextCursor !== null;
        lastDocResult = candidateResult.nextCursor;
      }

      // STEP 4: Enrich posts with author information
      const authorIds = new Set<string>();
      selectedPosts.forEach((post) => {
        if (post.authorId) {
          authorIds.add(post.authorId);
        }
      });

      // Batch fetch author information
      const authorIdsArray = Array.from(authorIds);
      const authors = await UserService.getUsersPublicInfo(authorIdsArray);
      const authorMap = new Map<string, typeof authors[0]>();
      if (authors && Array.isArray(authors)) {
        authors.forEach((author) => {
          if (author && author.uid) {
            authorMap.set(author.uid, author);
          }
        });
      }

      // Enrich posts with author data
      const enrichedPosts: PostWithAuthor[] = selectedPosts.map((post) => {
        const author = authorMap.get(post.authorId);
        const isFollowingAuthor = followingIds.includes(post.authorId);

        return {
          ...post,
          authorUsername: author?.username || 'Unknown',
          authorDisplayName: author?.displayName || 'User',
          authorAvatar: author?.photoURL || '',
          isFollowingAuthor,
        };
      });

      // STEP 5: Update feed state
      if (isRefresh) {
        setFeed(enrichedPosts);
      } else {
        setFeed((prev) => [...prev, ...enrichedPosts]);
      }

      setLastDoc(lastDocResult);
      setHasMore(hasMoreResult);
    } catch (err: any) {
      console.error('[useHomeFeed] Error fetching posts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch feed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loggedUid, actualFeedType, followingIds, lastDoc]);

  // Initial fetch and refresh when followingIds change
  useEffect(() => {
    if (loggedUid) {
      // Wait for followingIds to be fetched before fetching posts
      // Reset lastDoc to start fresh when followingIds change
      setLastDoc(null);
      fetchPosts(true);
    }
  }, [loggedUid, actualFeedType, followingIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh function
  const refresh = useCallback(async () => {
    setLastDoc(null);
    await fetchPosts(true);
  }, [fetchPosts]);

  // Fetch more function
  const fetchMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    await fetchPosts(false);
  }, [hasMore, loading, refreshing, fetchPosts]);

  return {
    feed,
    loading,
    error,
    refreshing,
    hasMore,
    refresh,
    fetchMore,
    type: actualFeedType,
  };
}

