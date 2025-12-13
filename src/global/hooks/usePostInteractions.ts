/**
 * Global Post Interactions Hook
 * 
 * Provides real-time state for post interactions (likes, comments, saves).
 * Uses Firestore listeners for persistent, real-time updates.
 * Implements optimistic updates for instant UI feedback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import * as PostInteractions from '../services/posts/post.interactions.service';

interface InitialState {
  initialIsLiked?: boolean;
  initialLikeCount?: number;
  initialIsSaved?: boolean;
}

export interface UsePostInteractionsReturn {
  // Like state
  isLiked: boolean;
  likeCount: number;
  toggleLike: () => Promise<void>;

  // Save state
  isSaved: boolean;
  toggleSave: () => Promise<void>;

  // Comments
  comments: Array<{
    id: string;
    userId: string;
    username: string;
    photoURL: string | null;
    text: string;
    createdAt: any;
  }>;
  addComment: (text: string) => Promise<void>;
  commentCount: number;

  // Report
  reportPost: (reason: string) => Promise<void>;
}

/**
 * Hook for post interactions with real-time Firestore listeners
 * @param postId - Post ID to track interactions for
 * @param initialState - Optional initial state to prevent flicker
 */
export function usePostInteractions(
  postId: string,
  initialState?: InitialState
): UsePostInteractionsReturn {
  const { user } = useAuth();

  // Initialize with passed props or default values
  const [isLiked, setIsLiked] = useState(initialState?.initialIsLiked || false);
  const [likeCount, setLikeCount] = useState(initialState?.initialLikeCount || 0);
  const [isSaved, setIsSaved] = useState(initialState?.initialIsSaved || false);

  const [comments, setComments] = useState<Array<{
    id: string;
    userId: string;
    username: string;
    photoURL: string | null;
    text: string;
    createdAt: any;
  }>>([]);

  const unsubscribesRef = useRef<Array<() => void>>([]);

  // Set up real-time listeners
  useEffect(() => {
    if (!postId || !user?.uid) {
      return;
    }

    const unsubscribes: Array<() => void> = [];

    // Listen to like state
    const unsubscribeLike = PostInteractions.listenToPostLikeState(
      postId,
      user.uid,
      (liked) => {
        // Only update if value is different (avoids fighting with optimistic update)
        setIsLiked(prev => prev === liked ? prev : liked);
      }
    );
    unsubscribes.push(unsubscribeLike);

    // Listen to like count
    const unsubscribeLikeCount = PostInteractions.listenToPostLikeCount(
      postId,
      (count) => {
        setLikeCount(count);
      }
    );
    unsubscribes.push(unsubscribeLikeCount);

    // Listen to saved state
    const unsubscribeSaved = PostInteractions.listenToSavedState(
      postId,
      user.uid,
      (saved) => {
        setIsSaved(prev => prev === saved ? prev : saved);
      }
    );
    unsubscribes.push(unsubscribeSaved);

    // Listen to comments
    const unsubscribeComments = PostInteractions.listenToPostComments(
      postId,
      (commentsList) => {
        setComments(commentsList);
      }
    );
    unsubscribes.push(unsubscribeComments);

    unsubscribesRef.current = unsubscribes;

    // Cleanup on unmount
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [postId, user?.uid]);

  // Toggle like (Optimistic)
  const toggleLike = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const previousLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic Update
    setIsLiked(!previousLiked);
    setLikeCount(prev => previousLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      await PostInteractions.toggleLike(postId, user.uid);
    } catch (error) {
      console.error('[usePostInteractions] Error toggling like:', error);
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      throw error;
    }
  }, [postId, user?.uid, isLiked, likeCount]);

  // Toggle save (Optimistic)
  const toggleSave = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const previousSaved = isSaved;

    // Optimistic Update
    setIsSaved(!previousSaved);

    try {
      await PostInteractions.toggleSavePost(postId, user.uid);
    } catch (error) {
      console.error('[usePostInteractions] Error toggling save:', error);
      // Revert on error
      setIsSaved(previousSaved);
      throw error;
    }
  }, [postId, user?.uid, isSaved]);

  // Add comment
  const addComment = useCallback(async (text: string) => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }
    const photoURL = user.photoURL || null;
    await PostInteractions.addComment(
      postId,
      user.uid,
      user.displayName || user.username || 'User',
      photoURL,
      text
    );
  }, [postId, user?.uid, user.displayName, user.username, user.photoURL]);

  // Report post
  const reportPost = useCallback(async (reason: string) => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }
    await PostInteractions.reportPost(postId, user.uid, reason);
  }, [postId, user?.uid]);

  return {
    isLiked,
    likeCount,
    toggleLike,
    isSaved,
    toggleSave,
    comments,
    addComment,
    commentCount: comments.length,
    reportPost,
  };
}
