import { useState, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import * as PostsAPI from '../services/posts/postsService';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatarUri?: string;
  text: string;
  timestamp: number;
  likeCount?: number;
  isLiked?: boolean;
}

interface UseCommentsManagerReturn {
  comments: Record<string, Comment[]>;
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<Comment>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  getCommentCount: (postId: string) => number;
}

/**
 * Global hook for managing post comments
 * Handles local state and syncs with API
 */
export function useCommentsManager(): UseCommentsManagerReturn {
  const { user } = useAuth();
  const [comments, setComments] = useState<Record<string, Comment[]>>({});

  const getCommentCount = useCallback((postId: string): number => {
    return comments[postId]?.length || 0;
  }, [comments]);

  const fetchComments = useCallback(async (postId: string): Promise<void> => {
    try {
      const fetchedComments = await PostsAPI.getComments(postId);
      setComments(prev => ({
        ...prev,
        [postId]: fetchedComments,
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  }, []);

  const addComment = useCallback(async (postId: string, text: string): Promise<Comment> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated to add comments');
    }

    try {
      const result = await PostsAPI.addComment(postId, user.uid, text);
      
      // Get user data for the comment
      const { getUserById } = await import('../../api/UsersAPI');
      const userData = await getUserById(user.uid);
      
      // Create optimistic comment
      const newComment: Comment = {
        id: result.commentId,
        postId,
        userId: user.uid,
        username: userData?.username || user.displayName || 'User',
        avatarUri: userData?.photoUrl,
        text,
        timestamp: Date.now(),
        likeCount: 0,
        isLiked: false,
      };
      
      // Optimistic update - add to local state immediately
      setComments(prev => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])],
      }));

      return newComment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }, [user?.uid]);

  const deleteComment = useCallback(async (postId: string, commentId: string): Promise<void> => {
    try {
      // Optimistic update - remove from local state immediately
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(comment => comment.id !== commentId),
      }));

      await PostsAPI.deleteComment(postId, commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
      // Rollback on error
      await fetchComments(postId);
      throw error;
    }
  }, [fetchComments]);

  return {
    comments,
    fetchComments,
    addComment,
    deleteComment,
    getCommentCount,
  };
}

