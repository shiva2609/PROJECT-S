/**
 * Global Post Actions Utility
 * 
 * Unified utility for post interactions (like, save, comment, share).
 * Handles optimistic updates and syncs with backend.
 */

/**
 * INVARIANT: SINGLE SOURCE OF TRUTH & STATE CORRECTNESS
 * 
 * 1. Post interactions (Like, Save) MUST be derived from the 'post' object passed from the feed.
 *    - The feed (useHomeFeed) enriches posts with 'isLiked'/'isSaved' from Firestore.
 *    - Local optimistic updates modify this 'post' object state via onPostUpdate callback.
 *    - DO NOT rely on internal state of useLikesManager/useSaveManager for initial rendering,
 *      as they are empty on mount and only track *changes* made efficiently.
 * 
 * 2. Optimistic Updates MUST be idempotent.
 *    - toggleLike/toggleSave now accept 'currentIsLiked'/'currentIsSaved' to ensure we toggle
 *      from the correct known state, even if the manager doesn't know it yet.
 * 
 * 3. Firestore is the ultimate source of truth.
 *    - Writes go to Firestore. Real-time listeners or refresh logic ensures consistency.
 * 
 * CHANGE WITH CAUTION: Any changes to debounce or state logic must preserve this flow.
 */
import { useAuth } from '../providers/AuthProvider';
import { useLikesManager } from '../hooks/useLikesManager';
import { useSaveManager } from '../hooks/useSaveManager';
import { useCommentsManager } from '../hooks/useCommentsManager';
import { checkNetworkStatus } from '../hooks/useNetworkState';
import { useSingleFlight } from '../hooks/useSingleFlight';
import { AppError, ErrorType, withTimeout } from './AppError';
import * as PostsAPI from '../services/posts/postsService';

export interface PostActions {
  // Like/Unlike
  toggleLike: (postId: string, currentIsLiked?: boolean, onUpdate?: (isLiked: boolean, newCount: number) => void) => Promise<void>;
  isLiked: (postId: string) => boolean;

  // Save/Unsave
  toggleSave: (postId: string, currentIsSaved?: boolean, onUpdate?: (isSaved: boolean) => void) => Promise<void>;
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
  const { user, checkSession } = useAuth();
  const { toggleLike: toggleLikeInternal, isLiked: isLikedInternal } = useLikesManager();
  const { toggleSave: toggleSaveInternal, isSaved: isSavedInternal } = useSaveManager();
  const { addComment: addCommentInternal, deleteComment: deleteCommentInternal, getCommentCount } = useCommentsManager();
  const singleFlight = useSingleFlight();

  /**
   * Toggle like with optimistic update
   */
  const toggleLike = async (
    postId: string,
    currentIsLiked?: boolean,
    onUpdate?: (isLiked: boolean, newCount: number) => void
  ): Promise<void> => {
    // 🔐 AUTH GATE: Valid Session Check
    checkSession();

    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    // Use explicit state if provided, otherwise fallback to internal manager state
    const wasLiked = currentIsLiked ?? isLikedInternal(postId);
    const optimisticCount = wasLiked ? -1 : 1;

    // Optimistic UI update
    if (onPostUpdate) {
      onPostUpdate(postId, {
        isLiked: !wasLiked,
        likeCount: (prev: number) => Math.max(0, prev + optimisticCount),
      });
    }

    // 🔐 NETWORK GATE: Pre-flight Check
    const isConnected = await checkNetworkStatus();
    if (!isConnected) {
      // Revert optimistic update immediately
      if (onPostUpdate) {
        onPostUpdate(postId, {
          isLiked: wasLiked,
          likeCount: (prev: number) => Math.max(0, prev - optimisticCount),
        });
      }
      throw new AppError('No internet connection', ErrorType.NETWORK);
    }

    // 🔐 2. SINGLE FLIGHT GUARD: Prevent race conditions
    // Use semantic key to block duplicate toggles for this specific post
    const result = await singleFlight.execute(`like:${postId}`, async () => {
      // 🔐 RE-CHECK SESSION inside lock (just in case)
      checkSession();

      try {
        // Pass explicit state to manager to ensure atomic toggle
        // 🔐 TIMEOUT: Wrap network call with 15s timeout
        await withTimeout(toggleLikeInternal(postId, wasLiked), 15000);

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
        // 🔐 ERROR: Normalize error
        throw AppError.fromError(error);
      }
    });
  };

  /**
   * Toggle save with optimistic update
   */
  const toggleSave = async (
    postId: string,
    currentIsSaved?: boolean,
    onUpdate?: (isSaved: boolean) => void
  ): Promise<void> => {
    // 🔐 AUTH GATE: Valid Session Check
    checkSession();

    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const wasSaved = currentIsSaved ?? isSavedInternal(postId);

    // Optimistic UI update
    if (onPostUpdate) {
      onPostUpdate(postId, {
        isSaved: !wasSaved,
      });
    }

    // 🔐 NETWORK GATE: Pre-flight Check
    const isConnected = await checkNetworkStatus();
    if (!isConnected) {
      if (onPostUpdate) {
        onPostUpdate(postId, { isSaved: wasSaved });
      }
      throw new AppError('No internet connection', ErrorType.NETWORK);
    }

    // 🔐 2. SINGLE FLIGHT GUARD
    await singleFlight.execute(`save:${postId}`, async () => {
      // 🔐 RE-CHECK SESSION inside lock
      checkSession();

      try {
        // 🔐 TIMEOUT: Wrap network call
        await withTimeout(toggleSaveInternal(postId, wasSaved), 15000);

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
        // 🔐 ERROR: Normalize error
        throw AppError.fromError(error);
      }
    });
  };

  /**
   * Add comment with optimistic update
   */
  const addComment = async (
    postId: string,
    text: string,
    onUpdate?: (newCount: number) => void
  ): Promise<void> => {
    // 🔐 AUTH GATE: Valid Session Check
    checkSession();

    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    // Optimistic UI update
    if (onPostUpdate) {
      onPostUpdate(postId, {
        commentCount: (prev: number) => prev + 1,
      });
    }

    // 🔐 NETWORK GATE
    const isConnected = await checkNetworkStatus();
    if (!isConnected) {
      if (onPostUpdate) {
        onPostUpdate(postId, {
          commentCount: (prev: number) => Math.max(0, prev - 1),
        });
      }
      throw new AppError('No internet connection. Cannot post comment.', ErrorType.NETWORK);
    }

    // 🔐 1. SINGLE FLIGHT GUARD (Comments)
    // Block duplicate submissions of the same text to the same post
    await singleFlight.execute(`comment:${postId}`, async () => {
      checkSession();

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
    });
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

