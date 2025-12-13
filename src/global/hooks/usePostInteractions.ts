/**
 * Global Post Interactions Hook
 * 
 * Provides real-time state for post interactions (likes, comments, saves).
 * Uses Firestore listeners for persistent, real-time updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import * as PostInteractions from '../services/posts/post.interactions.service';

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
 */
export function usePostInteractions(postId: string): UsePostInteractionsReturn {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
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
        setIsLiked(liked);
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
        setIsSaved(saved);
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

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }
    await PostInteractions.toggleLike(postId, user.uid);
  }, [postId, user?.uid]);

  // Toggle save
  const toggleSave = useCallback(async () => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }
    await PostInteractions.toggleSavePost(postId, user.uid);
  }, [postId, user?.uid]);

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

