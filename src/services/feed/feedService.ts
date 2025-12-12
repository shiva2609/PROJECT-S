/**
 * Feed Service
 * 
 * Unified service for For You and Following feeds with Instagram-like logic
 */

import * as PostsAPI from '../posts/postsService';
import * as UsersAPI from '../users/usersService';
import * as FollowService from '../../global/services/follow/follow.service';
import { safeFirestoreRead } from '../../utils/offlineHandler';

/**
 * Helper to chunk array into groups of max size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export type FeedType = 'forYou' | 'following';

export interface FeedOptions {
  userId: string;
  feedType: FeedType;
  followingList: Set<string>;
  limit?: number;
  lastDoc?: any;
}

/**
 * Get For You feed posts
 * Returns posts from users the current user does NOT follow
 */
export async function getForYouPosts(
  userId: string,
  followingList: Set<string>,
  limit: number = 10,
  lastDoc?: any
): Promise<{ posts: any[]; lastDoc?: any; hasMore: boolean }> {
  return safeFirestoreRead(
    async () => {
      // Fetch all posts
      const result = await PostsAPI.fetchFeed({
        limit: limit * 2, // Fetch more to account for filtering
        lastDoc,
      });

      // Filter: posts from users NOT in following list (and not own posts)
      const filteredPosts = result.posts.filter((post) => {
        const ownerId = post.userId || post.authorId || post.createdBy || '';
        if (!ownerId) return false;
        
        // Exclude own posts from For You feed
        if (ownerId === userId) return false;
        
        // Include only posts from users NOT followed
        return !followingList.has(ownerId);
      });

      // Apply limit after filtering
      const postsToReturn = filteredPosts.slice(0, limit);
      const hasMore = filteredPosts.length > limit || result.hasMore;

      return {
        posts: postsToReturn,
        lastDoc: result.lastDoc,
        hasMore,
      };
    },
    { posts: [], lastDoc: null, hasMore: false }
  );
}

/**
 * Get Following feed posts
 * Returns posts from users the current user follows
 * Uses global follow service to get following IDs
 */
export async function getFollowingPosts(
  userId: string,
  followingList: Set<string>,
  limit: number = 10,
  lastDoc?: any
): Promise<{ posts: any[]; lastDoc?: any; hasMore: boolean }> {
  return safeFirestoreRead(
    async () => {
      // Get following IDs from global service
      const followingIds = await FollowService.getFollowingIds(userId);
      
      if (followingIds.length === 0) {
        return { posts: [], lastDoc: null, hasMore: false };
      }

      // Firestore 'in' query limit is 10, so chunk if needed
      const chunks = chunkArray(followingIds, 10);
      const allPosts: any[] = [];
      let lastDocResult: any = null;
      let hasMoreResult = false;

      // Query each chunk and merge results
      for (const chunk of chunks) {
        try {
          // Note: PostsAPI.fetchFeed may need to support authorId filtering
          // For now, we'll fetch and filter client-side as before
          const result = await PostsAPI.fetchFeed({
            limit: limit * 3, // Fetch more to account for filtering
            lastDoc: lastDocResult || lastDoc,
          });

          // Filter: posts from users IN this chunk
          const filteredPosts = result.posts.filter((post) => {
            const ownerId = post.userId || post.authorId || post.createdBy || '';
            if (!ownerId) return false;
            return chunk.includes(ownerId);
          });

          allPosts.push(...filteredPosts);
          lastDocResult = result.lastDoc;
          hasMoreResult = result.hasMore || hasMoreResult;
        } catch (error: any) {
          console.error('[getFollowingPosts] Error fetching chunk:', error);
        }
      }

      // Sort by createdAt desc and apply limit
      allPosts.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });

      const postsToReturn = allPosts.slice(0, limit);
      const hasMore = allPosts.length > limit || hasMoreResult;

      return {
        posts: postsToReturn,
        lastDoc: lastDocResult,
        hasMore,
      };
    },
    { posts: [], lastDoc: null, hasMore: false }
  );
}

