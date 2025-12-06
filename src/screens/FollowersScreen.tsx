/**
 * FollowersScreen
 * Instagram-style followers list screen
 * Shows all users who follow the profile user
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../theme/fonts';
import { Colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import UserRowCard from '../components/followers/UserRowCard';
import { useProfileData } from '../hooks/useProfileData';

interface FollowerUser {
  id: string;
  username: string;
  fullname?: string;
  profilePic?: string;
  verified?: boolean;
  accountType?: string;
  bio?: string;
  aboutMe?: string;
}

interface FollowersScreenProps {
  navigation?: any;
  route?: {
    params?: {
      profileUserId?: string;
      username?: string;
      initialTab?: 'followers' | 'following';
    };
  };
}

export default function FollowersScreen({ navigation, route }: FollowersScreenProps) {
  const { user: currentUser } = useAuth();
  const profileUserId = route?.params?.profileUserId || currentUser?.uid;
  const profileUsername = route?.params?.username;
  const initialTab = route?.params?.initialTab || 'followers';
  
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [following, setFollowing] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserFollowingIds, setCurrentUserFollowingIds] = useState<Set<string>>(new Set());

  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Get profile username if not provided
  const { profileData } = useProfileData(profileUserId);
  const displayUsername = profileUsername || profileData?.username || 'User';

  // Fetch current user's following list to determine mutual follows
  useEffect(() => {
    if (!currentUser?.uid) return;

    const followsRef = collection(db, 'follows');
    const q = query(followsRef, where('followerId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const followingIds = new Set(
          snapshot.docs.map((doc) => doc.data().followingId)
        );
        setCurrentUserFollowingIds(followingIds);
      },
      (error) => {
        console.warn('Error fetching current user following:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Fetch followers
  const fetchFollowers = useCallback(async () => {
    if (!profileUserId) return;

    try {
      const followsRef = collection(db, 'follows');
      const q = query(followsRef, where('followingId', '==', profileUserId));
      const snapshot = await getDocs(q);

      const followerIds = snapshot.docs.map((doc) => doc.data().followerId);
      
      // Fetch user documents for each follower
      const followerPromises = followerIds.map(async (followerId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', followerId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              id: followerId,
              username: data.username || data.displayName || 'User',
              fullname: data.fullName || data.displayName || '',
              profilePic: data.photoURL || data.profilePic,
              verified: data.verified === true || data.verificationStatus === 'verified',
              accountType: data.accountType || data.role || 'Traveler',
              bio: data.bio || '',
              aboutMe: data.aboutMe || data.about || data.description || '',
            } as FollowerUser;
          }
        } catch (error) {
          console.warn(`Error fetching user ${followerId}:`, error);
        }
        return null;
      });

      const followerUsers = (await Promise.all(followerPromises)).filter(
        (user): user is FollowerUser => user !== null
      );

      setFollowers(followerUsers);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  }, [profileUserId]);

  // Fetch following
  const fetchFollowing = useCallback(async () => {
    if (!profileUserId) return;

    try {
      const followsRef = collection(db, 'follows');
      const q = query(followsRef, where('followerId', '==', profileUserId));
      const snapshot = await getDocs(q);

      const followingIds = snapshot.docs.map((doc) => doc.data().followingId);
      
      // Fetch user documents for each following
      const followingPromises = followingIds.map(async (followingId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', followingId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            return {
              id: followingId,
              username: data.username || data.displayName || 'User',
              fullname: data.fullName || data.displayName || '',
              profilePic: data.photoURL || data.profilePic,
              verified: data.verified === true || data.verificationStatus === 'verified',
              accountType: data.accountType || data.role || 'Traveler',
              bio: data.bio || '',
              aboutMe: data.aboutMe || data.about || data.description || '',
            } as FollowerUser;
          }
        } catch (error) {
          console.warn(`Error fetching user ${followingId}:`, error);
        }
        return null;
      });

      const followingUsers = (await Promise.all(followingPromises)).filter(
        (user): user is FollowerUser => user !== null
      );

      setFollowing(followingUsers);
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  }, [profileUserId]);

  // Load data based on active tab
  useEffect(() => {
    setLoading(true);
    if (activeTab === 'followers') {
      fetchFollowers().finally(() => setLoading(false));
    } else {
      fetchFollowing().finally(() => setLoading(false));
    }
  }, [activeTab, fetchFollowers, fetchFollowing]);

  const handleBackPress = () => {
    navigation?.goBack();
  };

  const handleUserPress = (userId: string) => {
    navigation?.navigate('Profile', { userId });
  };

  const handleMessagePress = (userId: string) => {
    navigation?.navigate('Chats', { userId });
  };

  const handleUnfollowPress = async (userId: string) => {
    // Unfollow functionality is handled by useFollow hook in UserRowCard
    // This is just for any additional logic if needed
  };

  const handleRemoveFollowerPress = async (userId: string) => {
    // TODO: Implement remove follower functionality
    // This would remove the follower relationship
    Alert.alert(
      'Remove Follower',
      'Are you sure you want to remove this follower?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Implement remove follower logic here
            console.log('Remove follower:', userId);
          },
        },
      ]
    );
  };

  const currentList = activeTab === 'followers' ? followers : following;
  const isOwnProfile = profileUserId === currentUser?.uid;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerUsername} numberOfLines={1}>
          {displayUsername}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'followers' && styles.tabTextActive,
            ]}
          >
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'following' && styles.tabTextActive,
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Indicator Line */}
      <View style={styles.indicatorContainer}>
        <View
          style={[
            styles.activeIndicator,
            { marginLeft: activeTab === 'followers' ? 0 : '50%' },
          ]}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Title */}
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'followers' ? 'All followers' : 'All following'}
          </Text>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
          </View>
        ) : currentList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'followers'
                ? 'No followers yet'
                : 'Not following anyone yet'}
            </Text>
          </View>
        ) : (
          <>
            {/* User List */}
            {currentList.map((followerUser) => {
              const isMutualFollow =
                activeTab === 'followers' &&
                currentUserFollowingIds.has(followerUser.id);

              return (
                <UserRowCard
                  key={followerUser.id}
                  user={{
                    ...followerUser,
                    accountType: followerUser.accountType as any,
                  }}
                  currentUserId={currentUser?.uid || ''}
                  onUserPress={handleUserPress}
                  onMessagePress={handleMessagePress}
                  showMenuButton={isOwnProfile}
                  isFollowingTab={activeTab === 'following'}
                  onUnfollowPress={handleUnfollowPress}
                  onRemoveFollowerPress={handleRemoveFollowerPress}
                  isMutualFollow={isMutualFollow}
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerUsername: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  headerSpacer: {
    width: 36,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    // Active state handled by text color
  },
  tabText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.black.qua,
  },
  tabTextActive: {
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  indicatorContainer: {
    height: 2,
    backgroundColor: Colors.white.tertiary,
    position: 'relative',
  },
  activeIndicator: {
    width: '50%',
    height: 2,
    backgroundColor: Colors.black.primary,
    position: 'absolute',
    top: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitleContainer: {
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.black.qua,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
});

