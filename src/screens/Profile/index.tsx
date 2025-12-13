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
import { useUser } from '../../global/hooks/useUser';
import { useFollowStatus } from '../../global/hooks/useFollowStatus';
import { listenToSavedPosts, getSavedPosts } from '../../global/services/posts/post.interactions.service';
import { getPostsByIds } from '../../global/services/posts/post.service';

export default function ProfileScreen({ navigation, route }: any) {
  const { user: currentUser } = useAuth();
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
    username: user.username,
    name: user.displayName,
    fullName: user.displayName,
    displayName: user.displayName,
    photoUrl: user.photoURL,
    profilePhoto: user.photoURL,
    photoURL: user.photoURL,
    profilePic: user.photoURL,
    bio: user.bio,
    verified: user.verified || false,
    followersCount: counts.followers,
    followingCount: counts.following,
    postsCount: counts.posts,
  } : null;

  // Handle follow toggle
  const handleFollowToggle = useCallback(async () => {
    if (!targetUserId || !currentUserId || isOwnProfile || followStatus.loading) {
      return;
    }

    try {
      await followStatus.toggleFollow();
      // State will update automatically via useFollowStatus hook
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
          <UserAvatar
            size="xl"
            uri={profileUser.profilePhoto || profileUser.photoUrl || profileUser.photoURL || profileUser.profilePic || undefined}
            isVerified={profileUser.verified || false}
          />
          <Text style={styles.username}>{profileUser.username}</Text>
          {profileUser.bio && <Text style={styles.bio}>{profileUser.bio}</Text>}
          
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

          {/* Follow/Edit Button */}
          {isOwnProfile ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <FollowButton
              isFollowing={followStatus.isFollowing}
              loading={followStatus.loading}
              onToggle={handleFollowToggle}
            />
          )}
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
    paddingVertical: 12,
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
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  username: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginTop: 12,
  },
  bio: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 4,
  },
  editButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 10,
    backgroundColor: Colors.white.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
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
  listContainer: {
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  displayName: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 2,
  },
});
