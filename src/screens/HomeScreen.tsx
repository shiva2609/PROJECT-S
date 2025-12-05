import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../utils/colors';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { db } from '../api/authService';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import SegmentedControl from '../components/SegmentedControl';
import { useAuth } from '../contexts/AuthContext';
import { MotiView } from '../utils/moti';
import { LinearGradient } from '../utils/gradient';
import { listenToUnreadCounts } from '../api/notificationService';
import { useRewardOnboarding } from '../hooks/useRewardOnboarding';
import RewardPopCard from '../components/RewardPopCard';
import { useTopicClaimReminder } from '../hooks/useTopicClaimReminder';
import TopicClaimAlert from '../components/TopicClaimAlert';
import FollowingScreen from './FollowingScreen';
import { toggleLikePost, toggleBookmarkPost, toggleSharePost, Post } from '../api/firebaseService';
import { formatTimestamp, parseHashtags, CaptionPart } from '../utils/postHelpers';
import PostCard from '../components/PostCard';

interface StoryDoc { id: string; userId: string; media?: string; location?: string; profilePhoto?: string; username?: string; }

export default function HomeScreen({ navigation: navProp, route }: any) {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const openDrawer = React.useCallback(() => {
    try {
      if (navProp) {
        const drawerNav = (navProp as any).getParent?.();
        if (drawerNav && typeof drawerNav.openDrawer === 'function') {
          drawerNav.openDrawer();
          return;
        }
      }
      
      let currentNav = navigation as any;
      for (let i = 0; i < 3; i++) {
        const parent = currentNav?.getParent?.();
        if (parent && typeof parent.openDrawer === 'function') {
          parent.openDrawer();
          return;
        }
        if (!parent) break;
        currentNav = parent;
      }
      
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (error) {
      console.error('Error opening drawer:', error);
    }
  }, [navProp, navigation]);

  const [stories, setStories] = useState<StoryDoc[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'For You' | 'Following'>('For You');
  const [unreadCounts, setUnreadCounts] = useState({ notifications: 0, messages: 0 });
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set()); // Track posts being liked

  const { visible: rewardVisible, claimed, points, claiming: rewardClaiming, error: rewardError, grantReward, dismiss: dismissReward, showReward } = useRewardOnboarding(user?.uid);
  const { showAlert: showTopicAlert, onClaimNow: handleTopicClaimNow, onRemindLater: handleTopicRemindLater } = useTopicClaimReminder(user?.uid, navigation);

  // Real-time listener for posts
  useEffect(() => {
    if (!user) return;

    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData: Post[] = snapshot.docs
        .filter((d) => {
          const data = d.data();
          return !!data.createdAt;
        })
        .map((d) => ({ id: d.id, ...(d.data() as any) } as Post));
      
      setPosts(postsData);
      
      // Update liked and saved posts sets
      if (user) {
        const liked = new Set<string>();
        const saved = new Set<string>();
        postsData.forEach((post) => {
          if (post.likedBy?.includes(user.uid)) liked.add(post.id);
          if (post.savedBy?.includes(user.uid)) saved.add(post.id);
        });
        setLikedPosts(liked);
        setSavedPosts(saved);
      }
      
      setLoading(false);
    }, (error: any) => {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to stories
  useEffect(() => {
    const storiesQuery = query(collection(db, 'stories'));
    const unsubscribe = onSnapshot(storiesQuery, (snapshot) => {
      setStories(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsubscribe();
  }, []);

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

  const handleLike = async (postId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to like posts');
      return;
    }
    
    // Prevent multiple simultaneous like operations on the same post
    if (likingPosts.has(postId)) {
      return; // Already processing, ignore
    }
    
    try {
      setLikingPosts((prev) => new Set(prev).add(postId));
      const isLiked = await toggleLikePost(postId, user.uid);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (error: any) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', error.message || 'Failed to like post');
    } finally {
      setLikingPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleBookmark = async (postId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to save posts');
      return;
    }
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
      Alert.alert('Error', error.message || 'Failed to save post');
    }
  };

  const handleShare = async (post: Post) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to share posts');
      return;
    }
    try {
      // Toggle share count
      await toggleSharePost(post.id, user.uid);
      
      // Also use native share
      const imageUrl = post.media?.[0]?.uri || post.imageUrl || '';
      const result = await Share.share({
        message: `${post.caption || 'Check out this post!'}${imageUrl ? `\n${imageUrl}` : ''}`,
        url: imageUrl,
      });
      if (result.action === Share.sharedAction) {
        console.log('Post shared successfully');
      }
    } catch (error: any) {
      console.error('Error sharing post:', error);
    }
  };

  const handleHashtagPress = (hashtag: string) => {
    // Navigate to hashtag search/explore
    navProp?.navigate('Explore', { hashtag: hashtag.substring(1) });
  };

  const hasStories = stories && stories.length > 0;
  const storyData = useMemo(() => [{ id: 'your-story', isYou: true, userId: user?.uid } as any, ...stories], [stories, user]);

  const renderCaption = (caption: string) => {
    if (!caption) return null;
    const parts = parseHashtags(caption);
    return (
      <View style={styles.captionContainer}>
        <Text style={styles.captionText}>
          {parts.map((part, index) => {
            if (part.isHashtag) {
              return (
                <Text
                  key={index}
                  style={styles.hashtag}
                  onPress={() => handleHashtagPress(part.text)}
                >
                  {part.text}
                </Text>
              );
            }
            return <Text key={index}>{part.text}</Text>;
          })}
        </Text>
      </View>
    );
  };

  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    const isLiked = likedPosts.has(item.id);
    const isSaved = savedPosts.has(item.id);

    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ delay: index * 40, type: 'timing', duration: 220 }}
      >
        <PostCard
          post={item}
          isLiked={isLiked}
          isSaved={isSaved}
          onLike={() => handleLike(item.id)}
          onComment={() => navProp?.navigate('Comments', { postId: item.id })}
          onShare={() => handleShare(item)}
          onBookmark={() => handleBookmark(item.id)}
          onProfilePress={() => navProp?.navigate('Profile', { userId: item.createdBy || item.userId })}
          onPostDetailPress={() => navProp?.navigate('PostDetail', { postId: item.id })}
          currentUserId={user?.uid}
        />
      </MotiView>
    );
  };

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

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Top Stories Row */}
          <View style={styles.sharedHeader}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={storyData}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingLeft: 20, paddingRight: 12, paddingBottom: 8 }}
              renderItem={({ item, index }) => {
                const hasStory = !item.isYou || (item.media && item.media.length > 0);
                return (
                  <View style={styles.storyItem}>
                    {hasStory ? (
                      <LinearGradient
                        colors={[Colors.brand.primary, Colors.brand.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.storyRing}
                      >
                        {item.profilePhoto ? (
                          <Image source={{ uri: item.profilePhoto }} style={styles.storyAvatar} />
                        ) : (
                          <View style={styles.storyAvatar}>
                            <Icon name="person" size={28} color={Colors.black.qua} />
                          </View>
                        )}
                      </LinearGradient>
                    ) : (
                      <View style={[styles.storyRing, styles.storyRingInactive]}>
                        <View style={styles.storyAvatar}>
                          <Icon name="person" size={28} color={Colors.black.qua} />
                        </View>
                      </View>
                    )}
                    {item.isYou && (
                      <View style={styles.storyAdd}>
                        <Icon name="add" size={12} color="white" />
                      </View>
                    )}
                    <Text style={styles.storyText} numberOfLines={1}>
                      {item.isYou ? 'Your story' : (item.location || item.username || 'Story')}
                    </Text>
                  </View>
                );
              }}
            />

            {/* For You / Following Toggle */}
            <SegmentedControl
              selectedTab={selectedTab}
              onChange={(tab) => setSelectedTab(tab as 'For You' | 'Following')}
            />
          </View>

          {/* Tab Content */}
          {selectedTab === 'For You' ? (
            <FlatList
              data={posts}
              keyExtractor={(i) => i.id}
              renderItem={renderPost}
              windowSize={8}
              initialNumToRender={5}
              removeClippedSubviews
              ListEmptyComponent={
                !posts || posts.length === 0 ? (
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
              onUserPress={(userId) => navProp?.navigate('Profile', { userId })}
              onPostPress={(post) => {
                navProp?.navigate('PostDetail', { postId: post.id });
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
            Alert.alert('🎉 Reward Claimed!', `You've successfully claimed ${150} Explorer Points!`, [{ text: 'OK' }]);
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
  storyItem: { alignItems: 'center', marginRight: 16, width: 68 },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 2,
    borderWidth: 2,
    borderColor: Colors.white.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyRingInactive: { borderColor: Colors.white.tertiary },
  storyAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.white.tertiary },
  storyAdd: {
    position: 'absolute',
    right: -2,
    bottom: 20,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white.secondary,
  },
  storyText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.black.qua,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 68,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white.tertiary,
  },
  postName: {
    color: Colors.black.primary,
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  postPlace: {
    color: Colors.black.qua,
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.white.tertiary,
    borderRadius: 12,
    marginHorizontal: 12,
  },
  postActionsTop: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  viewDetails: {
    backgroundColor: '#FFE5D9', // Peach color
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    color: Colors.brand.primary,
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  engagementStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementText: {
    color: Colors.black.primary,
    fontFamily: Fonts.medium,
    fontSize: 14,
    marginLeft: 4,
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  captionText: {
    color: Colors.black.primary,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  hashtag: {
    color: Colors.brand.primary,
    fontFamily: Fonts.semibold,
  },
  timestamp: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    color: Colors.black.qua,
    fontFamily: Fonts.regular,
    fontSize: 12,
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
