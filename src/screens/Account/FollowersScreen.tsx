/**
 * FollowersScreen
 * Instagram-style followers list screen
 * Shows all users who follow the profile user
 * 
 * ⚡ PERFORMANCE OPTIMIZED
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../../theme/fonts';
import { Colors } from '../../theme/colors';
import { useAuth } from '../../providers/AuthProvider';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import * as FollowService from '../../global/services/follow/follow.service';
import * as UserService from '../../global/services/user/user.service';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import FollowerItem, { UserListItemProps } from '../../components/user/FollowerItem';

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
  const [userList, setUserList] = useState<UserListItemProps[]>([]);
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

  // Track which users follow back (for message button)
  const [usersFollowingBack, setUsersFollowingBack] = useState<Set<string>>(new Set());

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
    let unsubscribeRelatime: (() => void) | undefined;

    const fetchUserList = async () => {
      setLoading(true);

      if (!profileUserId) {
        setLoading(false);
        return;
      }

      const shouldListen = isOwnProfile && activeTab === 'following';

      if (shouldListen) {
        unsubscribeRelatime = FollowService.listenToFollowingIds(profileUserId, async (uids) => {
          if (uids.length === 0) {
            setUserList([]);
            setLoading(false);
            return;
          }
          try {
            const userInfos = await UserService.getUsersPublicInfo(uids);

            const users: UserListItemProps[] = userInfos.map(userInfo => ({
              uid: userInfo.uid,
              username: userInfo.username,
              displayName: userInfo.displayName,
              photoURL: userInfo.photoURL,
              isFollowing: true,
              verified: userInfo.verified || false,
            })).filter((u): u is UserListItemProps => u !== null);

            setUserList(users);

            const newMap: Record<string, boolean> = {};
            users.forEach(u => newMap[u.uid] = true);
            setIsFollowingMap(prev => ({ ...prev, ...newMap }));

          } catch (e) {
            console.error('Error fetching real-time users:', e);
          } finally {
            setLoading(false);
          }
        });
      } else {
        try {
          const uids = activeTab === 'followers'
            ? await FollowService.getFollowersIds(profileUserId)
            : await FollowService.getFollowingIds(profileUserId);

          if (uids.length === 0) {
            setUserList([]);
            setLoading(false);
            return;
          }

          const userInfos = await UserService.getUsersPublicInfo(uids);

          let followingSet = new Set<string>();
          if (currentUser?.uid) {
            const followingIds = await FollowService.getFollowingIds(currentUser.uid);
            followingSet = new Set(followingIds);
          }

          const users: UserListItemProps[] = userInfos
            .map((userInfo) => ({
              uid: userInfo.uid,
              username: userInfo.username,
              displayName: userInfo.displayName,
              photoURL: userInfo.photoURL,
              isFollowing: currentUser?.uid && userInfo.uid !== currentUser.uid
                ? followingSet.has(userInfo.uid)
                : false,
              verified: userInfo.verified || false,
            }))
            .filter((u): u is UserListItemProps => u !== null);

          setUserList(users);

          const followingMap: Record<string, boolean> = {};
          users.forEach((user) => { followingMap[user.uid] = user.isFollowing; });
          setIsFollowingMap(prev => ({ ...prev, ...followingMap }));

        } catch (error) {
          console.error('[FollowersScreen] Error fetching user list:', error);
          setUserList([]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserList();

    return () => {
      if (unsubscribeRelatime) unsubscribeRelatime();
    };
  }, [profileUserId, activeTab, currentUser?.uid, isOwnProfile]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
          } catch { }
        }
      }
      setUsersFollowingBack(followingBackSet);
    };
    if (userList.length > 0) {
      checkFollowBack();
    }
  }, [userList, currentUser?.uid, isOwnProfile]);

  const handleBackPress = useCallback(() => {
    navigation?.goBack();
  }, [navigation]);

  const handleUserPress = useCallback((userId: string) => {
    navigation?.push('ProfileScreen', { userId });
  }, [navigation]);

  const handleMessagePress = useCallback((userId: string) => {
    navigation?.navigate('Chats', { userId });
  }, [navigation]);

  const handleFollowToggle = async (userId: string) => {
    if (!currentUser?.uid || userId === currentUser.uid) return;
    const currentlyFollowing = isFollowingMap[userId] || false;

    // Optimistic
    setIsFollowingMap(prev => ({ ...prev, [userId]: !currentlyFollowing }));

    try {
      if (currentlyFollowing) {
        // Confirmation is handled by onFollowPress wrapper
        await FollowService.unfollowUser(currentUser.uid, userId);
      } else {
        await FollowService.followUser(currentUser.uid, userId);
      }
    } catch (error) {
      setIsFollowingMap(prev => ({ ...prev, [userId]: currentlyFollowing }));
      console.error('Error toggling follow:', error);
    }
  };

  const onFollowPress = useCallback((userId: string) => {
    const currentlyFollowing = isFollowingMap[userId] || false;
    if (currentlyFollowing) {
      setConfirmationModal({
        visible: true,
        title: 'Unfollow',
        message: `Are you sure you want to unfollow this user?`,
        confirmLabel: 'Unfollow',
        onConfirm: async () => {
          setConfirmationModal(null);
          // Trigger actual toggle logic
          // But wait, handleFollowToggle does logic + API. 
          // We need to just call API or reuse function.
          // Re-implementing logic here to avoid circular dep or recursion confusion
          setIsFollowingMap(prev => ({ ...prev, [userId]: false }));
          try {
            if (currentUser?.uid) await FollowService.unfollowUser(currentUser.uid, userId);
          } catch (e) {
            setIsFollowingMap(prev => ({ ...prev, [userId]: true }));
          }
        },
      });
    } else {
      handleFollowToggle(userId);
    }
  }, [isFollowingMap, currentUser?.uid]);

  const renderItem = useCallback(({ item }: { item: UserListItemProps }) => {
    const isOwnUser = item.uid === currentUser?.uid;
    const isFollowing = isFollowingMap[item.uid] || false;
    const userFollowsBack = usersFollowingBack.has(item.uid);
    const showMessageButton = !isOwnUser && !isOwnProfile && userFollowsBack;

    return (
      <FollowerItem
        item={item}
        onPress={handleUserPress}
        onFollowPress={onFollowPress}
        onMessagePress={handleMessagePress}
        isOwnUser={isOwnUser}
        isFollowing={isFollowing}
        showMessageButton={showMessageButton}
      />
    );
  }, [currentUser?.uid, isFollowingMap, isOwnProfile, usersFollowingBack, handleUserPress, handleMessagePress, onFollowPress]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 72,
    offset: 72 * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: UserListItemProps) => item.uid, []);

  return (
    <ScreenLayout backgroundColor={Colors.white.secondary} scrollable={false}>
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
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
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
          <LoadingState fullScreen />
        ) : userList.length === 0 ? (
          <EmptyState
            icon={activeTab === 'followers' ? 'people-outline' : 'person-add-outline'}
            title={activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
            subtitle={activeTab === 'followers'
              ? 'When people follow you, they will appear here'
              : 'Start following people to see their posts'}
          />
        ) : (
          <FlatList
            data={userList}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            windowSize={5}
            maxToRenderPerBatch={12}
            removeClippedSubviews={true}
            getItemLayout={getItemLayout}
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
    </ScreenLayout>
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
  tabActive: {},
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
});
