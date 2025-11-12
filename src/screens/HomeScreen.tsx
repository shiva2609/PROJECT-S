import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../utils/colors';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { db } from '../api/authService';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
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
    const load = async () => {
      try {
        const sSnap = await getDocs(query(collection(db, 'stories')));
        setStories(sSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        const pSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
        setPosts(pSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch {}
      setLoading(false);
    };
    load();
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
  useFocusEffect(
    React.useCallback(() => {
      // Check if we should show reward (from route params or if not claimed)
      const shouldShowReward = route?.params?.showReward || false;
      
      // When screen comes into focus, check if we should show reward
      // This handles the case when user navigates from notification
      if (!claimed && user) {
        if (shouldShowReward || !rewardVisible) {
          console.log('🔄 Screen focused, showing reward modal...', { shouldShowReward, rewardVisible });
          // Small delay to ensure state is ready
          const timer = setTimeout(() => {
            showReward();
            // Clear the param after showing
            if (shouldShowReward && navProp?.setParams) {
              navProp.setParams({ showReward: undefined });
            }
          }, 500);
          
          return () => clearTimeout(timer);
        }
      }
    }, [claimed, user, showReward, rewardVisible, route?.params, navProp])
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
        <>
          <FlatList
            ListHeaderComponent={
              <View style={{ paddingVertical: 8 }}>
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
                          {hasStory ? (
                            <LinearGradient colors={[Colors.brand.primary, Colors.brand.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.storyRing}>
                              <View style={styles.storyAvatar} />
                            </LinearGradient>
                          ) : (
                            <View style={[styles.storyRing, styles.storyRingInactive]}>
                              <View style={styles.storyAvatar} />
                            </View>
                          )}
                          {item.isYou && (
                            <View style={styles.storyAdd}><Icon name="add" size={12} color="white" /></View>
                          )}
                          <Text style={styles.storyText}>{item.isYou ? 'You' : (item.location || 'Story')}</Text>
                        </View>
                      );
                    }}
                  />
                ) : (
                  <View style={{ height: 110, paddingLeft: 20 }}>
                    <View style={styles.storyItem}>
                      <View style={[styles.storyRing, styles.storyRingInactive]}>
                        <View style={styles.storyAvatar} />
                      </View>
                      <View style={styles.storyAdd}><Icon name="add" size={12} color="white" /></View>
                      <Text style={styles.storyText}>You</Text>
                    </View>
                  </View>
                )}

                {/* Premium Segmented Control */}
                <SegmentedControl selectedTab={selectedTab} onChange={(tab) => setSelectedTab(tab as 'For You' | 'Following')} />
              </View>
            }
            data={posts}
            keyExtractor={(i) => i.id}
            renderItem={({ item, index }) => (
              <MotiView from={{ opacity: 0, translateY: 12 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: index * 40, type: 'timing', duration: 220 }}>
                <View style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.postAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.postName}>{item.userId?.slice(0, 10) || 'User'}</Text>
                      {!!item.placeName && <Text style={styles.postPlace}>{item.placeName}</Text>}
                    </View>
                  </View>
                  {!!item.imageURL && <Image source={{ uri: item.imageURL }} style={styles.postImage as any} />}
                  <View style={styles.postActionsTop}>
                    <TouchableOpacity activeOpacity={0.8} style={styles.viewDetails}><Text style={styles.viewDetailsText}>View Details</Text></TouchableOpacity>
                  </View>

                  <View style={styles.postActions}>
                    <View style={styles.actionLeft}>
                      <View style={styles.actionBtn}><Icon name="heart-outline" size={20} color={colors.text} /><Text style={styles.actionText}>748</Text></View>
                      <View style={styles.actionBtn}><Icon name="chatbubble-ellipses-outline" size={20} color={colors.text} /><Text style={styles.actionText}>48</Text></View>
                      <View style={styles.actionBtn}><Icon name="share-social-outline" size={20} color={colors.text} /><Text style={styles.actionText}>748</Text></View>
                    </View>
                  </View>
                  {!!item.caption && <Text numberOfLines={2} style={styles.caption}>{item.caption}</Text>}
                  <View style={styles.postDivider} />
                </View>
              </MotiView>
            )}
            windowSize={8}
            initialNumToRender={5}
            removeClippedSubviews
          />

          {(!posts || posts.length === 0) && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No posts yet, start exploring!</Text>
              <Text style={styles.emptySub}>Follow explorers or create your first travel memory.</Text>
              <TouchableOpacity activeOpacity={0.8} style={styles.exploreCta} onPress={() => navProp?.navigate('Explore')}>
                <Text style={styles.exploreCtaText}>Explore Trips</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
  storyItem: { alignItems: 'left', marginRight: 350 },
  storyRing: {
    width: 68,                  // 👈 make sure this matches height (adjust based on your design)
    height: 68,
    borderRadius: 34,           // 👈 half of width/height for perfect circle
    padding: 2,
    borderWidth: 2,
    borderColor: Colors.white.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyRingInactive: { borderColor: Colors.white.tertiary },
  storyAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border },
  storyAdd: { position: 'absolute', right: -24, bottom: 26, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white.secondary },
  storyText: { marginTop: 6, fontSize: 12, color: Colors.black.qua, fontFamily: Fonts.regular },
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
