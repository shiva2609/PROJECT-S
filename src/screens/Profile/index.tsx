/**
 * Profile Screen
 * 
 * Clean architecture with only 3 data sources:
 * 1. listenToUserProfile - user document
 * 2. listenToUserPosts - posts query
 * 3. listenToFollowState - follow state query
 * 
 * ⚡ PERFORMANCE OPTIMIZED: FlatList with ListHeaderComponent
 */


import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';
import { Post } from '../../types/firestore';
import FollowButton from '../../components/profile/FollowButton';
import UserAvatar from '../../components/user/UserAvatar';
import VerifiedBadge from '../../components/user/VerifiedBadge';
import { useUser } from '../../global/hooks/useUser';
import { useFollowStatus } from '../../global/hooks/useFollowStatus';
import { useSavedPostsList } from '../../hooks/useSavedPostsList';
import { useSession } from '../../core/session';
import { getOrCreateConversation } from '../../services/chat/MessagesAPI';
import ProfileSkeleton from '../../components/profile/ProfileSkeleton';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { EmptyState } from '../../components/common/EmptyState';
import { SmartImage } from '../../components/common/SmartImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = SCREEN_WIDTH / 3;

export default function ProfileScreen({ navigation, route }: any) {
  const { user: currentUser } = useAuth();
  const { userId: sessionUserId } = useSession();
  const userId = route?.params?.userId;
  const currentUserId = currentUser?.uid || '';
  const targetUserId = (userId || currentUserId || '').trim() || undefined;
  const isOwnProfile = !userId || userId === currentUserId;

  const { user, posts, counts, loading, refresh } = useUser(targetUserId, { listenPosts: true });
  const followStatus = useFollowStatus(currentUser?.uid, targetUserId);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  // 🔐 DATA PERSISTENCE: Call hook unconditionally to preserve cache/state
  const { posts: fetchedSavedPosts, loading: savedLoading } = useSavedPostsList(
    isOwnProfile ? currentUserId : undefined
  );

  const savedPosts = fetchedSavedPosts;
  const [creatingChat, setCreatingChat] = useState<boolean>(false);

  const profileUser = useMemo(() => user ? {
    id: user.uid,
    accountType: user.accountType,
    username: user.username,
    name: user.displayName,
    fullName: user.displayName,
    displayName: user.displayName,
    photoUrl: user.photoURL,
    profilePhoto: user.photoURL,
    photoURL: user.photoURL,
    profilePic: user.photoURL,
    aboutMe: user.aboutMe,
    bio: user.bio,
    verified: user.verified || false,
    followersCount: counts.followers,
    followingCount: counts.following,
    postsCount: counts.posts,
  } : null, [user, counts]);

  const handleFollowToggle = useCallback(async () => {
    if (!targetUserId || !currentUserId || isOwnProfile || followStatus.loading) {
      return;
    }
    try {
      await followStatus.toggleFollow();
    } catch (error: any) {
      console.error('[ProfileScreen] Error toggling follow:', error);
    }
  }, [targetUserId, currentUserId, isOwnProfile, followStatus]);

  const handleBlock = useCallback(async () => {
    if (!targetUserId || !currentUserId || isOwnProfile) return;
    const { Alert } = await import('react-native');
    Alert.alert(
      'Block User',
      `Are you sure you want to block this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const { blockUser } = await import('../../services/api/firebaseService');
              await blockUser(currentUserId, targetUserId);
              navigation?.goBack();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  }, [targetUserId, currentUserId, isOwnProfile, navigation]);

  const handleEditProfile = useCallback(() => {
    navigation?.navigate('EditProfile', { userId: targetUserId });
  }, [navigation, targetUserId]);

  const handleFollowersPress = useCallback(() => {
    navigation?.navigate('Followers', { userId: targetUserId, type: 'followers' });
  }, [navigation, targetUserId]);

  const handleFollowingPress = useCallback(() => {
    navigation?.navigate('Followers', { userId: targetUserId, type: 'following' });
  }, [navigation, targetUserId]);

  const handleMessage = useCallback(async () => {
    if (!sessionUserId || !targetUserId || isOwnProfile || creatingChat) return;
    setCreatingChat(true);
    try {
      const conversation = await getOrCreateConversation(sessionUserId, targetUserId);
      navigation?.navigate('ChatRoom', { chatId: conversation.id });
    } catch (error: any) {
      console.error('[ProfileScreen] Error creating conversation:', error);
    } finally {
      setCreatingChat(false);
    }
  }, [sessionUserId, targetUserId, isOwnProfile, creatingChat, navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('[ProfileScreen] Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Loading state should be granular
  // const displayedPosts = useMemo(() => (activeTab === 'saved' ? savedPosts : posts) || [], [activeTab, savedPosts, posts]);

  const renderPostThumbnail = useCallback((item: Post, index: number, postsList: Post[]) => {
    const imageUrl = item.imageURL || item.coverImage || (item.gallery && item.gallery[0]) || '';
    return (
      <TouchableOpacity
        style={styles.postThumbnail}
        onPress={() => {
          navigation?.navigate('PostDetail', {
            postId: item.id,
            userId: profileUser?.id || targetUserId,
            posts: postsList,
            index: index
          });
        }}
        activeOpacity={0.8}
      >
        {imageUrl ? (
          <SmartImage
            uri={imageUrl}
            style={styles.thumbnailImage}
            resizeMode="cover"
            showPlaceholder={true}
            borderRadius={2}
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Icon name="image-outline" size={24} color={Colors.black.qua} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation, profileUser?.id, targetUserId]);

  const renderTimelinePost = useCallback(({ item, index }: { item: Post; index: number }) =>
    renderPostThumbnail(item, index, posts || []),
    [renderPostThumbnail, posts]);

  const renderSavedPost = useCallback(({ item, index }: { item: Post; index: number }) =>
    renderPostThumbnail(item, index, savedPosts || []),
    [renderPostThumbnail, savedPosts]);

  const keyExtractor = useCallback((item: Post) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: GRID_ITEM_WIDTH,
    offset: GRID_ITEM_WIDTH * Math.floor(index / 3),
    index,
  }), []);

  const ListHeader = useMemo(() => {
    if (!profileUser) return null;
    return (
      <>
        {/* Header Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{profileUser.username}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.cardLeft}>
                <UserAvatar
                  size="xl"
                  uri={profileUser.profilePhoto}
                  isVerified={false}
                  variant="profile"
                />
              </View>

              <View style={styles.cardRight}>
                <View style={styles.headerTopRow}>
                  <View style={styles.nameColumn}>
                    <View style={styles.nameRow}>
                      <Text style={styles.profileDisplayName} numberOfLines={1}>
                        {profileUser.name || profileUser.username || 'User'}
                      </Text>
                      {profileUser.verified && (
                        <View style={styles.badgeWrapper}>
                          <VerifiedBadge size={16} />
                        </View>
                      )}
                    </View>
                    {profileUser.accountType && (
                      <View style={styles.accountTypeContainer}>
                        <Text style={styles.accountType}>{profileUser.accountType}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionButtonWrapper}>
                    {isOwnProfile && (
                      <TouchableOpacity style={styles.editButtonSmall} onPress={handleEditProfile}>
                        <Text style={styles.editButtonTextSmall}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {(profileUser.aboutMe || profileUser.bio) ? (
                  <Text style={styles.bioText} numberOfLines={3}>
                    {profileUser.aboutMe || profileUser.bio}
                  </Text>
                ) : null}
              </View>
            </View>

            {!isOwnProfile && (
              <View style={styles.cardFooterAction}>
                <View style={styles.actionButtonsRow}>
                  <View style={styles.followButtonContainer}>
                    <FollowButton
                      isFollowing={followStatus.isFollowing}
                      isFollowedBack={followStatus.isFollowedBy}
                      isLoading={followStatus.loading}
                      onToggleFollow={handleFollowToggle}
                      onBlock={handleBlock}
                      followersCount={profileUser.followersCount}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={handleMessage}
                    disabled={creatingChat}
                    activeOpacity={0.7}
                  >
                    {creatingChat ? (
                      <ActivityIndicator size="small" color={Colors.brand.primary} />
                    ) : (
                      <Icon name="chatbubble-outline" size={20} color={Colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('posts')}>
              <Text style={styles.statNumber}>{profileUser.postsCount || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={handleFollowersPress}>
              <Text style={styles.statNumber}>{profileUser.followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={handleFollowingPress}>
              <Text style={styles.statNumber}>{profileUser.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Icon
              name="grid-outline"
              size={24}
              color={activeTab === 'posts' ? Colors.brand.primary : Colors.black.qua}
            />
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
              onPress={() => setActiveTab('saved')}
            >
              <Icon
                name="bookmark-outline"
                size={24}
                color={activeTab === 'saved' ? Colors.brand.primary : Colors.black.qua}
              />
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  }, [profileUser, navigation, isOwnProfile, followStatus, creatingChat, activeTab, handleBlock, handleEditProfile, handleFollowToggle, handleFollowersPress, handleFollowingPress, handleMessage]);

  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyPostsContainer}>
      <Icon
        name={activeTab === 'saved' ? 'bookmark-outline' : 'camera-outline'}
        size={48}
        color={Colors.black.qua}
      />
      <Text style={styles.emptyPostsTitle}>
        {activeTab === 'saved' ? 'No saved posts yet' : 'No posts yet'}
      </Text>
      <Text style={styles.emptyPostsSubtitle}>
        {activeTab === 'saved'
          ? 'Posts you save will appear here.'
          : (isOwnProfile ? 'Share your moments with the world.' : 'User hasn\'t posted anything yet.')}
      </Text>
    </View>
  ), [activeTab, isOwnProfile]);

  if (loading) {
    return (
      <ScreenLayout scrollable={false}>
        <ProfileSkeleton />
      </ScreenLayout>
    );
  }

  if (!profileUser) {
    return (
      <ScreenLayout scrollable={false}>
        <EmptyState
          icon="person-outline"
          title="User not found"
          subtitle="This profile doesn't exist or has been removed"
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable={false}>
      {/* 🔐 PERSISTENT VIEWPORT 1: Posts Grid */}
      <View style={{ flex: 1, display: activeTab === 'posts' ? 'flex' : 'none' }}>
        <FlatList
          data={posts}
          renderItem={renderTimelinePost}
          keyExtractor={keyExtractor}
          numColumns={3}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.brand.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          getItemLayout={getItemLayout}
          removeClippedSubviews={false} // 🔐 Image cache safety: clipping can sometimes purge decodes
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={10} // Increased for better smoothness
        />
      </View>

      {/* 🔐 PERSISTENT VIEWPORT 2: Saved Grid */}
      {isOwnProfile && (
        <View style={{ flex: 1, display: activeTab === 'saved' ? 'flex' : 'none' }}>
          <FlatList
            data={savedPosts}
            renderItem={renderSavedPost}
            keyExtractor={keyExtractor}
            numColumns={3}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.brand.primary}
              />
            }
            contentContainerStyle={styles.listContent}
            getItemLayout={getItemLayout}
            removeClippedSubviews={false}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={10}
          />
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  headerRight: {
    width: 40,
  },
  profileSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  profileCard: {
    flexDirection: 'column',
    backgroundColor: Colors.white.secondary,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardLeft: {
    marginRight: 16,
  },
  cardRight: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  nameColumn: {
    flex: 1,
    paddingRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  profileDisplayName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginRight: 6,
    flexShrink: 1,
  },
  accountTypeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 92, 2, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 4,
  },
  accountType: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
    textTransform: 'uppercase',
  },
  badgeWrapper: {
    justifyContent: 'center',
  },
  actionButtonWrapper: {
    marginLeft: 4,
  },
  bioText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    lineHeight: 18,
    marginTop: 8,
  },
  cardFooterAction: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.white.tertiary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
  },
  followButtonContainer: {
    flex: 1,
  },
  messageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.brand.primary,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 64,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 2,
  },
  editButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.white.primary,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    borderRadius: 20,
  },
  editButtonTextSmall: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.white.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.brand.primary,
  },
  postThumbnail: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH,
    padding: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
    borderRadius: 2,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPostsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyPostsTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPostsSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
    lineHeight: 20,
  },
});
