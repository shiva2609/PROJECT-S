/**
 * Global Post Actions Utility
 * 
 * Unified utility for post interactions (like, save, comment, share).
 * Handles optimistic updates and syncs with backend.
 */

import { useAuth } from '../providers/AuthProvider';
import { useLikesManager } from '../hooks/useLikesManager';
import { useSaveManager } from '../hooks/useSaveManager';
import { useCommentsManager } from '../hooks/useCommentsManager';
import * as PostsAPI from '../services/posts/postsService';

export interface PostActions {
  // Like/Unlike
  toggleLike: (postId: string, onUpdate?: (isLiked: boolean, newCount: number) => void) => Promise<void>;
  isLiked: (postId: string) => boolean;
  
  // Save/Unsave
  toggleSave: (postId: string, onUpdate?: (isSaved: boolean) => void) => Promise<void>;
  isSaved: (postId: string) => boolean;
  
  // Comment
  addComment: (postId: string, text: string, onUpdate?: (newCount: number) => void) => Promise<void>;
  deleteComment: (postId: string, commentId: string, onUpdate?: (newCount: number) => void) => Promise<void>;
  
  // Share
  sharePost: (post: any) => Promise<void>;
}

/**
 * Hook for post actions with optimistic updates
 * @param onPostUpdate - Callback to update post in local state (for optimistic updates)
 */
export function usePostActions(
  onPostUpdate?: (postId: string, updates: { 
    isLiked?: boolean; 
    isSaved?: boolean; 
    likeCount?: number | ((prev: number) => number);
    commentCount?: number | ((prev: number) => number);
  }) => void
): PostActions {
  const { user } = useAuth();
  const { toggleLike: toggleLikeInternal, isLiked: isLikedInternal } = useLikesManager();
  const { toggleSave: toggleSaveInternal, isSaved: isSavedInternal } = useSaveManager();
  const { addComment: addCommentInternal, deleteComment: deleteCommentInternal, getCommentCount } = useCommentsManager();

  /**
   * Toggle like with optimistic update
   */
  const toggleLike = async (
    postId: string,
    onUpdate?: (isLiked: boolean, newCount: number) => void
  ): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const wasLiked = isLikedInternal(postId);
    const optimisticCount = wasLiked ? -1 : 1;

    // Optimistic UI update
    if (onPostUpdate) {
      onPostUpdate(postId, {
        isLiked: !wasLiked,
        likeCount: (prev: number) => Math.max(0, prev + optimisticCount),
      });
    }

    try {
      await toggleLikeInternal(postId);
      
      // Final update after backend sync
      if (onUpdate) {
        onUpdate(!wasLiked, optimisticCount);
      }
    } catch (error) {
      // Rollback on error
      if (onPostUpdate) {
        onPostUpdate(postId, {
          isLiked: wasLiked,
          likeCount: (prev: number) => Math.max(0, prev - optimisticCount),
        });
      }
      throw error;
    }
  };

  /**
   * Toggle save with optimistic update
   */
  const toggleSave = async (
    postId: string,
    onUpdate?: (isSaved: boolean) => void
  ): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const wasSaved = isSavedInternal(postId);

    // Optimistic UI update
    if (onPostUpdate) {
      onPostUpdate(postId, {
        isSaved: !wasSaved,
      });
    }

    try {
      await toggleSaveInternal(postId);
      
      if (onUpdate) {
        onUpdate(!wasSaved);
      }
    } catch (error) {
      // Rollback on error
      if (onPostUpdate) {
        onPostUpdate(postId, {
          isSaved: wasSaved,
        });
      }
      throw error;
    }
  };

  /**
   * Add comment with optimistic update
   */
  const addComment = async (
    postId: string,
    text: string,
    onUpdate?: (newCount: number) => void
  ): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    // Optimistic UI update
    if (onPostUpdate) {
      onPostUpdate(postId, {
        commentCount: (prev: number) => prev + 1,
      });
    }

    try {
      await addCommentInternal(postId, text);
      
      const newCount = getCommentCount(postId);
      if (onUpdate) {
        onUpdate(newCount);
      }
    } catch (error) {
      // Rollback on error
      if (onPostUpdate) {
        onPostUpdate(postId, {
          commentCount: (prev: number) => Math.max(0, prev - 1),
        });
      }
      throw error;
    }
  };

  /**
   * Delete comment with optimistic update
   */
  const deleteComment = async (
    postId: string,
    commentId: string,
    onUpdate?: (newCount: number) => void
  ): Promise<void> => {
    // Optimistic UI update
    if (onPostUpdate) {
      onPostUpdate(postId, {
        commentCount: (prev: number) => Math.max(0, prev - 1),
      });
    }

    try {
      await deleteCommentInternal(postId, commentId);
      
      const newCount = getCommentCount(postId);
      if (onUpdate) {
        onUpdate(newCount);
      }
    } catch (error) {
      // Rollback on error
      if (onPostUpdate) {
        onPostUpdate(postId, {
          commentCount: (prev: number) => prev + 1,
        });
      }
      throw error;
    }
  };

  /**
   * Share post
   */
  const sharePost = async (post: any): Promise<void> => {
    const { Share } = require('react-native');
    const mediaUrl = post.mediaUrls?.[0] || post.mediaUrl || post.imageUrl || '';
    
    try {
      await Share.share({
        message: post.caption || 'Check out this post!',
        url: mediaUrl,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing post:', error);
        throw error;
      }
    }
  };

  return {
    toggleLike,
    isLiked: isLikedInternal,
    toggleSave,
    isSaved: isSavedInternal,
    addComment,
    deleteComment,
    sharePost,
  };
}

