/**
 * Post Utilities
 * Normalization and safety checks for posts
 */

import { serverTimestamp } from 'firebase/firestore';

export interface PostData {
  id?: string;
  createdBy?: string;
  userId?: string;
  createdAt?: any;
  [key: string]: any;
}

/**
 * Normalize post author field (userId -> createdBy)
 */
export function normalizePostAuthor(post: PostData): PostData {
  if (!post.createdBy && post.userId) {
    return { ...post, createdBy: post.userId };
  }
  return post;
}

/**
 * Check if post has valid createdAt
 */
export function hasValidCreatedAt(post: PostData): boolean {
  return !!post.createdAt;
}

/**
 * Get timestamp value from createdAt (handles Firestore Timestamp)
 */
export function getCreatedAtTimestamp(createdAt: any): number {
  if (!createdAt) return 0;
  if (typeof createdAt === 'number') return createdAt;
  if (createdAt.toMillis && typeof createdAt.toMillis === 'function') {
    return createdAt.toMillis();
  }
  if (createdAt.seconds) {
    return createdAt.seconds * 1000;
  }
  return 0;
}

/**
 * Sort posts by createdAt descending, with missing createdAt at the end
 */
export function sortPostsByCreatedAt(posts: PostData[]): PostData[] {
  return posts.sort((a, b) => {
    const aTime = getCreatedAtTimestamp(a.createdAt);
    const bTime = getCreatedAtTimestamp(b.createdAt);
    
    // Posts without createdAt go to the end
    if (aTime === 0 && bTime === 0) return 0;
    if (aTime === 0) return 1;
    if (bTime === 0) return -1;
    
    return bTime - aTime; // Descending
  });
}

/**
 * Filter out posts without createdAt
 */
export function filterValidPosts(posts: PostData[]): PostData[] {
  return posts.filter(hasValidCreatedAt);
}

/**
 * Ensure post has createdAt using serverTimestamp
 */
export function ensurePostCreatedAt(postData: any): any {
  if (!postData.createdAt) {
    return {
      ...postData,
      createdAt: serverTimestamp(),
    };
  }
  return postData;
}

/**
 * Ensure post has both createdBy and userId for backward compatibility
 */
export function ensurePostAuthorFields(postData: any, userId: string): any {
  return {
    ...postData,
    createdBy: postData.createdBy || userId,
    userId: postData.userId || userId,
  };
}

