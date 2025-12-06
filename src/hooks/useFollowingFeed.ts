/**
 * useFollowingFeed Hook
 * Fetches and manages posts from followed users with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '../api/authService';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { chunkArray } from '../utils/suggestionUtils';
import { normalizePostAuthor, filterValidPosts, sortPostsByCreatedAt, getCreatedAtTimestamp } from '../utils/postUtils';

export interface Post {
  id: string;
  createdBy: string;
  userId?: string;
  username?: string;
  content?: string;
  caption?: string;
  imageURL?: string;
  coverImage?: string;
  gallery?: string[];
  media?: any[];
  likeCount?: number;
  commentCount?: number;
  createdAt: any;
  metadata?: {
    location?: string;
    [key: string]: any;
  };
}

/**
 * Hook for fetching posts from followed users
 */
export function useFollowingFeed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  // Fetch following IDs
  const fetchFollowingIds = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const followsRef = collection(db, 'follows');
      const q = query(followsRef, where('followerId', '==', user.uid));
      const snapshot = await getDocs(q);
      const ids = snapshot.docs.map(doc => doc.data().followingId);
      return ids;
    } catch (error: any) {
      console.warn('Firestore query error:', error.message || error);
      return [];
    }
  }, [user]);

  // Fetch posts from followed users
  const fetchPosts = useCallback(async (
    followingIds: string[],
    startAfterDoc?: QueryDocumentSnapshot | null
  ): Promise<{ posts: Post[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> => {
    if (followingIds.length === 0) {
      return { posts: [], lastDoc: null, hasMore: false };
    }

    try {
      // Firestore 'in' queries support max 10 values
      const chunks = chunkArray(followingIds, 10);
      const allPosts: Post[] = [];
      let lastDocumentFromQuery: QueryDocumentSnapshot | null = null;

      for (const chunk of chunks) {
        let q = query(
          collection(db, 'posts'),
          where('createdBy', 'in', chunk),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

        // Add pagination if provided
        if (startAfterDoc) {
          q = query(
            collection(db, 'posts'),
            where('createdBy', 'in', chunk),
            orderBy('createdAt', 'desc'),
            startAfter(startAfterDoc),
            limit(20)
          );
        }

        const snapshot = await getDocs(q);
        const chunkPosts = snapshot.docs
          .map(doc => {
            const data = doc.data();
            // Skip posts without createdAt
            if (!data.createdAt) {
              return null;
            }
            const normalized = normalizePostAuthor({
              id: doc.id,
              createdBy: data.createdBy || data.userId,
              userId: data.userId || data.createdBy,
              username: data.username,
              content: data.content,
              caption: data.caption,
              imageURL: data.imageURL,
              coverImage: data.coverImage,
              gallery: data.gallery,
              media: data.media,
              likeCount: data.likeCount || 0,
              commentCount: data.commentCount || 0,
              createdAt: data.createdAt,
              metadata: data.metadata,
              // CRITICAL: Preserve aspectRatio and ratio fields - these are set by the user during upload
              aspectRatio: data.aspectRatio,
              ratio: data.ratio,
              // Preserve all other fields that might be needed
              finalCroppedUrl: data.finalCroppedUrl,
              mediaUrls: data.mediaUrls,
              imageUrl: data.imageUrl,
            });
            return { post: normalized as Post, doc };
          })
          .filter((item): item is { post: Post; doc: QueryDocumentSnapshot } => item !== null);

        // Store last document from this chunk for pagination
        if (chunkPosts.length > 0) {
          lastDocumentFromQuery = chunkPosts[chunkPosts.length - 1].doc;
        }

        allPosts.push(...chunkPosts.map(item => item.post));
      }

      // Filter valid posts and remove duplicates
      const validPosts = filterValidPosts(allPosts);
      const uniquePosts = Array.from(
        new Map(validPosts.map(post => [post.id, post])).values()
      );
      
      // Sort by createdAt descending
      const sortedPosts = sortPostsByCreatedAt(uniquePosts);

        // Return first 20 posts, track if more available
        const returnedPosts = sortedPosts.slice(0, 20);
        const hasMorePosts = sortedPosts.length > 20 || (lastDocumentFromQuery !== null && sortedPosts.length === 20);
        
        return {
          posts: returnedPosts,
          lastDoc: lastDocumentFromQuery,
          hasMore: hasMorePosts,
        };
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
        return { posts: [], lastDoc: null, hasMore: false };
      }
      console.warn('Firestore query error:', error.message || error);
      return { posts: [], lastDoc: null, hasMore: false };
    }
  }, []);

  // Load initial posts
  const loadPosts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const ids = await fetchFollowingIds();
      setFollowingIds(ids);

      if (ids.length === 0) {
        setPosts([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const result = await fetchPosts(ids);
      console.log('📱 [useFollowingFeed] Loaded posts:', result.posts.length, 'posts from', ids.length, 'followed users');
      setPosts(result.posts);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
    } finally {
      setLoading(false);
    }
  }, [user, fetchFollowingIds, fetchPosts]);

  // Load more posts (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || followingIds.length === 0) return;

    setLoading(true);
    try {
      const result = await fetchPosts(followingIds, lastDoc);
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPosts = result.posts.filter(p => !existingIds.has(p.id));
        return sortPostsByCreatedAt([...prev, ...newPosts]);
      });
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, followingIds, lastDoc, fetchPosts]);

  // Set up real-time listener for follows
  useEffect(() => {
    if (!user) return;

    const followsRef = collection(db, 'follows');
    const q = query(followsRef, where('followerId', '==', user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const newFollowingIds = snapshot.docs.map(doc => doc.data().followingId);
      console.log('👥 [useFollowingFeed] Following IDs updated:', newFollowingIds.length, 'users');
      
      // Always update followingIds and reload posts when snapshot changes
      // This ensures posts are loaded even if followingIds was empty initially
      const idsChanged = newFollowingIds.length !== followingIds.length ||
          !newFollowingIds.every(id => followingIds.includes(id)) ||
          !followingIds.every(id => newFollowingIds.includes(id));
      
      if (idsChanged) {
        console.log('🔄 [useFollowingFeed] Following list changed, reloading posts...');
        setFollowingIds(newFollowingIds);
        // Reload posts with new following IDs
        if (newFollowingIds.length > 0) {
          setLoading(true);
          try {
            const result = await fetchPosts(newFollowingIds);
            console.log('📱 [useFollowingFeed] Loaded posts from listener:', result.posts.length, 'posts');
            setPosts(result.posts);
            setLastDoc(result.lastDoc);
            setHasMore(result.hasMore);
          } catch (error: any) {
            console.error('Error loading posts from listener:', error);
          } finally {
            setLoading(false);
          }
        } else {
          setPosts([]);
          setHasMore(false);
          setLoading(false);
        }
      }
    }, (error: any) => {
      // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
      if (error?.message?.includes('INTERNAL ASSERTION FAILED') || error?.message?.includes('Unexpected state')) {
        console.warn('⚠️ Firestore internal error (non-fatal, will retry):', error.message?.substring(0, 100));
        return;
      }
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
    });

    return () => unsubscribe();
  }, [user, fetchPosts]);

  // Initial load
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return {
    posts,
    loading,
    hasMore,
    loadMore,
    refresh: loadPosts,
    followingIds,
  };
}

