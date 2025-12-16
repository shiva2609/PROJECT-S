/**
 * Global useHomeFeed Hook
 * 
 * Centralized orchestrator for home feed data.
 * 
 * LIFECYCLE CONTRACT:
 * 1. PREREQUISITES: Feed fetch MUST wait for 'followingIds' to be fully loaded (synced).
 *    - This prevents fetching user timeline with empty IDs (returns nothing) 
 *    - Prevents For You classification running with empty exclusion list.
 * 2. RACE CONDITIONS: Async fetches are guarded by 'fetchRequestId'. Stale responses (from rapid tab switches or double-fires) are DISCARDED.
 * 3. ISOLATION: Switching feed types (For You <-> Following) MUST clear the feed immediately to prevent mixed/ghost posts.
 * 4. REFRESH vs LOAD: Initial load and Pull-to-Refresh share the EXACT same path to ensure deterministic results.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as PostService from '../services/posts/post.service';
import * as FollowService from '../services/follow/follow.service';
import * as UserService from '../services/user/user.service';
import { classifyPostsForFeeds } from '../services/feed/feed.filter';
import type { PostWithAuthor } from '../services/posts/post.service';
import { getPostInteractionStates } from '../services/posts/post.interactions.service';

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
 */
export function useHomeFeed(
  loggedUid: string | null | undefined,
  options: UseHomeFeedOptions = {}
): UseHomeFeedReturn {
  const { feedType = 'foryou', limit = 10 } = options;
  const [feed, setFeed] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Start loading strictly
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Prerequisite State
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followsLoaded, setFollowsLoaded] = useState<boolean>(false);

  // Async Guard
  const fetchRequestId = useRef<number>(0);

  // Listen to following IDs in REAL TIME
  useEffect(() => {
    if (!loggedUid) {
      setFollowingIds([]);
      setFollowsLoaded(false);
      return;
    }

    // console.log('[useHomeFeed] Setting up real-time listener for followingIds');

    const unsubscribe = FollowService.listenToFollowingIds(
      loggedUid,
      (ids: string[]) => {
        setFollowingIds((prevIds) => {
          // Check for equality to prevent unnecessary effect triggers
          if (prevIds.length === ids.length) {
            const prevSorted = [...prevIds].sort();
            const newSorted = [...ids].sort();
            if (prevSorted.every((val, index) => val === newSorted[index])) {
              // Mark as loaded even if no change, ensuring separate signal
              setFollowsLoaded(true);
              return prevIds;
            }
          }
          setFollowsLoaded(true);
          return ids;
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loggedUid]);

  // Determine feed type (no fallback - respect the requested type)
  const actualFeedType: 'following' | 'foryou' = feedType;

  /**
   * Core Fetch Logic
   * @param isRefresh - True if resetting list
   * @param requestId - Unique ID for this specific fetch call
   */
  const fetchPosts = useCallback(async (isRefresh: boolean, requestId: number) => {
    if (!loggedUid) {
      setFeed([]);
      setLoading(false);
      return;
    }

    // Guard: If prerequisites aren't met, DO NOT fetch (prevents empty/wrong states)
    if (!followsLoaded) {
      console.log('[useHomeFeed] Blocked fetch: Follows not loaded yet');
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let selectedPosts: PostWithAuthor[] = [];
      let hasMoreResult = false;
      let lastDocResult: any = null;

      // Determine cursor
      const currentCursor = isRefresh ? null : lastDoc;

      if (actualFeedType === 'following') {
        // STRATEGY 1: FOLLOWING FEED
        if (followingIds.length === 0) {
          selectedPosts = [];
          hasMoreResult = false;
          lastDocResult = null;
        } else {
          const fetchedPosts = await PostService.getPostsByUserIds(followingIds, 10, currentCursor);
          selectedPosts = fetchedPosts;
          hasMoreResult = fetchedPosts.length >= 10;
          lastDocResult = fetchedPosts.length > 0 ? fetchedPosts[fetchedPosts.length - 1] : null;
        }
      } else {
        // STRATEGY 2: FOR YOU FEED
        const candidateLimit = 80;
        const candidateResult = await PostService.getCandidatePostsForClassification({
          limit: candidateLimit,
          cursor: currentCursor,
        });

        const candidatePosts = candidateResult.posts || [];
        const { forYouFeedPosts } = classifyPostsForFeeds({
          posts: candidatePosts,
          followingIds,
          loggedUserId: loggedUid,
        });

        selectedPosts = forYouFeedPosts;
        hasMoreResult = candidateResult.nextCursor !== null;
        lastDocResult = candidateResult.nextCursor;
      }

      // Race Condition Guard: If a newer request started content, discard this result
      if (fetchRequestId.current !== requestId) {
        console.log('[useHomeFeed] Discarding stale fetch result', requestId);
        return;
      }

      // STEP 4: Enrich posts with author information
      const authorIds = new Set<string>();
      selectedPosts.forEach((post) => {
        if (post.authorId) authorIds.add(post.authorId);
      });

      const authorIdsArray = Array.from(authorIds);
      let authors: any[] = [];
      if (authorIdsArray.length > 0) {
        authors = await UserService.getUsersPublicInfo(authorIdsArray);
      }

      const authorMap = new Map<string, typeof authors[0]>();
      if (authors && Array.isArray(authors)) {
        authors.forEach((author) => {
          if (author && author.uid) {
            authorMap.set(author.uid, author);
          }
        });
      }

      let enrichedPosts: PostWithAuthor[] = selectedPosts.map((post) => {
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

      // STEP 4.5: Enrich posts with interaction state
      if (enrichedPosts.length > 0) {
        try {
          const postIds = enrichedPosts.map(p => p.id);
          const interactionStates = await getPostInteractionStates(loggedUid, postIds);

          enrichedPosts = enrichedPosts.map(post => ({
            ...post,
            isLiked: interactionStates[post.id]?.isLiked || false,
            isSaved: interactionStates[post.id]?.isSaved || false
          }));
        } catch (enrichError) {
          console.error('[useHomeFeed] Error enriching interaction states:', enrichError);
        }
      }

      // Final Race Check
      if (fetchRequestId.current !== requestId) return;

      if (isRefresh) {
        setFeed(enrichedPosts);
      } else {
        setFeed((prev) => [...prev, ...enrichedPosts]);
      }

      setLastDoc(lastDocResult);
      setHasMore(hasMoreResult);
    } catch (err: any) {
      if (fetchRequestId.current === requestId) {
        console.error('[useHomeFeed] Error fetching posts:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch feed'));
      }
    } finally {
      if (fetchRequestId.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loggedUid, actualFeedType, followingIds, lastDoc, followsLoaded]);

  // ORCHESTRATION: Feed Type / User / Follows Changed
  useEffect(() => {
    if (loggedUid && followsLoaded) {
      // 1. Increment ID to invalidate previous inflight requests
      const requestId = ++fetchRequestId.current;

      // 2. Clear state ONLY if we are starting a refresh (dependency change)
      // We clear feed immediately to prevent mixed content when type swaps
      setFeed([]);
      setLastDoc(null);
      setLoading(true);

      // 3. Start fresh fetch
      fetchPosts(true, requestId);
    }
  }, [loggedUid, actualFeedType, followsLoaded]); // removed followingIds to prevents auto-reload on follow

  // Refresh function
  const refresh = useCallback(async () => {
    if (!loggedUid || !followsLoaded) return;
    const requestId = ++fetchRequestId.current;
    setLastDoc(null);
    await fetchPosts(true, requestId);
  }, [fetchPosts, loggedUid, followsLoaded]);

  // Fetch more function
  const fetchMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || !followsLoaded) return;
    const requestId = fetchRequestId.current; // Continue current Session
    await fetchPosts(false, requestId);
  }, [hasMore, loading, refreshing, fetchPosts, followsLoaded]);

  return {
    feed,
    loading: loading || !followsLoaded, // Global loading implies waiting for follows
    error,
    refreshing,
    hasMore,
    refresh,
    fetchMore,
    type: actualFeedType,
  };
}
