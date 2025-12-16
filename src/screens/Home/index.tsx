import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';
import { useUserRelations } from '../../providers/UserRelationProvider';
import { usePostActions } from '../../utils/postActions';
import { useUnifiedFollow } from '../../hooks/useUnifiedFollow';
import { useHomeFeed } from '../../global/hooks/useHomeFeed';
import PostCard from '../../components/post/PostCard';
import type { PostWithAuthor } from '../../global/services/posts/post.service';
import SegmentedControl from '../../components/common/SegmentedControl';
import { listenToUnreadCounts } from '../../services/notifications/notificationService';
import { useRewardOnboarding } from '../../hooks/useRewardOnboarding';
import RewardPopCard from '../../components/common/RewardPopCard';
import { useTopicClaimReminder } from '../../hooks/useTopicClaimReminder';
import TopicClaimAlert from '../../components/common/TopicClaimAlert';
import FollowingUsersScreen from '../Account/FollowingUsersScreen';
import PostSkeleton from '../../components/post/PostSkeleton';
import { useBlockedUsers } from '../../hooks/useBlockedUsers'; // V1 MODERATION

// Create animated FlatList for native driver support
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);

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
  const insets = useSafeAreaInsets();

  // State must be defined before useHomeFeed hook
  const [selectedTab, setSelectedTab] = useState<'For You' | 'Following'>('For You');

  // Use global home feed hook
  const {
    feed: posts,
    loading,
    refreshing,
    hasMore,
    fetchMore,
    refresh,
    type: feedType
  } = useHomeFeed(user?.uid, {
    feedType: selectedTab === 'For You' ? 'foryou' : 'following',
    limit: 10
  });

  // V1 MODERATION: Filter blocked users from feed
  const { filterPosts } = useBlockedUsers(user?.uid);

  // Local state for post updates
  const [postsState, setPostsState] = useState<PostWithAuthor[]>([]);

  // Sync posts from hook and apply blocked users filter
  useEffect(() => {
    // V1 MODERATION: Filter out posts from blocked users
    const filteredPosts = filterPosts(posts);
    setPostsState(filteredPosts);
  }, [posts, filterPosts]);

  // Update post function
  const updatePost = useCallback((postId: string, updates: Partial<PostWithAuthor>) => {
    setPostsState((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  }, []);

  // Remove post function
  const removePost = useCallback((postId: string) => {
    setPostsState((prev) => prev.filter((post) => post.id !== postId));
  }, []);

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

  /**
   * INSTAGRAM-STYLE COLLAPSING HEADER
   * 
   * Why scroll-driven animation:
   * - Provides fluid, responsive UX that feels native
   * - Maximizes content visibility on scroll
   * - No layout jumps or re-renders
   * 
   * Why translateY instead of hide/show:
   * - Smooth interpolation vs abrupt toggle
   * - GPU-accelerated transform
   * - Maintains layout stability (no height changes)
   * - Works seamlessly with native scroll events
   */
  const HEADER_HEIGHT = 110 + insets.top; // topBar (48) + sharedHeader (62) + safe area top
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  // Track scroll direction and animate header
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const delta = currentScrollY - lastScrollY.current;

        // Only animate if scrolled past threshold (avoid jitter at top)
        if (currentScrollY > 5) {
          if (delta > 0 && currentScrollY > 20) {
            // Scrolling down (content moving up) -> hide header smoothly
            Animated.timing(headerTranslateY, {
              toValue: -HEADER_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }).start();
          } else if (delta < -3) {
            // Scrolling up (content moving down) -> show header smoothly
            Animated.timing(headerTranslateY, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // At top of feed -> always show header
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }

        lastScrollY.current = currentScrollY;
      },
    }
  );

  const { visible: rewardVisible, claimed, points, claiming: rewardClaiming, error: rewardError, grantReward, dismiss: dismissReward, showReward } = useRewardOnboarding(user?.uid);
  const { showAlert: showTopicAlert, onClaimNow: handleTopicClaimNow, onRemindLater: handleTopicRemindLater } = useTopicClaimReminder(user?.uid, navigation);

  // Feed will auto-fetch via useHomeFeed hook

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

  // Use posts from state (synced from hook)
  const displayedPosts = useMemo(() => {
    return postsState;
  }, [postsState]);

  // Handle like with optimistic update
  const handleLike = useCallback(async (postId: string, currentIsLiked?: boolean) => {
    try {
      await postActions.toggleLike(postId, currentIsLiked, (isLiked, countDelta) => {
        // Update is handled by postActions callback
      });
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  }, [postActions]);

  // Handle save with optimistic update
  const handleSave = useCallback(async (postId: string, currentIsSaved?: boolean) => {
    try {
      await postActions.toggleSave(postId, currentIsSaved, (isSaved) => {
        // Update is handled by postActions callback
      });
    } catch (error: any) {
      console.error('Error toggling save:', error);
    }
  }, [postActions]);

  // Handle share
  const handleShare = useCallback(async (post: PostWithAuthor | any) => {
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
      // OPTIMISTIC UPDATE ONLY - DO NOT REFRESH FEED
      // await refresh(); 
      // await refreshRelations(user?.uid || '');
    } catch (error: any) {
      console.error('Error following user:', error);
    }
  }, [handleFollowUser, user?.uid]);

  const renderPost = useCallback(({ item }: { item: PostWithAuthor }) => {
    const authorId = item.authorId || item.userId || item.createdBy || item.ownerId || '';
    // Use item properties as source of truth (populated by useHomeFeed and updated locally)
    const isLiked = item.isLiked ?? false;
    const isSaved = item.isSaved ?? false;
    const isOwnerFollowed = item.isFollowingAuthor ?? false;
    const showFollowButton = !isOwnerFollowed && selectedTab === 'For You' && authorId !== user?.uid;

    // Create post object with author info for PostCard
    const postForCard = {
      ...item,
      username: item.authorUsername || 'Unknown',
      profilePhoto: item.authorAvatar,
      ownerAvatar: item.authorAvatar,
      avatarUri: item.authorAvatar,
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
          navProp?.navigate('Comments', {
            postId: item.id,
          });
        }}
        onShare={() => handleShare(item as any)}
        onBookmark={() => handleSave(item.id, isSaved)}
        onProfilePress={() => navProp?.navigate('ProfileScreen', { userId: authorId })}
        onPostDetailPress={() => {
          const postIndex = displayedPosts.findIndex((p) => p.id === item.id);
          navProp?.navigate('PostDetail', {
            posts: displayedPosts as any,
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
  }, [postActions, handleLike, handleSave, handleShare, navProp, displayedPosts, user?.uid, selectedTab, handleFollow, removePost]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchMore();
    }
  }, [hasMore, loading, fetchMore]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Header Container */}
      <Animated.View
        style={[
          styles.headerContainer,
          {
            paddingTop: insets.top,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
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


        <View style={styles.sharedHeader}>
          <SegmentedControl
            selectedTab={selectedTab}
            onChange={(tab) => setSelectedTab(tab as 'For You' | 'Following')}
          />
        </View>
      </Animated.View>

      {/* Feed Content */}
      {loading && posts.length === 0 ? (
        <View style={styles.skeletonContainer}>
          <PostSkeleton />
          <PostSkeleton />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {selectedTab === 'For You' ? (
            <AnimatedFlatList
              data={displayedPosts}
              keyExtractor={(item: PostWithAuthor) => item.id}
              renderItem={renderPost}
              windowSize={8}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews
              contentContainerStyle={{ paddingTop: HEADER_HEIGHT, paddingBottom: 400 }}
              getItemLayout={(data: any, index: number) => ({
                length: 600, // Approximate post height
                offset: 600 * index,
                index,
              })}
              onScroll={handleScroll}
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
            <FollowingUsersScreen
              navigation={navProp}
              onUserPress={(userId) => navProp?.navigate('ProfileScreen', { userId })}
              onPostPress={(post) => {
                const postIndex = posts.findIndex((p) => p.id === post.id);
                navProp?.navigate('PostDetail', {
                  posts: posts,
                  index: postIndex >= 0 ? postIndex : 0,
                  postId: post.id
                });
              }}
              onScroll={handleScroll}
              headerHeight={HEADER_HEIGHT}
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
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white.secondary },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white.secondary,
    zIndex: 1000,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
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
  skeletonContainer: {
    paddingTop: 10,
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
