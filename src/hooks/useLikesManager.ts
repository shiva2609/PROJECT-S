import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import * as LikesAPI from '../services/likes/likesService';

interface UseLikesManagerReturn {
  likedPosts: Set<string>;
  toggleLike: (postId: string) => Promise<void>;
  isLiked: (postId: string) => boolean;
  likeCountUpdater: (postId: string, currentCount: number) => number;
}

/**
 * Global hook for managing post likes
 * Handles optimistic updates and prevents double-tapping
 */
export function useLikesManager(): UseLikesManagerReturn {
  const { user } = useAuth();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());

  const isLiked = useCallback((postId: string): boolean => {
    return likedPosts.has(postId);
  }, [likedPosts]);

  const likeCountUpdater = useCallback((postId: string, currentCount: number): number => {
    const isCurrentlyLiked = likedPosts.has(postId);
    return isCurrentlyLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
  }, [likedPosts]);

  const toggleLike = useCallback(async (postId: string): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated to like posts');
    }

    // Prevent double-tapping
    if (processingRef.current.has(postId)) {
      return;
    }

    const wasLiked = likedPosts.has(postId);
    
    // Optimistic update - update UI instantly
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (wasLiked) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    processingRef.current.add(postId);

    try {
      if (wasLiked) {
        await LikesAPI.unlikePost(user.uid, postId);
      } else {
        await LikesAPI.likePost(user.uid, postId);
      }
    } catch (error) {
      // Rollback optimistic update on error
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
      console.error('Error toggling like:', error);
      throw error;
    } finally {
      processingRef.current.delete(postId);
    }
  }, [likedPosts, user?.uid]);

  return {
    likedPosts,
    toggleLike,
    isLiked,
    likeCountUpdater,
  };
}

