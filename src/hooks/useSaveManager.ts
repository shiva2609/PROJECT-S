import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { toggleSavePost as toggleSaveInteraction } from '../global/services/posts/post.interactions.service';

interface UseSaveManagerReturn {
  savedPosts: Set<string>;
  toggleSave: (postId: string, currentIsSaved?: boolean) => Promise<void>;
  isSaved: (postId: string) => boolean;
}

/**
 * Global hook for managing saved posts
 * Handles optimistic updates
 */
export function useSaveManager(): UseSaveManagerReturn {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());

  const isSaved = useCallback((postId: string): boolean => {
    return savedPosts.has(postId);
  }, [savedPosts]);

  const toggleSave = useCallback(async (postId: string, currentIsSaved?: boolean): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated to save posts');
    }

    // Prevent double-tapping
    if (processingRef.current.has(postId)) {
      return;
    }

    const wasSaved = currentIsSaved ?? savedPosts.has(postId);

    // Optimistic update - update UI instantly
    setSavedPosts(prev => {
      const newSet = new Set(prev);
      if (wasSaved) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    processingRef.current.add(postId);

    try {
      // Use explicit intent (shouldSave = !wasSaved)
      await toggleSaveInteraction(postId, user.uid, !wasSaved);
    } catch (error) {
      // Rollback optimistic update on error
      setSavedPosts(prev => {
        const newSet = new Set(prev);
        if (wasSaved) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });
      console.error('Error toggling save:', error);
      throw error;
    } finally {
      processingRef.current.delete(postId);
    }
  }, [savedPosts, user?.uid]);

  return {
    savedPosts,
    toggleSave,
    isSaved,
  };
}

