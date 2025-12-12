/**
 * FollowingScreen
 * Main screen for Following tab with exact layout order:
 * Header -> Suggestions (if no posts) -> Feed -> Suggestions (if end reached)
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { usePosts, Post } from '../../hooks/usePosts';
import { usePostActions } from '../../utils/postActions';
import { useUnifiedFollow } from '../../hooks/useUnifiedFollow';
import { useAuth } from '../../providers/AuthProvider';
import { useUserRelations } from '../../providers/UserRelationProvider';
import PostCard from '../../components/post/PostCard';
import FollowingSuggestions from '../../components/suggestions/FollowingSuggestions';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface FollowingScreenProps {
  navigation?: any;
  onUserPress?: (userId: string) => void;
  onPostPress?: (post: any) => void;
}

export default function FollowingScreen({ navigation, onUserPress, onPostPress }: FollowingScreenProps) {
  const { user } = useAuth();
  const { following, refreshRelations } = useUserRelations();
  const { toggleFollow: handleFollowUser } = useUnifiedFollow();
  
  const {
    posts,
    loading,
    refreshing,
    hasMore,
    fetchMore,
    refresh,
    updatePost,
    removePost,
  } = usePosts({ feedType: 'following' });
  
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

  const handleLike = useCallback(async (postId: string) => {
    try {
      await postActions.toggleLike(postId);
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  }, [postActions]);

  const handleSave = useCallback(async (postId: string) => {
    try {
      await postActions.toggleSave(postId);
    } catch (error: any) {
      console.error('Error toggling save:', error);
    }
  }, [postActions]);

  const handleShare = useCallback(async (post: Post) => {
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

  const renderPost = useCallback(({ item }: { item: Post }) => {
    const authorId = item.userId || item.createdBy || item.ownerId || '';
    const isLiked = postActions.isLiked(item.id);
    const isSaved = postActions.isSaved(item.id);
    const isOwnerFollowed = following.has(authorId);
    // Following feed: never show Follow button (all posts are from followed users)
    const showFollowButton = false;
    
    return (
      <PostCard
        post={item}
        isLiked={isLiked}
        isSaved={isSaved}
        onLike={() => handleLike(item.id)}
        onComment={() => {
          const postIndex = posts.findIndex((p) => p.id === item.id);
          navigation?.navigate('PostDetail', { 
            postId: item.id,
            posts: posts,
            index: postIndex >= 0 ? postIndex : 0,
          });
        }}
        onShare={() => handleShare(item)}
        onBookmark={() => handleSave(item.id)}
        onProfilePress={() => onUserPress?.(authorId) || navigation?.push('ProfileScreen', { userId: authorId })}
        onPostDetailPress={() => {
          const postIndex = posts.findIndex((p) => p.id === item.id);
          onPostPress?.(item) || navigation?.navigate('PostDetail', { 
            posts: posts, 
            index: postIndex >= 0 ? postIndex : 0,
            postId: item.id 
          });
        }}
        currentUserId={user?.uid}
        isFollowing={isOwnerFollowed}
        inForYou={false}
        showFollowButton={showFollowButton}
        onFollow={handleFollow}
        onPostRemoved={removePost}
      />
    );
  }, [postActions, handleLike, handleSave, handleShare, navigation, posts, user?.uid, following, handleFollow, removePost, onUserPress, onPostPress]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchMore();
    }
  }, [hasMore, loading, fetchMore]);

  const postsEnded = !loading && !hasMore && posts.length > 0;
  const shouldShowSuggestions = !loading;

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        windowSize={8}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.brand.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <>
            {postsEnded && (
              <View style={styles.postsEndedCard}>
                <Text style={styles.postsEndedText}>You're all caught up!</Text>
                <Text style={styles.postsEndedSubtext}>No more posts to show</Text>
              </View>
            )}
            {shouldShowSuggestions && (
              <View style={styles.suggestionsWrapper}>
                <FollowingSuggestions 
                  onUserPress={onUserPress}
                  compact={true}
                  showContactsCard={true}
                />
              </View>
            )}
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
  suggestionsWrapper: {
    width: '100%',
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
});
