import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import AnimatedRN, {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
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
import { useRefreshController, useRefreshListener } from '../../hooks/useRefreshController';
import { RetryUI } from '../../components/common/RetryUI';
import { StoryFeed } from '../../components/story/StoryFeed';
import { ScreenLayout } from '../../components/layout/ScreenLayout';

// Create animated FlatList for native driver support
const AnimatedFlatList = AnimatedRN.Animated.createAnimatedComponent(FlatList as any);

/**
 * Home Feed Screen
 * 
 * 🔐 FIX: Resolved Tab Switch Remount Bug
 * 1. Persistent mounting of both feeds (display: none for hidden)
 * 2. Independent data hooks (For You hook does NOT depend on active tab)
 * 3. Preserve scroll position and image decode cache
 */
export default function HomeScreen({ navigation: navProp, route }: any) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { following, refreshRelations } = useUserRelations();
  const { toggleFollow: handleFollowUser } = useUnifiedFollow();
  const insets = useSafeAreaInsets();

  // 🔐 PERSISTENCE: State defined before hooks
  const [selectedTab, setSelectedTab] = useState<'For You' | 'Following'>('For You');
  const [unreadCounts, setUnreadCounts] = useState({ notifications: 0, messages: 0 });

  // 🔐 PERSISTENT HOOK 1: For You Feed (Stays mounted/active regardless of tab)
  const forYouFeed = useHomeFeed(user?.uid, {
    feedType: 'foryou',
    limit: 10
  });

  // Following feed is managed internally by FollowingUsersScreen

  // 🔐 CANONICAL REFRESH CONTROLLER
  const { state: refreshState, refresh, retry } = useRefreshController({
    fetchInitial: async () => {
      return forYouFeed.feed;
    },
    refresh: async () => {
      if (selectedTab === 'For You') {
        await forYouFeed.refresh();
      } else {
        // We could trigger Following feed refresh here if needed, 
        // but it usually has its own pull-to-refresh.
        await forYouFeed.refresh();
      }
      return forYouFeed.feed;
    },
  }, {
    refreshOnForeground: true,
    minRefreshInterval: 1000,
  });

  // 🔐 PROGRAMMATIC REFRESH LISTENER
  useRefreshListener('home', refresh);

  // V1 MODERATION: Filter blocked users
  const { filterPosts } = useBlockedUsers(user?.uid);

  // Local state for For You updates
  const [forYouPosts, setForYouPosts] = useState<PostWithAuthor[]>([]);

  // Sync For You posts
  useEffect(() => {
    const filtered = filterPosts(forYouFeed.feed);
    setForYouPosts(filtered);
  }, [forYouFeed.feed, filterPosts]);

  const updatePost = useCallback((postId: string, updates: Partial<PostWithAuthor>) => {
    setForYouPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  }, []);

  const removePost = useCallback((postId: string) => {
    setForYouPosts((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  // Post actions with optimistic updates
  const postActions = usePostActions((postId: string, updates: any) => {
    const currentPost = forYouPosts.find(p => p.id === postId);
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
      if (updates.isLiked !== undefined) newUpdates.isLiked = updates.isLiked;
      if (updates.isSaved !== undefined) newUpdates.isSaved = updates.isSaved;

      updatePost(postId, newUpdates);
    }
  });

  const { visible: rewardVisible, claimed, points, claiming: rewardClaiming, error: rewardError, grantReward, dismiss: dismissReward, showReward } = useRewardOnboarding(user?.uid);
  const { showAlert: showTopicAlert, onClaimNow: handleTopicClaimNow, onRemindLater: handleTopicRemindLater } = useTopicClaimReminder(user?.uid, navigation);

  const HEADER_HEIGHT = 225; // Adjusted to accommodate StoryFeed (approx 115px) + TopBar + Tabs
  const lastScrollY = useRef(0);
  const headerTranslateY = useSharedValue(0);
  const isHeaderVisible = useRef(true);

  // Reanimated style for the header
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: headerTranslateY.value }],
    };
  });

  const showHeader = useCallback(() => {
    if (!isHeaderVisible.current) {
      headerTranslateY.value = withTiming(0, { duration: 180 });
      isHeaderVisible.current = true;
    }
  }, []);

  const hideHeader = useCallback(() => {
    if (isHeaderVisible.current) {
      headerTranslateY.value = withTiming(-(HEADER_HEIGHT + insets.top), { duration: 180 });
      isHeaderVisible.current = false;
    }
  }, [insets.top]);

  const handleScroll = useCallback((event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    // 1. Always show if at very top (handles bounces)
    if (currentY <= 0) {
      showHeader();
    }
    // 2. Hide on scroll down (significant movement)
    else if (diff > 10) {
      hideHeader();
    }
    // 3. Show on scroll up (significant movement)
    else if (diff < -10) {
      showHeader();
    }

    lastScrollY.current = currentY;
  }, [showHeader, hideHeader]);

  // Notifications
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

  // Like / Save / Share
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
    } catch (error: any) {
      console.error('Error following user:', error);
    }
  }, [handleFollowUser]);

  const renderPost = useCallback(({ item }: { item: PostWithAuthor }) => {
    const authorId = item.authorId || item.userId || item.createdBy || item.ownerId || '';
    const isLiked = item.isLiked ?? false;
    const isSaved = item.isSaved ?? false;
    const isOwnerFollowed = item.isFollowingAuthor ?? false;
    const showFollowButton = !isOwnerFollowed && authorId !== user?.uid;

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
          navProp?.navigate('Comments', { postId: item.id });
        }}
        onShare={() => handleShare(item as any)}
        onBookmark={() => handleSave(item.id, isSaved)}
        onProfilePress={() => navProp?.navigate('ProfileScreen', { userId: authorId })}
        onPostDetailPress={() => {
          const postIndex = forYouPosts.findIndex((p) => p.id === item.id);
          navProp?.navigate('PostDetail', {
            posts: forYouPosts as any,
            index: postIndex >= 0 ? postIndex : 0,
            postId: item.id
          });
        }}
        currentUserId={user?.uid}
        isFollowing={isOwnerFollowed}
        inForYou={true}
        enablePress={false}
        showFollowButton={showFollowButton}
        onFollow={handleFollow}
        onPostRemoved={removePost}
      />
    );
  }, [handleLike, handleSave, handleShare, navProp, forYouPosts, user?.uid, handleFollow, removePost]);

  const keyExtractor = useCallback((item: PostWithAuthor) => item.id, []);

  const renderEmptyComponent = useMemo(() => (
    !forYouPosts || forYouPosts.length === 0 ? (
      <View style={{ paddingVertical: 100, alignItems: 'center' }}>
        <Text style={{ color: Colors.black.qua, fontFamily: Fonts.regular }}>No posts yet</Text>
      </View>
    ) : null
  ), [forYouPosts]);

  const handleLoadMore = useCallback(() => {
    if (forYouFeed.hasMore && !forYouFeed.loading) {
      forYouFeed.fetchMore();
    }
  }, [forYouFeed]);

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

  return (
    <ScreenLayout
      scrollable={false}
      includeBottomInset={false}
      includeTopInset={false} // 🔐 FIX: Prevent double padding with absolute header
      backgroundColor={Colors.white.secondary}
      keyboardAvoiding={false}
    >
      <Animated.View
        style={[
          styles.headerContainer,
          {
            paddingTop: insets.top,
          },
          headerAnimatedStyle,
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

        {/* REPOSITIONED: StoryFeed now lives in the sticky header, above tabs */}
        <StoryFeed />

        <View style={styles.sharedHeader}>
          <SegmentedControl
            selectedTab={selectedTab}
            onChange={(tab) => setSelectedTab(tab as 'For You' | 'Following')}
          />
        </View>
      </Animated.View>

      <View style={{ flex: 1 }}>
        {/* VIEWPORT 1: For You */}
        <View style={{ flex: 1, display: selectedTab === 'For You' ? 'flex' : 'none' }}>
          <AnimatedFlatList
            data={forYouPosts}
            keyExtractor={keyExtractor}
            renderItem={renderPost}
            windowSize={10}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            removeClippedSubviews={false}
            contentContainerStyle={{ paddingTop: HEADER_HEIGHT + insets.top + 20, paddingBottom: 20 }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshState.refreshing}
                onRefresh={refresh}
                tintColor={Colors.brand.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={null} // StoryFeed moved to header
            ListEmptyComponent={renderEmptyComponent}
          />
        </View>

        {/* VIEWPORT 2: Following */}
        <View style={{ flex: 1, display: selectedTab === 'Following' ? 'flex' : 'none' }}>
          <FollowingUsersScreen
            navigation={navProp}
            onUserPress={(userId) => navProp?.navigate('ProfileScreen', { userId })}
            onScroll={handleScroll}
            headerHeight={HEADER_HEIGHT + insets.top}
          />
        </View>
      </View>

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
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
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
});
