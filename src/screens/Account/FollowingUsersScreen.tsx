/**
 * FollowingScreen
 * Main screen for Following tab with exact layout order:
 * Header -> Suggestions (if no posts) -> Feed -> Suggestions (if end reached)
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';

// Create animated FlatList for native driver support
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);
import { usePostActions } from '../../utils/postActions';
import { useUnifiedFollow } from '../../hooks/useUnifiedFollow';
import { useAuth } from '../../providers/AuthProvider';
import { useUserRelations } from '../../providers/UserRelationProvider';
import { useHomeFeed } from '../../global/hooks/useHomeFeed';
import type { PostWithAuthor } from '../../global/services/posts/post.service';
import PostCard from '../../components/post/PostCard';
import FollowingSuggestions from '../../components/suggestions/FollowingSuggestions';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import PostSkeleton from '../../components/post/PostSkeleton';
import { useBlockedUsers } from '../../hooks/useBlockedUsers'; // V1 MODERATION

interface FollowingScreenProps {
  navigation?: any;
  onUserPress?: (userId: string) => void;
  onPostPress?: (post: any) => void;
  onScroll?: (...args: any[]) => void;
  headerHeight?: number;
}

export default function FollowingUsersScreen({ navigation, onUserPress, onPostPress, onScroll, headerHeight = 110 }: FollowingScreenProps) {
  const { user } = useAuth();
  const { following, refreshRelations } = useUserRelations();
  const { toggleFollow: handleFollowUser } = useUnifiedFollow();

  // Use global home feed hook for following feed
  const {
    feed: postsFromHook,
    loading,
    refreshing,
    hasMore,
    fetchMore,
    refresh,
  } = useHomeFeed(user?.uid, { feedType: 'following', limit: 10 });

  // V1 MODERATION: Filter blocked users from feed
  const { filterPosts } = useBlockedUsers(user?.uid);

  // Local state for post updates
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);

  // Sync posts from hook and apply blocked users filter
  useEffect(() => {
    // V1 MODERATION: Filter out posts from blocked users
    const filteredPosts = filterPosts(postsFromHook);
    setPosts(filteredPosts);
  }, [postsFromHook, filterPosts]);

  // Update post function
  const updatePost = useCallback((postId: string, updates: Partial<PostWithAuthor>) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  }, []);

  // Remove post function
  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  const postActions = usePostActions((postId: string, updates: any) => {
    const currentPost = posts.find(p => p.id === postId);
    if (currentPost) {
      const newUpdates: any = {};
      if (typeof updates.likeCount === 'function') {
        newUpdates.likeCount = updates.likeCount(currentPost.likeCount);
      } else if (updates.likeCount !== undefined) {
        newUpdates.likeCount = updates.likeCount;
      }
      if (typeof updates.commentCount === 'function') {
        newUpdates.commentCount = updates.commentCount(currentPost.commentCount);
      } else if (updates.commentCount !== undefined) {
        newUpdates.commentCount = updates.commentCount;
      }
      if (updates.isLiked !== undefined) {
        newUpdates.isLiked = updates.isLiked;
      }
      if (updates.isSaved !== undefined) {
        newUpdates.isSaved = updates.isSaved;
      }
      updatePost(postId, newUpdates);
    }
  });

  const handleLike = useCallback(async (postId: string, currentIsLiked?: boolean) => {
    try {
      await postActions.toggleLike(postId, currentIsLiked);
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  }, [postActions]);

  const handleSave = useCallback(async (postId: string, currentIsSaved?: boolean) => {
    try {
      await postActions.toggleSave(postId, currentIsSaved);
    } catch (error: any) {
      console.error('Error toggling save:', error);
    }
  }, [postActions]);

  const handleShare = useCallback(async (post: PostWithAuthor | any) => {
    try {
      await postActions.sharePost(post);
    } catch (error: any) {
      console.error('Error sharing post:', error);
    }
  }, [postActions]);

  const handleFollow = useCallback(async (targetUserId: string) => {
    try {
      await handleFollowUser(targetUserId);
      await refresh();
      await refreshRelations(user?.uid || '');
    } catch (error: any) {
      console.error('Error following user:', error);
    }
  }, [handleFollowUser, refresh, refreshRelations, user?.uid]);

  const handleViewAll = useCallback(() => {
    navigation?.navigate('SuggestionsScreen', { source: 'following' });
  }, [navigation]);

  const renderPost = useCallback(({ item }: { item: PostWithAuthor }) => {
    const authorId = item.authorId || item.userId || item.createdBy || item.ownerId || '';
    // Use item properties as source of truth
    const isLiked = item.isLiked ?? false;
    const isSaved = item.isSaved ?? false;
    const isOwnerFollowed = item.isFollowingAuthor ?? true; // In following feed, all should be followed
    // Following feed: never show Follow button (all posts are from followed users)
    const showFollowButton = false;

    // Create post object with author info and images for PostCard
    const postForCard = {
      ...item,
      username: item.authorUsername || 'Unknown',
      profilePhoto: item.authorAvatar,
      ownerAvatar: item.authorAvatar,
      avatarUri: item.authorAvatar,
      // Ensure imageURLs is available
      imageURLs: item.imageURLs || item.mediaUrls || [],
    };

    return (
      <PostCard
        post={postForCard as any}
        isLiked={isLiked}
        isSaved={isSaved}
        onLike={() => handleLike(item.id, isLiked)}
        onComment={() => {
          // CRITICAL: Navigate to Comments screen, NOT PostDetail
          // Comment icon must open comments view, not post feed
          navigation?.navigate('Comments', {
            postId: item.id,
          });
        }}
        onShare={() => handleShare(item as any)}
        onBookmark={() => handleSave(item.id, isSaved)}
        onProfilePress={() => onUserPress?.(authorId) || navigation?.navigate('ProfileScreen', { userId: authorId })}
        onPostDetailPress={() => {
          const postIndex = posts.findIndex((p) => p.id === item.id);
          onPostPress?.(item) || navigation?.navigate('PostDetail', {
            posts: posts as any,
            index: postIndex >= 0 ? postIndex : 0,
            postId: item.id
          });
        }}
        currentUserId={user?.uid}
        isFollowing={isOwnerFollowed}
        inForYou={false}
        enablePress={false}
        showFollowButton={showFollowButton}
        onFollow={handleFollow}
        onPostRemoved={removePost}
      />
    );
  }, [postActions, handleLike, handleSave, handleShare, navigation, posts, user?.uid, handleFollow, removePost, onUserPress, onPostPress]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchMore();
    }
  }, [hasMore, loading, fetchMore]);

  const postsEnded = !loading && !hasMore && posts.length > 0;
  const shouldShowSuggestions = true; // Always show suggestions if available

  if (loading && posts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: 10 }}>
          <PostSkeleton />
          <PostSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedFlatList
        data={posts}
        keyExtractor={(item: PostWithAuthor) => item.id}
        renderItem={renderPost}
        windowSize={8}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.brand.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: headerHeight + 20, paddingBottom: 20 }}
        ListFooterComponent={
          <>
            {postsEnded && (
              <View style={styles.postsEndedCard}>
                <Text style={styles.postsEndedText}>You're all caught up!</Text>
                <Text style={styles.postsEndedSubtext}>No more posts to show</Text>
              </View>
            )}
            <View style={styles.suggestionsWrapper}>
              <FollowingSuggestions
                onUserPress={onUserPress}
                onViewMore={handleViewAll}
                compact={true}
                showContactsCard={true}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          posts.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtext}>
                The people you follow haven't posted anything yet.
              </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: Fonts.semibold,
    color: Colors.black.secondary,
    fontSize: 16,
  },
  emptySubtext: {
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  postsEndedCard: {
    backgroundColor: Colors.white.primary,
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postsEndedText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  postsEndedSubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
  suggestionsWrapper: {
    width: '100%',
    marginTop: 10,
    paddingBottom: 0,
  },
});
