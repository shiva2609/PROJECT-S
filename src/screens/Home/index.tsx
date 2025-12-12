import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';
import { useUserRelations } from '../../providers/UserRelationProvider';
import { usePosts, Post } from '../../hooks/usePosts';
import { usePostActions } from '../../utils/postActions';
import { useUnifiedFollow } from '../../hooks/useUnifiedFollow';
import PostCard from '../../components/post/PostCard';
import SegmentedControl from '../../components/common/SegmentedControl';
import { listenToUnreadCounts } from '../../services/notifications/notificationService';
import { useRewardOnboarding } from '../../hooks/useRewardOnboarding';
import RewardPopCard from '../../components/common/RewardPopCard';
import { useTopicClaimReminder } from '../../hooks/useTopicClaimReminder';
import TopicClaimAlert from '../../components/common/TopicClaimAlert';
import FollowingScreen from '../Account/FollowingScreen';

/**
 * Home Feed Screen
 * 
 * Displays "For You" and "Following" feeds using unified hooks and components.
 * All post interactions use optimistic updates with backend sync.
 */
export default function HomeScreen({ navigation: navProp, route }: any) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { following, refreshRelations } = useUserRelations();
  const { toggleFollow: handleFollowUser } = useUnifiedFollow();
  
  // State must be defined before usePosts hook
  const [selectedTab, setSelectedTab] = useState<'For You' | 'Following'>('For You');
  
  // Unified posts hook with feed type
  const { 
    posts, 
    loading, 
    refreshing, 
    hasMore, 
    fetchMore, 
    refresh, 
    updatePost,
    removePost 
  } = usePosts({ feedType: selectedTab === 'For You' ? 'forYou' : 'following' });
  
  // Post actions with optimistic updates
  const postActions = usePostActions((postId: string, updates: any) => {
    // Apply optimistic updates to posts list
    const currentPost = posts.find(p => p.id === postId);
    if (currentPost) {
      const newUpdates: any = {};
      
      // Handle function-based updates (for counts)
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
  const [unreadCounts, setUnreadCounts] = useState({ notifications: 0, messages: 0 });
  
  const { visible: rewardVisible, claimed, points, claiming: rewardClaiming, error: rewardError, grantReward, dismiss: dismissReward, showReward } = useRewardOnboarding(user?.uid);
  const { showAlert: showTopicAlert, onClaimNow: handleTopicClaimNow, onRemindLater: handleTopicRemindLater } = useTopicClaimReminder(user?.uid, navigation);

  // Initial fetch on mount
  useEffect(() => {
    if (user?.uid && posts.length === 0 && !loading) {
      refresh().catch((error: any) => {
        console.error('Error fetching initial posts:', error);
      });
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen to unread counts
  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenToUnreadCounts(user.uid, (counts) => {
      setUnreadCounts(counts);
    });
    return () => unsubscribe();
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      const shouldShowReward = route?.params?.showReward || false;
      if (shouldShowReward && !claimed && user) {
        const timer = setTimeout(() => {
          showReward();
          if (navProp?.setParams) {
            navProp.setParams({ showReward: undefined });
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [claimed, user, showReward, route?.params, navProp])
  );

  // Posts are already filtered by usePosts hook based on feedType
  // For You: posts from users NOT followed
  // Following: posts from users followed
  const displayedPosts = useMemo(() => {
    return posts;
  }, [posts]);

  // Handle like with optimistic update
  const handleLike = useCallback(async (postId: string) => {
    try {
      await postActions.toggleLike(postId, (isLiked, countDelta) => {
        // Update is handled by postActions callback
      });
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  }, [postActions]);

  // Handle save with optimistic update
  const handleSave = useCallback(async (postId: string) => {
    try {
      await postActions.toggleSave(postId, (isSaved) => {
        // Update is handled by postActions callback
      });
    } catch (error: any) {
      console.error('Error toggling save:', error);
    }
  }, [postActions]);

  // Handle share
  const handleShare = useCallback(async (post: Post) => {
    try {
      await postActions.sharePost(post);
    } catch (error: any) {
      console.error('Error sharing post:', error);
    }
  }, [postActions]);

  const openDrawer = useCallback(() => {
    try {
      if (navProp) {
        const drawerNav = (navProp as any).getParent?.();
        if (drawerNav && typeof drawerNav.openDrawer === 'function') {
          drawerNav.openDrawer();
          return;
        }
      }
      navigation.dispatch(require('@react-navigation/native').DrawerActions.openDrawer());
    } catch (error) {
      console.error('Error opening drawer:', error);
    }
  }, [navProp, navigation]);

  const handleFollow = useCallback(async (targetUserId: string) => {
    try {
      await handleFollowUser(targetUserId);
      // Refresh feeds after follow/unfollow
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
    const showFollowButton = !isOwnerFollowed && selectedTab === 'For You' && authorId !== user?.uid;
    
    return (
      <PostCard
        post={item}
        isLiked={isLiked}
        isSaved={isSaved}
        onLike={() => handleLike(item.id)}
        onComment={() => {
          const postIndex = posts.findIndex((p) => p.id === item.id);
          navProp?.navigate('PostDetail', { 
            postId: item.id,
            posts: posts,
            index: postIndex >= 0 ? postIndex : 0,
          });
        }}
        onShare={() => handleShare(item)}
        onBookmark={() => handleSave(item.id)}
        onProfilePress={() => navProp?.push('ProfileScreen', { userId: authorId })}
        onPostDetailPress={() => {
          const postIndex = posts.findIndex((p) => p.id === item.id);
          navProp?.navigate('PostDetail', { 
            posts: posts, 
            index: postIndex >= 0 ? postIndex : 0,
            postId: item.id 
          });
        }}
        currentUserId={user?.uid}
        isFollowing={isOwnerFollowed}
        inForYou={selectedTab === 'For You'}
        showFollowButton={showFollowButton}
        onFollow={handleFollow}
        onPostRemoved={removePost}
      />
    );
  }, [postActions, handleLike, handleSave, handleShare, navProp, posts, user?.uid, selectedTab, following, handleFollow, removePost]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchMore();
    }
  }, [hasMore, loading, fetchMore]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.8} onPress={openDrawer}>
          <Icon name="menu" size={28} color={Colors.black.primary} />
        </TouchableOpacity>
        <View style={styles.topIcons}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navProp?.navigate('Notifications')}
            style={styles.topIconWrap}
          >
            <Icon name="notifications-outline" size={28} color={Colors.black.primary} />
            {unreadCounts.notifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCounts.notifications > 99 ? '99+' : String(unreadCounts.notifications)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navProp?.navigate('Chats')}
            style={styles.topIconWrap}
          >
            <Icon name="paper-plane-outline" size={28} color={Colors.black.primary} />
            {unreadCounts.messages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCounts.messages > 99 ? '99+' : String(unreadCounts.messages)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.sharedHeader}>
            <SegmentedControl
              selectedTab={selectedTab}
              onChange={(tab) => setSelectedTab(tab as 'For You' | 'Following')}
            />
          </View>

          {selectedTab === 'For You' ? (
            <FlatList
              data={displayedPosts}
              keyExtractor={(item) => item.id}
              renderItem={renderPost}
              windowSize={8}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews
              getItemLayout={(data, index) => ({
                length: 600, // Approximate post height
                offset: 600 * index,
                index,
              })}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={Colors.brand.primary}
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                !displayedPosts || displayedPosts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No posts yet, start exploring!</Text>
                    <Text style={styles.emptySub}>Follow explorers or create your first travel memory.</Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.exploreCta}
                      onPress={() => navProp?.navigate('Explore')}
                    >
                      <Text style={styles.exploreCtaText}>Explore Trips</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          ) : (
            <FollowingScreen
              navigation={navProp}
              onUserPress={(userId) => navProp?.push('ProfileScreen', { userId })}
              onPostPress={(post) => {
                const postIndex = posts.findIndex((p) => p.id === post.id);
                navProp?.navigate('PostDetail', { 
                  posts: posts, 
                  index: postIndex >= 0 ? postIndex : 0,
                  postId: post.id 
                });
              }}
            />
          )}
        </View>
      )}

      <RewardPopCard
        visible={rewardVisible}
        onClose={dismissReward}
        onClaim={async () => {
          try {
            await grantReward();
          } catch (error) {
            console.error('Error claiming reward:', error);
          }
        }}
        onViewWallet={() => navProp?.navigate('Explorer Wallet')}
        points={150}
        claiming={rewardClaiming}
        error={rewardError}
      />

      <TopicClaimAlert
        visible={showTopicAlert}
        onClaimNow={handleTopicClaimNow}
        onRemindLater={handleTopicRemindLater}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white.secondary },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  topIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.brand.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: { color: Colors.white.primary, fontSize: 10, fontFamily: Fonts.semibold },
  sharedHeader: { paddingVertical: 8, backgroundColor: Colors.white.secondary },
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
  emptySub: {
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  exploreCta: {
    marginTop: 12,
    backgroundColor: Colors.brand.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exploreCtaText: {
    color: Colors.white.primary,
    fontFamily: Fonts.semibold,
  },
});

