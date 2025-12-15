/**
 * Unified Posts Hook
 * 
 * Centralized hook for fetching and managing posts feed.
 * Replaces usePostFetcher with better error handling and state management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useUserRelations } from '../providers/UserRelationProvider';
import * as PostsAPI from '../services/posts/postsService';
import * as FeedService from '../services/feed/feedService';
import { normalizePost } from '../utils/postUtils';
import * as UsersAPI from '../services/users/usersService';

export interface Post {
  id: string;
  userId: string;
  createdBy: string;
  ownerId: string; // Alias for userId/createdBy
  username: string;
  ownerUsername: string; // Alias for username
  profilePhoto?: string;
  ownerAvatar?: string; // Alias for profilePhoto
  avatarUri?: string;
  isVerified?: boolean;
  caption?: string;
  mediaUrls?: string[];
  media?: Array<{ uri: string; type: 'image' | 'video'; id?: string }>;
  imageUrl?: string;
  mediaUrl?: string;
  likeCount: number;
  likesCount: number; // Alias for likeCount
  commentCount: number;
  commentsCount: number; // Alias for commentCount
  shareCount: number;
  createdAt: number;
  aspectRatio?: number;
  ratio?: string;
  location?: string;
  placeName?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  isOwnerFollowed?: boolean; // Whether current user follows post owner
  showFollowButton?: boolean; // Computed: !isOwnerFollowed && feedType === 'forYou'
}

interface UsePostsOptions {
  feedType?: 'forYou' | 'following';
}

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  hasMore: boolean;
  fetchInitial: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
}

const POSTS_PER_PAGE = 10;

/**
 * Unified hook for fetching and managing posts
 * Supports both For You and Following feeds
 */
export function usePosts(options?: UsePostsOptions): UsePostsReturn {
  const feedType = options?.feedType || 'forYou';
  const { user } = useAuth();
  const { following } = useUserRelations();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [userMap, setUserMap] = useState<Record<string, UsersAPI.User>>({});
  
  const processingRef = useRef<boolean>(false);

  /**
   * Enrich posts with user data
   */
  const enrichPostsWithUserData = useCallback(async (rawPosts: any[]): Promise<Post[]> => {
    const userIds = new Set<string>();
    rawPosts.forEach(post => {
      const authorId = post.userId || post.authorId || post.createdBy || '';
      if (authorId) userIds.add(authorId);
    });

    // Fetch all user data (we'll update userMap after)
    const userPromises = Array.from(userIds).map(async (userId) => {
      try {
        const userData = await UsersAPI.getUserById(userId);
        return userData ? { userId, userData } : null;
      } catch (error: any) {
        console.error(`Error fetching user ${userId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(userPromises);
    const fetchedUserMap: Record<string, UsersAPI.User> = {};
    results.forEach(result => {
      if (result) {
        fetchedUserMap[result.userId] = result.userData;
      }
    });

    // Update userMap state
    setUserMap(prev => ({ ...prev, ...fetchedUserMap }));

    // Use fetched data for enrichment
    const combinedUserMap = { ...userMap, ...fetchedUserMap };

    // Normalize and enrich posts with error handling
    const enrichedPosts: Post[] = [];
    
    for (const rawPost of rawPosts) {
      try {
        // Skip invalid posts
        if (!rawPost || !rawPost.id) {
          console.warn('Skipping invalid post:', rawPost);
          continue;
        }

        const authorId = rawPost.userId || rawPost.authorId || rawPost.createdBy || '';
        const userData = combinedUserMap[authorId] || {};
        
        // Safely normalize post - handle cases where normalizePost might fail
        let normalized: any;
        try {
          normalized = normalizePost(rawPost);
        } catch (error) {
          console.error('Error normalizing post:', error, rawPost);
          normalized = rawPost; // Fallback to raw post
        }

      // Handle timestamp
      let timestamp: number;
      if (rawPost.createdAt?.toMillis) {
        timestamp = rawPost.createdAt.toMillis();
      } else if (rawPost.createdAt?.seconds) {
        timestamp = rawPost.createdAt.seconds * 1000;
      } else if (typeof rawPost.createdAt === 'number') {
        timestamp = rawPost.createdAt;
      } else {
        timestamp = Date.now();
      }

      // Normalize media - handle all possible formats with comprehensive fallbacks
      // Priority: mediaUrls > finalCroppedUrl > media array > mediaUrl > imageUrl > photoUrl > files[0].url
      const safeMediaUrls = Array.isArray(normalized?.mediaUrls)
        ? normalized.mediaUrls.filter((url: any) => url && typeof url === 'string' && url.length > 0)
        : [];

      // Safely normalize media array with comprehensive null checks
      let safeMedia: Array<{ type: 'image' | 'video'; uri: string; id: string }> = [];
      
      try {
        // Priority 1: Use mediaUrls if available
        if (safeMediaUrls.length > 0) {
          safeMedia = safeMediaUrls.map((url: string, index: number) => ({
            type: 'image' as const,
            uri: url,
            id: `media-url-${index}`,
          }));
        }
        // Priority 2: Check finalCroppedUrl
        else if ((normalized as any)?.finalCroppedUrl && typeof (normalized as any).finalCroppedUrl === 'string') {
          safeMedia = [{
            type: 'image' as const,
            uri: (normalized as any).finalCroppedUrl,
            id: 'final-cropped-url',
          }];
        }
        // Priority 3: Check media array (filter out undefined items)
        else if (Array.isArray(normalized?.media) && normalized.media.length > 0) {
          safeMedia = normalized.media
            .filter((item: any) => item != null && typeof item === 'object')
            .map((item: any, index: number) => {
              try {
                const uri = item?.uri || item?.url;
                if (uri && typeof uri === 'string' && uri.length > 0) {
                  return {
                    type: (item?.type === 'video' ? 'video' : 'image') as 'image' | 'video',
                    uri: uri,
                    id: (item?.id && typeof item.id === 'string') ? item.id : `media-${index}`,
                  };
                }
                return null;
              } catch (error) {
                console.warn('Error processing media item:', error, item);
                return null;
              }
            })
            .filter((item: any): item is { type: 'image' | 'video'; uri: string; id: string } => 
              item !== null && item.uri && item.uri.length > 0
            );
        }
        // Priority 4: Check mediaUrl (single string)
        else if ((normalized as any)?.mediaUrl && typeof (normalized as any).mediaUrl === 'string') {
          safeMedia = [{
            type: 'image' as const,
            uri: (normalized as any).mediaUrl,
            id: 'media-url',
          }];
        }
        // Priority 5: Check imageUrl (legacy field)
        else if ((normalized as any)?.imageUrl && typeof (normalized as any).imageUrl === 'string') {
          safeMedia = [{
            type: 'image' as const,
            uri: (normalized as any).imageUrl,
            id: 'image-url',
          }];
        }
        // Priority 6: Check photoUrl
        else if ((normalized as any)?.photoUrl && typeof (normalized as any).photoUrl === 'string') {
          safeMedia = [{
            type: 'image' as const,
            uri: (normalized as any).photoUrl,
            id: 'photo-url',
          }];
        }
        // Priority 7: Check files[0]?.url
        else if (Array.isArray((normalized as any)?.files) && (normalized as any).files.length > 0) {
          const fileUrl = (normalized as any).files[0]?.url || (normalized as any).files[0]?.uri;
          if (fileUrl && typeof fileUrl === 'string' && fileUrl.length > 0) {
            safeMedia = [{
              type: 'image' as const,
              uri: fileUrl,
              id: 'file-url',
            }];
          }
        }
        // Priority 8: Check rawPost directly (fallback for unnormalized data)
        else {
          const rawMediaUrl = rawPost.mediaUrl || rawPost.imageUrl || rawPost.photoUrl;
          if (rawMediaUrl && typeof rawMediaUrl === 'string' && rawMediaUrl.length > 0) {
            safeMedia = [{
              type: 'image' as const,
              uri: rawMediaUrl,
              id: 'raw-media-url',
            }];
          }
        }
      } catch (error) {
        console.error('Error normalizing media:', error, normalized);
        safeMedia = [];
      }

        // Ensure mediaUrls is populated from safeMedia
        const finalMediaUrls = safeMedia.length > 0 
          ? safeMedia.map(m => m.uri)
          : (safeMediaUrls.length > 0 ? safeMediaUrls : []);

        // Check if owner is followed (for For You feed logic)
        const isOwnerFollowed = following.has(authorId);
        const showFollowButton = !isOwnerFollowed && feedType === 'forYou' && authorId !== user?.uid;

        const enrichedPost: Post = {
          id: rawPost.id || '',
          userId: authorId,
          createdBy: authorId,
          ownerId: authorId, // Alias
          username: userData.username || rawPost.username || 'Unknown',
          ownerUsername: userData.username || rawPost.username || 'Unknown', // Alias
          profilePhoto: userData.photoUrl || rawPost.profilePhoto || rawPost.avatarUri || '',
          ownerAvatar: userData.photoUrl || rawPost.profilePhoto || rawPost.avatarUri || '', // Alias
          avatarUri: userData.photoUrl || rawPost.profilePhoto || rawPost.avatarUri || '',
          isVerified: userData.verified || rawPost.verified || false,
          caption: rawPost.caption || '',
          likeCount: Math.max(0, rawPost.likeCount || 0),
          likesCount: Math.max(0, rawPost.likeCount || 0), // Alias
          commentCount: Math.max(0, rawPost.commentCount || 0),
          commentsCount: Math.max(0, rawPost.commentCount || 0), // Alias
          shareCount: Math.max(0, rawPost.shareCount || 0),
          createdAt: timestamp,
          aspectRatio: rawPost.aspectRatio || normalized?.aspectRatio,
          ratio: rawPost.ratio || normalized?.ratio,
          location: rawPost.location || rawPost.placeName || '',
          placeName: rawPost.placeName || rawPost.location || '',
          mediaUrls: finalMediaUrls,
          media: safeMedia,
          imageUrl: finalMediaUrls[0] || rawPost.imageUrl || '',
          mediaUrl: finalMediaUrls[0] || rawPost.mediaUrl || '',
          isOwnerFollowed,
          showFollowButton,
        };
        
        // Ensure posts array is never undefined
        if (enrichedPost && enrichedPost.id) {
          enrichedPosts.push(enrichedPost);
        }
      } catch (error) {
        console.error('Error enriching post:', error, rawPost);
        // Skip this post and continue with others
      }
    }
    
    return enrichedPosts;
  }, [userMap, following, feedType, user?.uid]);

  /**
   * Fetch initial posts
   */
  const fetchInitial = useCallback(async (): Promise<void> => {
    if (processingRef.current || loading) return;
    if (!user?.uid) return;

    processingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let result;
      if (feedType === 'forYou') {
        result = await FeedService.getForYouPosts(user.uid, following, POSTS_PER_PAGE, null);
      } else {
        result = await FeedService.getFollowingPosts(user.uid, following, POSTS_PER_PAGE, null);
      }

      const enrichedPosts = await enrichPostsWithUserData(result.posts);
      setPosts(enrichedPosts);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error: any) {
      console.error('Error fetching initial posts:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch posts'));
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [user?.uid, loading, enrichPostsWithUserData, feedType, following]);

  /**
   * Fetch more posts (pagination)
   */
  const fetchMore = useCallback(async (): Promise<void> => {
    if (processingRef.current || loading || !hasMore || !lastDoc) return;
    if (!user?.uid) return;

    processingRef.current = true;
    setLoading(true);

    try {
      let result;
      if (feedType === 'forYou') {
        result = await FeedService.getForYouPosts(user.uid, following, POSTS_PER_PAGE, lastDoc);
      } else {
        result = await FeedService.getFollowingPosts(user.uid, following, POSTS_PER_PAGE, lastDoc);
      }

      const enrichedPosts = await enrichPostsWithUserData(result.posts);
      setPosts(prev => [...prev, ...enrichedPosts]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error: any) {
      console.error('Error fetching more posts:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch more posts'));
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [user?.uid, loading, hasMore, lastDoc, enrichPostsWithUserData, feedType, following]);

  /**
   * Refresh posts
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (processingRef.current || refreshing) return;
    if (!user?.uid) return;

    processingRef.current = true;
    setRefreshing(true);
    setError(null);

    try {
      let result;
      if (feedType === 'forYou') {
        result = await FeedService.getForYouPosts(user.uid, following, POSTS_PER_PAGE, null);
      } else {
        result = await FeedService.getFollowingPosts(user.uid, following, POSTS_PER_PAGE, null);
      }

      const enrichedPosts = await enrichPostsWithUserData(result.posts);
      setPosts(enrichedPosts);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error: any) {
      console.error('Error refreshing posts:', error);
      setError(error instanceof Error ? error : new Error('Failed to refresh posts'));
    } finally {
      setRefreshing(false);
      processingRef.current = false;
    }
  }, [user?.uid, refreshing, enrichPostsWithUserData, feedType, following]);

  /**
   * Update a post in the list (optimistic update)
   */
  const updatePost = useCallback((postId: string, updates: Partial<Post>): void => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, ...updates } : post
    ));
  }, []);

  /**
   * Remove a post from the list
   */
  const removePost = useCallback((postId: string): void => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  }, []);

  // Auto-fetch on mount and when following list changes
  useEffect(() => {
    if (user?.uid) {
      fetchInitial().catch((error: any) => {
        console.error('Error fetching initial posts on mount:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, following.size]); // Refresh when following list changes

  return {
    posts,
    loading,
    refreshing,
    error,
    hasMore,
    fetchInitial,
    fetchMore,
    refresh,
    updatePost,
    removePost,
  };
}

