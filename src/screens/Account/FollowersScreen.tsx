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
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../../theme/fonts';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../providers/AuthProvider';
import UserAvatar from '../../components/user/UserAvatar';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import * as FollowService from '../../global/services/follow/follow.service';
import * as UserService from '../../global/services/user/user.service';

interface UserListItem {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  isFollowing: boolean;
  verified?: boolean;
}

interface FollowersScreenProps {
  navigation?: any;
  route?: {
    params?: {
      userId?: string;
      username?: string;
      type?: 'followers' | 'following';
    };
  };
}

export default function FollowersScreen({ navigation, route }: FollowersScreenProps) {
  const { user: currentUser } = useAuth();
  const profileUserId = route?.params?.userId || currentUser?.uid || '';
  const initialTab = route?.params?.type || 'followers';

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [profileUsername, setProfileUsername] = useState<string>('User');
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFollowingMap, setIsFollowingMap] = useState<Record<string, boolean>>({});
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const isOwnProfile = profileUserId === currentUser?.uid;

  // Fetch profile user's username
  useEffect(() => {
    const fetchProfileUser = async () => {
      if (!profileUserId) {
        setProfileUsername('User');
        return;
      }

      try {
        const userInfo = await UserService.getUserPublicInfo(profileUserId);
        if (userInfo) {
          setProfileUsername(userInfo.username || userInfo.displayName || 'User');
        } else {
          setProfileUsername('User');
        }
      } catch (error) {
        console.error('[FollowersScreen] Error fetching profile user:', error);
        setProfileUsername(route?.params?.username || 'User');
      }
    };

    fetchProfileUser();
  }, [profileUserId, route?.params?.username]);

  // Fetch user IDs and then full user data
  useEffect(() => {
    const fetchUserList = async () => {
      if (!profileUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Step 1: Get UIDs from follow service
        console.log(`[FollowersScreen] Fetching ${activeTab} for userId:`, profileUserId);
        const uids = activeTab === 'followers'
          ? await FollowService.getFollowersIds(profileUserId)
          : await FollowService.getFollowingIds(profileUserId);

        console.log(`[FollowersScreen] Found ${uids.length} ${activeTab}:`, uids);

        if (uids.length === 0) {
          console.log(`[FollowersScreen] No ${activeTab} found.`);
          setUserList([]);
          setLoading(false);
          return;
        }

        // Step 2: Batch fetch full user data
        const userInfos = await UserService.getUsersPublicInfo(uids);

        // Step 3: Get current user's following IDs once for efficient follow-state check
        let followingSet = new Set<string>();
        if (currentUser?.uid) {
          const followingIds = await FollowService.getFollowingIds(currentUser.uid);
          followingSet = new Set(followingIds);
        }

        // Step 4: Build user list with follow state
        const users: UserListItem[] = userInfos
          .map((userInfo) => {
            const isFollowing = currentUser?.uid && userInfo.uid !== currentUser.uid
              ? followingSet.has(userInfo.uid)
              : false;

            return {
              uid: userInfo.uid,
              username: userInfo.username,
              displayName: userInfo.displayName,
              photoURL: userInfo.photoURL,
              isFollowing,
              verified: userInfo.verified || false,
            } as UserListItem;
          })
          .filter((user): user is UserListItem => user !== null);

        setUserList(users);

        // Build isFollowing map
        const followingMap: Record<string, boolean> = {};
        users.forEach((user) => {
          followingMap[user.uid] = user.isFollowing;
        });
        setIsFollowingMap(followingMap);
      } catch (error) {
        console.error('[FollowersScreen] Error fetching user list:', error);
        setUserList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserList();
  }, [profileUserId, activeTab, currentUser?.uid]);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);



  const handleBackPress = () => {
    navigation?.goBack();
  };

  const handleUserPress = (userId: string) => {
    navigation?.push('ProfileScreen', { userId });
  };

  const handleMessagePress = (userId: string) => {
    navigation?.navigate('Chats', { userId });
  };

  const handleFollowToggle = async (userId: string) => {
    if (!currentUser?.uid || userId === currentUser.uid) return;

    const currentlyFollowing = isFollowingMap[userId] || false;

    if (currentlyFollowing) {
      // Show confirmation for unfollow
      setConfirmationModal({
        visible: true,
        title: 'Unfollow',
        message: `Are you sure you want to unfollow this user?`,
        confirmLabel: 'Unfollow',
        onConfirm: async () => {
          setConfirmationModal(null);
          try {
            await FollowService.unfollowUser(currentUser.uid, userId);
            setIsFollowingMap((prev) => ({ ...prev, [userId]: false }));
          } catch (error: any) {
            console.error('❌ Error unfollowing user:', error);
          }
        },
      });
    } else {
      // Follow immediately
      try {
        await FollowService.followUser(currentUser.uid, userId);
        setIsFollowingMap((prev) => ({ ...prev, [userId]: true }));
      } catch (error: any) {
        console.error('❌ Error following user:', error);
      }
    }
  };

  // Track which users follow back (for message button)
  const [usersFollowingBack, setUsersFollowingBack] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser?.uid || isOwnProfile) return;

    const checkFollowBack = async () => {
      const followingBackSet = new Set<string>();
      for (const user of userList) {
        if (user.uid !== currentUser.uid) {
          try {
            const followsBack = await FollowService.isFollowing(user.uid, currentUser.uid);
            if (followsBack) {
              followingBackSet.add(user.uid);
            }
          } catch {
            // Ignore errors
          }
        }
      }
      setUsersFollowingBack(followingBackSet);
    };

    if (userList.length > 0) {
      checkFollowBack();
    }
  }, [userList, currentUser?.uid, isOwnProfile]);

  const renderUserItem = useCallback(({ item }: { item: UserListItem }) => {
    const isOwnUser = item.uid === currentUser?.uid;
    const isFollowing = isFollowingMap[item.uid] || false;
    const userFollowsBack = usersFollowingBack.has(item.uid);
    // Show message button when viewing other user's list AND that list item user follows you back
    const showMessageButton = !isOwnUser && !isOwnProfile && userFollowsBack;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item.uid)}
        activeOpacity={0.7}
      >
        <UserAvatar
          size="md"
          uri={item.photoURL}
          isVerified={item.verified}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username} numberOfLines={1}>
            {item.username}
          </Text>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.displayName}
          </Text>
        </View>
        <View style={styles.actions}>
          {!isOwnUser && (
            <>
              {showMessageButton && (
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleMessagePress(item.uid);
                  }}
                >
                  <Icon name="chatbubble-outline" size={20} color={Colors.black.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleFollowToggle(item.uid);
                }}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText,
                  ]}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [currentUser?.uid, isFollowingMap, isOwnProfile, usersFollowingBack, handleUserPress, handleMessagePress, handleFollowToggle]);

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
          {profileUsername}
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
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
          </View>
        ) : userList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'followers'
                ? 'No followers yet'
                : 'Not following anyone yet'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={userList}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.uid}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          visible={confirmationModal.visible}
          title={confirmationModal.title}
          message={confirmationModal.message}
          confirmLabel={confirmationModal.confirmLabel}
          onConfirm={confirmationModal.onConfirm}
          onCancel={() => setConfirmationModal(null)}
        />
      )}
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
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 2,
  },
  displayName: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageButton: {
    padding: 8,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.brand.primary,
    borderRadius: 6,
  },
  followingButton: {
    backgroundColor: Colors.white.secondary,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  followButtonText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
  followingButtonText: {
    color: Colors.black.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
});

