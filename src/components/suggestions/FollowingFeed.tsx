/**
 * FollowingFeed Component
 * Pure feed component - displays posts from followed users only
 * No suggestions inside - suggestions handled by parent
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useFollowingFeed, Post } from '../../hooks/useFollowingFeed';
import { useAuth } from '../../contexts/AuthContext';
import { toggleLikePost, toggleBookmarkPost } from '../../api/firebaseService';
import { normalizePost } from '../../utils/postUtils';
import PostCard from '../PostCard';
// FollowingSuggestions removed - now handled by FollowingScreen
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import Icon from 'react-native-vector-icons/Ionicons';

interface FollowingFeedProps {
  onPostPress?: (post: Post) => void;
  onUserPress?: (userId: string) => void;
  showSuggestionsBelow?: boolean;
  inline?: boolean; // If true, render as Views instead of FlatList
}

export default function FollowingFeed({ 
  onPostPress, 
  onUserPress,
  showSuggestionsBelow = false,
  inline = false,
}: FollowingFeedProps) {
  const { posts, loading, hasMore, loadMore, refresh, followingIds } = useFollowingFeed();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  // Update liked/saved posts when posts change
  useEffect(() => {
    if (user) {
      const liked = new Set<string>();
      const saved = new Set<string>();
      posts.forEach((post) => {
        if ((post as any).likedBy?.includes(user.uid)) liked.add(post.id);
        if ((post as any).savedBy?.includes(user.uid)) saved.add(post.id);
      });
      setLikedPosts(liked);
      setSavedPosts(saved);
    }
  }, [posts, user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMore();
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      const isLiked = await toggleLikePost(postId, user.uid);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!user) return;
    try {
      const isSaved = await toggleBookmarkPost(postId, user.uid);
      setSavedPosts((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handlePostRemoved = (postId: string) => {
    // Optimistic: Remove post from feed immediately
    // This will be handled by the parent component's state management
    // For now, we'll rely on the real-time listener to update
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    if (!item || !item.id) {
      console.warn('⚠️ [FollowingFeed] Invalid post item at index', index, item);
      return null;
    }

    const isLiked = likedPosts.has(item.id);
    const isSaved = savedPosts.has(item.id);
    const postAuthorId = item.createdBy || item.userId;
    // In Following feed, all posts are from followed users
    const isFollowing = true;

    // CRITICAL: Convert Post to PostCard format using ONLY final cropped bitmaps
    // DO NOT use imageURL or imageUrl - those might be original images
    // Normalize post to get mediaUrls (contains final rendered bitmap URLs)
    const normalizedPost = normalizePost(item as any);
    const mediaUrls = normalizedPost.mediaUrls || [];
    
    // Build postCardData with ONLY final cropped bitmaps
    const postCardData = {
      ...item,
      // Use mediaUrls (final cropped bitmaps) or finalCroppedUrl
      // DO NOT fallback to imageURL or imageUrl - those might be original images
      finalCroppedUrl: (item as any).finalCroppedUrl || mediaUrls[0] || '',
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : ((item as any).finalCroppedUrl ? [(item as any).finalCroppedUrl] : []),
      // Legacy imageUrl field for backward compatibility (use final cropped bitmap)
      imageUrl: mediaUrls[0] || (item as any).finalCroppedUrl || '',
      // CRITICAL: Preserve aspectRatio and ratio - these determine the post card's display ratio
      aspectRatio: (item as any).aspectRatio,
      ratio: (item as any).ratio,
    };

    // Log for debugging
    if (index === 0 || index < 3) {
      console.log(`📱 [FollowingFeed] Rendering post ${index + 1}:`, {
        id: item.id,
        hasImage: !!(postCardData.mediaUrls?.length || postCardData.finalCroppedUrl),
        aspectRatio: postCardData.aspectRatio,
        ratio: postCardData.ratio,
        createdBy: item.createdBy || item.userId,
      });
    }

    return (
      <PostCard
        post={postCardData as any}
        isLiked={isLiked}
        isSaved={isSaved}
        onLike={() => handleLike(item.id)}
        onComment={() => onPostPress && onPostPress(item)}
        onShare={() => {}}
        onBookmark={() => handleBookmark(item.id)}
        onProfilePress={() => onUserPress && onUserPress(item.createdBy || item.userId || '')}
        onPostDetailPress={() => onPostPress && onPostPress(item)}
        currentUserId={user?.uid}
        isFollowing={isFollowing}
        inForYou={false} // Following feed is not "For You"
        onPostRemoved={handlePostRemoved}
      />
    );
  };

  // CRITICAL: Always render posts when they exist, regardless of loading state
  // Only show loading/empty states when there are truly no posts
  
  // If inline mode, render posts as regular Views (for use in parent ScrollView)
  if (inline) {
    console.log('📱 [FollowingFeed] Inline mode - posts:', posts.length, 'loading:', loading, 'followingIds:', followingIds.length);
    
    // Show loading only if no posts exist yet
    if (loading && posts.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      );
    }
    
    // Show empty state only if no following IDs (no one followed yet)
    if (followingIds.length === 0) {
      return (
        <View style={styles.inlineContainer}>
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={64} color={Colors.black.qua} />
            <Text style={styles.emptyTitle}>Start following people</Text>
            <Text style={styles.emptySubtext}>
              Follow people to see their posts in your feed
            </Text>
          </View>
        </View>
      );
    }
    
    // Show empty state if no posts but following someone
    if (posts.length === 0 && !loading) {
      return (
        <View style={styles.inlineContainer}>
          <View style={styles.emptyState}>
            <Icon name="images-outline" size={64} color={Colors.black.qua} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              The people you follow haven't posted anything yet.
            </Text>
          </View>
        </View>
      );
    }
    
    // CRITICAL: Always render posts when they exist
    console.log('📱 [FollowingFeed] Rendering inline mode:', posts.length, 'posts');
    return (
      <View style={styles.inlineContainer}>
        {posts.map((post, index) => {
          console.log(`📱 [FollowingFeed] Rendering post ${index + 1}:`, post.id, 'by', post.createdBy || post.userId);
          if (!post || !post.id) {
            console.warn('⚠️ [FollowingFeed] Invalid post at index', index);
            return null;
          }
          return (
            <View key={post.id || `post-${index}`}>
              {renderPost({ item: post, index })}
            </View>
          );
        })}
        {/* Show loading indicator only if loading more posts */}
        {loading && posts.length > 0 && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          </View>
        )}
        {/* Don't show "No more posts" here - it's shown in FollowingScreen as a card */}
      </View>
    );
  }

  // Non-inline mode (FlatList)
  // Show loading state
  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  // Show empty state only if no following IDs (no one followed yet)
  if (followingIds.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={64} color={Colors.black.qua} />
          <Text style={styles.emptyTitle}>Start following people</Text>
          <Text style={styles.emptySubtext}>
            Follow people to see their posts in your feed
          </Text>
        </View>
      </View>
    );
  }

  // Show empty state if no posts but following someone
  if (posts.length === 0 && !loading) {
    return (
      <View style={styles.emptyState}>
        <Icon name="images-outline" size={64} color={Colors.black.qua} />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySubtext}>
          The people you follow haven't posted anything yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={Colors.brand.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  inlineContainer: {
    backgroundColor: Colors.white.secondary,
    width: '100%',
    // Ensure container takes up space and allows scrolling
    minHeight: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    backgroundColor: Colors.white.primary,
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postAvatarText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white.primary,
  },
  postUserInfo: {
    flex: 1,
  },
  postUsername: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  postLocation: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.white.tertiary,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.black.secondary,
  },
  postCaption: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    lineHeight: 20,
  },
  captionUsername: {
    fontFamily: Fonts.semibold,
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  endIndicator: {
    padding: 20,
    alignItems: 'center',
  },
  endIndicatorText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  // Removed suggestionsBelow styles - suggestions now handled by FollowingScreen
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
});
