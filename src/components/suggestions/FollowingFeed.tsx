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
  const [refreshing, setRefreshing] = useState(false);

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

  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    const imageUrl = item.imageURL || item.coverImage || (item.gallery && item.gallery[0]);
    const likeCount = item.likeCount || 0;
    const commentCount = item.commentCount || 0;

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => onPostPress && onPostPress(item)}
        activeOpacity={0.9}
      >
        <View style={styles.postHeader}>
          <View style={styles.postAvatar}>
            <Text style={styles.postAvatarText}>
              {(item.username || item.createdBy || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.postUserInfo}>
            <Text style={styles.postUsername}>{item.username || item.createdBy || 'User'}</Text>
            {item.metadata?.location && (
              <Text style={styles.postLocation}>{item.metadata.location}</Text>
            )}
          </View>
        </View>

        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.postImage} />
        )}

        <View style={styles.postActions}>
          <View style={styles.actionLeft}>
            <View style={styles.actionBtn}>
              <Icon name="heart-outline" size={20} color={Colors.black.secondary} />
              <Text style={styles.actionText}>{likeCount}</Text>
            </View>
            <View style={styles.actionBtn}>
              <Icon name="chatbubble-ellipses-outline" size={20} color={Colors.black.secondary} />
              <Text style={styles.actionText}>{commentCount}</Text>
            </View>
            <View style={styles.actionBtn}>
              <Icon name="share-social-outline" size={20} color={Colors.black.secondary} />
            </View>
          </View>
        </View>

        {item.caption && (
          <Text style={styles.postCaption} numberOfLines={2}>
            <Text style={styles.captionUsername}>{item.username || 'User'}</Text>
            {' '}
            {item.caption}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Show loading state
  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.brand.primary} />
      </View>
    );
  }

  // Show empty state only if no following IDs (no one followed yet)
  // But still render container so suggestions can appear below
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

  // If inline mode, render posts as regular Views (for use in parent ScrollView)
  if (inline) {
    return (
      <View style={styles.inlineContainer}>
        {posts.map((post, index) => (
          <View key={post.id}>
            {renderPost({ item: post, index })}
          </View>
        ))}
        {hasMore && (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          </View>
        )}
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
