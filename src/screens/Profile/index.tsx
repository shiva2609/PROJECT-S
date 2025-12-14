/**
 * Profile Screen
 * 
 * Clean architecture with only 3 data sources:
 * 1. listenToUserProfile - user document
 * 2. listenToUserPosts - posts query
 * 3. listenToFollowState - follow state query
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { listenToSavedPosts, getSavedPosts } from '../../global/services/posts/post.interactions.service';
import { getPostsByIds } from '../../global/services/posts/post.service';
import { useSession } from '../../core/session';
import { getOrCreateChat } from '../../features/messages/services';

export default function ProfileScreen({ navigation, route }: any) {
  const { user: currentUser } = useAuth();
  const { userId: sessionUserId } = useSession();
  const userId = route?.params?.userId;
  const currentUserId = currentUser?.uid || '';
  const targetUserId = (userId || currentUserId || '').trim() || undefined;
  const isOwnProfile = !userId || userId === currentUserId;

  // Use global useUser hook for all user data
  const { user, posts, counts, loading, error, refresh } = useUser(targetUserId, { listenPosts: true });

  // Use global useFollowStatus hook for follow state
  const followStatus = useFollowStatus(currentUser?.uid, targetUserId);

  // Local state for UI
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [creatingChat, setCreatingChat] = useState<boolean>(false);

  // Fetch saved posts using global service
  useEffect(() => {
    if (!isOwnProfile || !currentUserId || activeTab !== 'saved') {
      return;
    }

    const unsubscribe = listenToSavedPosts(currentUserId, async (postIds) => {
      setSavedPostIds(postIds);

      // Fetch full post data for saved post IDs
      if (postIds.length > 0) {
        try {
          // Fetch posts by their IDs using global service
          const fetchedPosts = await getPostsByIds(postIds);

          // Sort by savedAt (most recent first)
          const savedPostsData = await getSavedPosts(currentUserId);
          const savedAtMap = new Map(savedPostsData.map(sp => [sp.postId, sp.savedAt]));

          const sortedPosts = fetchedPosts.sort((a, b) => {
            const aSavedAt = savedAtMap.get(a.id);
            const bSavedAt = savedAtMap.get(b.id);
            if (!aSavedAt || !bSavedAt) return 0;
            const aTime = aSavedAt.toMillis?.() || (aSavedAt as any).seconds * 1000 || 0;
            const bTime = bSavedAt.toMillis?.() || (bSavedAt as any).seconds * 1000 || 0;
            return bTime - aTime; // Most recent first
          });

          setSavedPosts(sortedPosts as Post[]);
        } catch (error: any) {
          console.error('[ProfileScreen] Error fetching saved posts:', error);
          setSavedPosts([]);
        }
      } else {
        setSavedPosts([]);
      }
    });

    return () => unsubscribe();
  }, [isOwnProfile, currentUserId, activeTab]);

  // Convert user data to User type for compatibility
  const profileUser = user ? {
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
  } : null;

  // Handle fine-grained follow toggle logic passed to child
  const handleFollowToggle = useCallback(async () => {
    if (!targetUserId || !currentUserId || isOwnProfile || followStatus.loading) {
      return;
    }

    try {
      // Just toggle. Hook handles API and state.
      await followStatus.toggleFollow();
    } catch (error: any) {
      console.error('[ProfileScreen] Error toggling follow:', error);
    }
  }, [targetUserId, currentUserId, isOwnProfile, followStatus]);

  // Handle edit profile
  const handleEditProfile = useCallback(() => {
    navigation?.navigate('EditProfile', { userId: targetUserId });
  }, [navigation, targetUserId]);

  // Navigate to followers/following screens
  const handleFollowersPress = useCallback(() => {
    navigation?.navigate('Followers', {
      userId: targetUserId,
      type: 'followers'
    });
  }, [navigation, targetUserId]);

  const handleFollowingPress = useCallback(() => {
    navigation?.navigate('Followers', {
      userId: targetUserId,
      type: 'following'
    });
  }, [navigation, targetUserId]);

  // Handle message - create chat and navigate to ChatRoom
  const handleMessage = useCallback(async () => {
    if (!sessionUserId || !targetUserId || isOwnProfile || creatingChat) {
      console.log('[ProfileScreen] Cannot create chat:', { sessionUserId, targetUserId, isOwnProfile, creatingChat });
      return;
    }

    console.log('[ProfileScreen] Creating chat between:', sessionUserId, 'and', targetUserId);
    setCreatingChat(true);
    try {
      // Create or get existing chat using deterministic chatId
      const chat = await getOrCreateChat(sessionUserId, targetUserId);
      console.log('[ProfileScreen] Chat created/retrieved:', chat.chatId);

      // SINGLE NAVIGATION CONTRACT: Only chatId is required
      console.log('[ProfileScreen] Navigating to ChatRoom with chatId:', chat.chatId);
      navigation?.navigate('ChatRoom', {
        chatId: chat.chatId,
      });
    } catch (error: any) {
      console.error('[ProfileScreen] Error creating chat:', error);
      // Show error to user
      if (error?.message) {
        console.error('[ProfileScreen] Error message:', error.message);
      }
    } finally {
      setCreatingChat(false);
    }
  }, [sessionUserId, targetUserId, isOwnProfile, creatingChat, navigation]);

  // Handle refresh
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


  // Render post thumbnail
  const renderPostThumbnail = useCallback(({ item }: { item: Post }) => {
    const imageUrl = item.imageURL || item.coverImage || (item.gallery && item.gallery[0]) || '';
    return (
      <TouchableOpacity
        style={styles.postThumbnail}
        onPress={() => navigation?.navigate('PostDetail', { postId: item.id })}
        activeOpacity={0.8}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Icon name="image-outline" size={24} color={Colors.black.qua} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profileUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine which posts to show
  const displayedPosts = (activeTab === 'saved' ? savedPosts : posts) || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{profileUser.username}</Text>
          <View style={styles.headerRight}>
            {isOwnProfile && (
              <TouchableOpacity onPress={handleEditProfile}>
                <Icon name="settings-outline" size={24} color={Colors.black.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.cardLeft}>
                <UserAvatar
                  size="xl"
                  uri={profileUser.profilePhoto || profileUser.photoUrl || profileUser.photoURL || profileUser.profilePic || undefined}
                  isVerified={false}
                  variant="profile"
                />
              </View>

              <View style={styles.cardRight}>
                <View style={styles.headerTopRow}>
                  <View style={styles.nameColumn}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.profileDisplayName} numberOfLines={1}>
                        {profileUser.name || profileUser.username || 'User'}
                      </Text>
                      {profileUser.verified && (
                        <View style={styles.badgeWrapper}>
                          <VerifiedBadge size={16} />
                        </View>
                      )}
                      {profileUser.accountType && (
                        <Text style={styles.accountType}>
                          {profileUser.accountType}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Action Button (Edit - Top Right) or Hidden for Follow Button which is now at bottom */}
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

            {/* Footer Action Row: Follow and Message Buttons */}
            {!isOwnProfile && (
              <View style={styles.cardFooterAction}>
                <View style={styles.actionButtonsRow}>
                  <View style={styles.followButtonContainer}>
                    <FollowButton
                      isFollowing={followStatus.isFollowing}
                      isFollowedBack={followStatus.isFollowedBy}
                      isLoading={followStatus.loading}
                      onToggleFollow={handleFollowToggle}
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

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => setActiveTab('posts')}
            >
              <Text style={styles.statNumber}>{profileUser.postsCount || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={handleFollowersPress}
            >
              <Text style={styles.statNumber}>{profileUser.followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={handleFollowingPress}
            >
              <Text style={styles.statNumber}>{profileUser.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Tabs */}
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

        {/* Content */}
        {displayedPosts.length > 0 ? (
          <View style={styles.postsGrid}>
            <FlatList
              data={displayedPosts}
              renderItem={renderPostThumbnail}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>
        ) : (
          <View style={styles.emptyPostsContainer}>
            <Icon
              name={activeTab === 'saved' ? 'bookmark-outline' : 'grid-outline'}
              size={48}
              color={Colors.black.qua}
            />
            <Text style={styles.emptyPostsText}>
              {activeTab === 'saved' ? 'No saved posts yet' : 'No posts yet'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  scrollView: {
    flex: 1,
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
    fontSize: 18,
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
    flexDirection: 'column', // Changed to column for footer
    backgroundColor: Colors.white.secondary,
    borderRadius: 20,
    padding: 20,
    // Shadow support
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
    marginRight: 12,
  },
  cardRight: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  nameColumn: {
    flex: 1,
    paddingRight: 8,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  profileDisplayName: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginRight: 6,
  },
  accountType: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
    marginLeft: 6,
  },
  badgeWrapper: {
    // adjusted for alignment
  },
  actionButtonWrapper: {
    marginLeft: 4,
  },
  bioText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    lineHeight: 18,
    marginTop: 4,
  },
  cardFooterAction: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 8,
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
    justifyContent: 'space-around', // Distributed evenly
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
    paddingVertical: 4,
    backgroundColor: Colors.brand.primary,
    borderRadius: 20,
  },
  editButtonTextSmall: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.white.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
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
  postsGrid: {
    padding: 2,
  },
  gridContent: {
    padding: 2,
  },
  postThumbnail: {
    width: '33.33%',
    aspectRatio: 1,
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
  },
  emptyPostsText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 16,
  },
});
