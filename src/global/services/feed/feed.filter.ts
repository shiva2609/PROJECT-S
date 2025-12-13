/**
 * Global Feed Filter Service
 * 
 * SINGLE SOURCE OF TRUTH for classifying posts into FOLLOWING and FOR YOU feeds.
 * 
 * Core Principle: POST SELECTION ≠ POST RENDERING
 * All logic deciding "where a post belongs" MUST live here.
 * 
 * Reference model: Twitter/X
 * - FOLLOWING → ONLY posts from accounts the user follows
 * - FOR YOU → Posts from accounts NOT followed + excludes own posts
 * - NO overlap unless explicitly intended
 */

import type { PostWithAuthor } from '../posts/post.service';

export interface ClassifyPostsInput {
  posts: PostWithAuthor[];
  followingIds: string[];
  loggedUserId: string;
}

export interface ClassifyPostsOutput {
  followingFeedPosts: PostWithAuthor[];
  forYouFeedPosts: PostWithAuthor[];
}

/**
 * Classify posts into FOLLOWING and FOR YOU feeds
 * 
 * STRICT LOGIC:
 * - IGNORE posts authored by loggedUserId (unless explicitly allowed elsewhere)
 * 
 * FOLLOWING FEED:
 * - Include post IF AND ONLY IF: followingIds.includes(post.authorId) === true
 * 
 * FOR YOU FEED:
 * - Include post IF: followingIds.includes(post.authorId) === false
 * 
 * NO OTHER CONDITIONS.
 * NO isFollowing checks in UI.
 * NO fallback mixing.
 * 
 * @param input - Posts, following IDs, and logged user ID
 * @returns Classified posts for each feed
 */
export function classifyPostsForFeeds({
  posts,
  followingIds,
  loggedUserId,
}: ClassifyPostsInput): ClassifyPostsOutput {
  // Convert followingIds to Set for O(1) lookup
  const followingSet = new Set(followingIds);

  const followingFeedPosts: PostWithAuthor[] = [];
  const forYouFeedPosts: PostWithAuthor[] = [];

  // Process each post
  for (const post of posts) {
    // Skip posts without authorId
    if (!post.authorId) {
      continue;
    }

    // IGNORE posts authored by loggedUserId
    if (post.authorId === loggedUserId) {
      continue;
    }

    // FOLLOWING FEED: Include ONLY if author is in followingIds
    if (followingSet.has(post.authorId)) {
      followingFeedPosts.push(post);
    } else {
      // FOR YOU FEED: Include if author is NOT in followingIds
      forYouFeedPosts.push(post);
    }
  }

  // Debug logging (for validation)
  console.log('[feed.filter] Classification results:', {
    totalPostsFetched: posts.length,
    followingIdsCount: followingIds.length,
    followingFeedCount: followingFeedPosts.length,
    forYouFeedCount: forYouFeedPosts.length,
    loggedUserId,
    sampleFollowingAuthors: followingFeedPosts.slice(0, 3).map(p => p.authorId),
    sampleForYouAuthors: forYouFeedPosts.slice(0, 3).map(p => p.authorId),
  });

  return {
    followingFeedPosts,
    forYouFeedPosts,
  };
}

