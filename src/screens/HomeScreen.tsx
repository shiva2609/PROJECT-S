import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../utils/colors';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { db } from '../api/authService';
import { collection, getDocs, orderBy, query, onSnapshot } from 'firebase/firestore';
import SegmentedControl from '../components/SegmentedControl';
import { useAuth } from '../contexts/AuthContext';
import { getAccountTypeMetadata, AccountType } from '../types/account';
import { MotiView } from '../utils/moti';
import { LinearGradient } from '../utils/gradient';
import { listenToUnreadCounts, markNotificationsAsRead, markMessagesAsRead } from '../api/notificationService';
import { useRewardOnboarding } from '../hooks/useRewardOnboarding';
import RewardPopCard from '../components/RewardPopCard';
import { useTopicClaimReminder } from '../hooks/useTopicClaimReminder';
import TopicClaimAlert from '../components/TopicClaimAlert';
import FollowingScreen from './FollowingScreen';
import PostCard from '../components/PostCard';

interface PostDoc { id: string; userId: string; placeName?: string; imageURL?: string; caption?: string; }
interface StoryDoc { id: string; userId: string; media?: string; location?: string; }

export default function HomeScreen({ navigation: navProp, route }: any) {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  // Function to open drawer - HomeScreen is inside Tab > Drawer
  // The Tab navigator's parent is the Drawer navigator
  const openDrawer = React.useCallback(() => {
    try {
      // Method 1: navProp is from Tab navigator, its parent should be Drawer
      if (navProp) {
        const drawerNav = (navProp as any).getParent?.();
        if (drawerNav && typeof drawerNav.openDrawer === 'function') {
          drawerNav.openDrawer();
          return;
        }
      }
      
      // Method 2: Traverse up from useNavigation (Tab navigator context)
      // Tab's parent is Drawer, Drawer's parent is Stack
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
      
      // Method 3: Last resort - try DrawerActions
      // This will only work if we're in a drawer navigator context
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (error) {
      console.error('Error opening drawer:', error);
    }
  }, [navProp, navigation]);
  const [stories, setStories] = useState<StoryDoc[]>([]);
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AccountType>('Traveler');
  const [selectedTab, setSelectedTab] = useState<'For You' | 'Following'>('For You');
  const [unreadCounts, setUnreadCounts] = useState({ notifications: 0, messages: 0 });

  // Welcome reward onboarding hook
  const {
    visible: rewardVisible,
    claimed,
    points,
    claiming: rewardClaiming,
    error: rewardError,
    grantReward,
    dismiss: dismissReward,
    showReward,
  } = useRewardOnboarding(user?.uid);

  // Topic claim reminder hook
  const {
    showAlert: showTopicAlert,
    onClaimNow: handleTopicClaimNow,
    onRemindLater: handleTopicRemindLater,
  } = useTopicClaimReminder(user?.uid, navigation);

  useEffect(() => {
    // Load stories (one-time fetch)
    const loadStories = async () => {
      try {
        const sSnap = await getDocs(query(collection(db, 'stories')));
        setStories(sSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (error: any) {
        console.warn('Error loading stories:', error.message || error);
      }
    };
    loadStories();

    // Real-time listener for posts using onSnapshot
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        // Filter out posts without createdAt
        const fetchedPosts = snapshot.docs
          .filter((d) => {
            const data = d.data();
            return !!data.createdAt;
          })
          .map((d) => ({ id: d.id, ...(d.data() as any) }));
        setPosts(fetchedPosts);
        setLoading(false);
      },
      (error: any) => {
        if (error.code === 'failed-precondition') {
          console.warn('Firestore query error: ensure createdAt exists.');
        } else {
          console.warn('Firestore query error:', error.message || error);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Listen to unread counts
  useEffect(() => {
    if (!user) return;

    console.log('🔔 Setting up unread counts listener for user:', user.uid);
    const unsubscribe = listenToUnreadCounts(user.uid, (counts) => {
      console.log('🔔 Unread counts received:', counts);
      setUnreadCounts(counts);
    });

    return () => unsubscribe();
  }, [user]);

  // Note: Removed auto-grant logic
  // Reward will only be claimed when user manually clicks "Claim Now" button
  // This ensures the modal stays open until user interaction

  // Listen for navigation events to show reward when coming from notification
  // NOTE: The reward popup is now controlled by useRewardOnboarding hook
  // which checks AsyncStorage + Firestore to ensure it only shows once
  // This useFocusEffect only handles manual navigation from notifications
  useFocusEffect(
    React.useCallback(() => {
      // Only show if explicitly requested via route params (e.g., from notification)
      const shouldShowReward = route?.params?.showReward || false;
      
      // Only trigger if explicitly requested AND reward not claimed
      if (shouldShowReward && !claimed && user) {
        console.log('🔄 Screen focused with showReward param, checking if can show...');
        // Small delay to ensure state is ready
        const timer = setTimeout(() => {
          showReward(); // This will check AsyncStorage internally
          // Clear the param after showing
          if (navProp?.setParams) {
            navProp.setParams({ showReward: undefined });
          }
        }, 500);
        
        return () => clearTimeout(timer);
      }
      // Do NOT auto-show on every focus - let the hook handle it on mount only
    }, [claimed, user, showReward, route?.params, navProp])
  );

  const meta = getAccountTypeMetadata(role);
  const hasStories = stories && stories.length > 0;
  const storyData = useMemo(() => [{ id: 'your-story', isYou: true } as any, ...stories], [stories]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={openDrawer}
        >
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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Shared Header: Stories + SegmentedControl */}
          <View style={styles.sharedHeader}>
            {hasStories ? (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={storyData}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 12 }}
                renderItem={({ item, index }) => {
                  const hasStory = !item.isYou || (item.media && item.media.length > 0);
                  return (
                    <View style={styles.storyItem}>
                      <View style={{ position: 'relative' }}>
                        {hasStory ? (
                          <View style={styles.storyRingActive}>
                            <View style={styles.storyAvatarContainer}>
                              <View style={styles.storyAvatar} />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.storyRingInactive}>
                            <View style={styles.storyAvatarContainer}>
                              <View style={styles.storyAvatar} />
                            </View>
                          </View>
                        )}
                        {item.isYou && (
                          <View style={styles.storyAdd}>
                            <Icon name="add" size={12} color="white" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.storyText} numberOfLines={1}>
                        {item.isYou ? 'You' : (item.location || item.username || 'Story')}
                      </Text>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={{ height: 110, paddingLeft: 20 }}>
                <View style={styles.storyItem}>
                  <View style={{ position: 'relative' }}>
                    <View style={styles.storyRingInactive}>
                      <View style={styles.storyAvatarContainer}>
                        <View style={styles.storyAvatar} />
                      </View>
                    </View>
                    <View style={styles.storyAdd}>
                      <Icon name="add" size={12} color="white" />
                    </View>
                  </View>
                  <Text style={styles.storyText}>You</Text>
                </View>
              </View>
            )}

            {/* Premium Segmented Control */}
            <SegmentedControl selectedTab={selectedTab} onChange={(tab) => setSelectedTab(tab as 'For You' | 'Following')} />
          </View>

          {/* Tab Content */}
          {selectedTab === 'For You' ? (
            <FlatList
              data={posts}
              keyExtractor={(i) => i.id}
              renderItem={({ item, index }) => (
                <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: index * 40, type: 'timing', duration: 220 }}>
                  <PostCard
                    post={item}
                    onUserPress={(userId) => navProp?.navigate('Profile', { userId })}
                    onViewDetails={(postId) => {
                      // Navigate to post detail screen if exists, otherwise show alert
                      if (navProp?.navigate) {
                        navProp.navigate('PostDetail', { postId });
                      } else {
                        Alert.alert('Post Details', `Post ID: ${postId}`);
                      }
                    }}
                    onCommentPress={(postId) => {
                      // Navigate to comments screen if exists
                      if (navProp?.navigate) {
                        navProp.navigate('Comments', { postId });
                      } else {
                        Alert.alert('Comments', `Post ID: ${postId}`);
                      }
                    }}
                    navigation={navProp}
                  />
                </MotiView>
              )}
              windowSize={8}
              initialNumToRender={5}
              removeClippedSubviews
              ListEmptyComponent={
                (!posts || posts.length === 0) ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No posts yet, start exploring!</Text>
                    <Text style={styles.emptySub}>Follow explorers or create your first travel memory.</Text>
                    <TouchableOpacity activeOpacity={0.8} style={styles.exploreCta} onPress={() => navProp?.navigate('Explore')}>
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
                // Navigate to post detail if needed
                console.log('Post pressed:', post.id);
              }}
            />
          )}
        </View>
      )}

      {/* Welcome Reward Pop Card */}
      <RewardPopCard
        visible={rewardVisible}
        onClose={dismissReward}
        onClaim={async () => {
          try {
            // Handle claim with async/await
            await grantReward();
            // Show success confirmation using Alert
            Alert.alert(
              '🎉 Reward Claimed!',
              `You've successfully claimed ${150} Explorer Points!`,
              [{ text: 'OK' }]
            );
          } catch (error) {
            // Error is already handled in the hook and displayed in the modal
            console.error('Error claiming reward:', error);
          }
        }}
        onViewWallet={() => navProp?.navigate('Explorer Wallet')}
        points={150}
        claiming={rewardClaiming}
        error={rewardError}
      />

      {/* Topic Claim Alert */}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  topIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.white.secondary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 2, position: 'relative' },
  badge: { position: 'absolute', top: -2, right: -2, backgroundColor: Colors.brand.primary, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 10 },
  badgeText: { color: Colors.white.primary, fontSize: 10, fontFamily: Fonts.semibold },
  sharedHeader: { paddingVertical: 8, backgroundColor: Colors.white.secondary },
  storyItem: { 
    alignItems: 'center', 
    marginRight: 16, 
    width: 68,
    position: 'relative',
  },
  storyRingActive: {
    width: 68,
    height: 68,
    borderRadius: 34, // Perfect circle
    borderWidth: 2.5,
    borderColor: Colors.brand.primary, // Orange active ring
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2.5,
    backgroundColor: 'transparent',
  },
  storyRingInactive: {
    width: 68,
    height: 68,
    borderRadius: 34, // Perfect circle
    borderWidth: 2,
    borderColor: Colors.white.tertiary, // Gray inactive ring
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2.5,
    backgroundColor: 'transparent',
  },
  storyAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30, // Perfect circle
    overflow: 'hidden',
    backgroundColor: Colors.white.tertiary,
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
  },
  storyAdd: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white.secondary,
    zIndex: 10,
  },
  storyText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.black.qua,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 68,
  },
  postCard: { backgroundColor: Colors.white.primary, marginHorizontal: 12, marginVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: Colors.white.tertiary, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white.tertiary },
  postName: { color: Colors.black.primary, fontFamily: Fonts.semibold },
  postPlace: { color: Colors.black.qua, fontSize: 12, fontFamily: Fonts.regular },
  postImage: { width: '100%', height: 220, backgroundColor: colors.border },
  postActionsTop: { paddingHorizontal: 12, paddingTop: 12 },
  caption: { paddingHorizontal: 12, paddingBottom: 12, color: Colors.black.primary, fontFamily: Fonts.regular },
  postActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: Colors.black.secondary, fontFamily: Fonts.medium },
  viewDetails: { backgroundColor: Colors.brand.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  viewDetailsText: { color: Colors.white.primary, fontFamily: Fonts.semibold },
  postDivider: { height: 1, backgroundColor: Colors.white.tertiary, marginHorizontal: 12, marginBottom: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontFamily: Fonts.semibold, color: Colors.black.secondary, fontSize: 16 },
  emptySub: { fontFamily: Fonts.regular, color: Colors.black.qua, fontSize: 12, marginTop: 6 },
  exploreCta: { marginTop: 12, backgroundColor: Colors.brand.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  exploreCtaText: { color: Colors.white.primary, fontFamily: Fonts.semibold },
});

//
