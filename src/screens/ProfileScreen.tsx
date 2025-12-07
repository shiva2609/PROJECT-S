/**
 * Profile Screen - Matching Reference UI Design
 * 
 * Layout:
 * - Profile picture on LEFT, username below it
 * - Stats (posts, followers, following) aligned RIGHT of profile
 * - Edit profile as small chip
 * - No card backgrounds, content centered
 * - Equal tab spacing (1/3 or 1/4)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useProfileData } from '../hooks/useProfileData';
import { useProfilePhoto } from '../hooks/useProfilePhoto';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../services/userProfilePhotoService';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import InputModal from '../components/profile/InputModal';
import { normalizePost, sortPostsByCreatedAt } from '../utils/postUtils';
import { getAccountTypeMetadata } from '../types/account';
import type { AccountType } from '../types/account';
import VerifiedBadge from '../components/VerifiedBadge';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { fetchUserProfile, fetchUserPosts, fetchFollowState } from '../services/profileService';
import { setUserPostsLoading } from '../store/userPostsSlice';
import { setUserProfileLoading } from '../store/userProfileSlice';
import FollowButton from '../components/profile/FollowButton';
import { useFocusEffect } from '@react-navigation/native';

// Design System Colors - Sanchari Brand
const DESIGN_COLORS = {
  primary: '#FF5C02', // Sanchari Orange
  primaryText: '#3C3C3B',
  secondaryText: '#757574',
  background: '#F4F5F7',
  cardBackground: '#FFFFFF',
  border: '#E5E5E5',
  inactiveTab: '#9A9A9A',
  shadow: 'rgba(0, 0, 0, 0.05)',
  starColor: '#FF5C02', // Orange stars for ratings
};

type TabType = 'posts' | 'bio' | 'memories' | 'references' | 'saved';

const { width } = Dimensions.get('window');
const POST_SIZE = (width - 40 - 6) / 3; // 3 columns with 2px gaps and 20px padding

export default function ProfileScreen({ navigation, route }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [fadeAnim] = useState(new Animated.Value(1));
  const { user } = useAuth();
  
  // Read userId from route params - if not provided, use current user (Main Profile Tab)
  const userId = route?.params?.userId;
  const currentUserId = user?.uid || '';
  const isOwnProfile = !userId || userId === currentUserId;
  
  // Determine which userId to use for data fetching
  // Main Profile Tab: always use currentUserId (no route params)
  // Visited Profile: use userId from route params
  const targetUserId = userId || currentUserId;

  // Get data from Redux slices
  const profileData = useSelector((state: RootState) => 
    targetUserId ? state.userProfile.userProfile[targetUserId] : null
  );
  const profileLoading = useSelector((state: RootState) => 
    targetUserId ? state.userProfile.loading[targetUserId] : false
  );
  const posts = useSelector((state: RootState) => 
    targetUserId ? state.userPosts.userPosts[targetUserId] || [] : []
  );
  const postsLoading = useSelector((state: RootState) => {
    if (!targetUserId) return false;
    // If loading state exists, use it; otherwise assume we haven't loaded yet (true)
    const loadingState = state.userPosts.loading[targetUserId];
    return loadingState !== undefined ? loadingState : true;
  });
  const followState = useSelector((state: RootState) => {
    if (!targetUserId) {
      return {
        isFollowing: false,
        isFollowedBack: false,
        followerCount: 0,
        followingCount: 0,
        isLoading: false,
      };
    }
    return state.userFollowState.userFollowState[targetUserId] || {
      isFollowing: false,
      isFollowedBack: false,
      followerCount: 0,
      followingCount: 0,
      isLoading: false,
    };
  });

  // Still use useProfileData for memories, tripCollections, and reviews
  // (these can be moved to Redux later if needed)
  const {
    memories,
    tripCollections,
    reviews,
  } = useProfileData(targetUserId);
  
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedPostsLoading, setSavedPostsLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('Traveler');
  const [isVerified, setIsVerified] = useState(false);
  
  // Calculate stats from Redux data
  // Use followState for follower count if available (more up-to-date after follow/unfollow)
  const stats = useMemo(() => {
    const followersCount = followState.followerCount > 0 
      ? followState.followerCount 
      : (profileData as any)?.followersCount || 0;
    const followingCount = followState.followingCount > 0
      ? followState.followingCount
      : (profileData as any)?.followingCount || 0;
    return {
      postsCount: posts.length,
      followersCount,
      followingCount,
    };
  }, [posts.length, profileData, followState.followerCount, followState.followingCount]);
  
  const loading = profileLoading || postsLoading;

  // Modal states
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [interestModalVisible, setInterestModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  const dispatch = useDispatch();

  // Initialize loading state immediately when targetUserId changes
  // This ensures loading state is set before async fetch completes
  useEffect(() => {
    if (!targetUserId) return;
    
    // Set loading state immediately to show loading spinner
    dispatch(setUserPostsLoading({ userId: targetUserId, loading: true }));
    dispatch(setUserProfileLoading({ userId: targetUserId, loading: true }));
  }, [targetUserId, dispatch]);

  // Fetch fresh data on mount and when screen comes into focus (every time screen opens)
  // This ensures we always get the latest data from Firestore, including:
  // - Latest profile information
  // - Latest posts
  // - Latest follow state (isFollowing, isFollowedBack, counts)
  // 
  // IMPORTANT: All Firestore operations are PERMANENT and write immediately:
  // - Likes (toggleLikePost) - updates likedBy[] array and likeCount
  // - Comments (addComment) - creates comment document
  // - Saves/Bookmarks (toggleBookmarkPost) - updates savedBy[] array
  // - Shares (toggleSharePost) - updates sharedBy[] array and shareCount
  // - Follow/Unfollow (followUser/unfollowUser) - updates following[]/followers[] arrays and counts
  // These operations NEVER undo when screen unmounts - they persist in Firestore
  // and will be reflected in the fresh data on next visit
  useFocusEffect(
    React.useCallback(() => {
      if (!targetUserId) return;
      
      // Always fetch fresh data from Firestore
      fetchUserProfile(targetUserId);
      fetchUserPosts(targetUserId);
      if (currentUserId && !isOwnProfile) {
        fetchFollowState(currentUserId, targetUserId);
      }
    }, [targetUserId, currentUserId, isOwnProfile])
  );

  // Fetch account type and verification status
  useEffect(() => {
    if (!targetUserId) return;
    const userRef = doc(db, 'users', targetUserId);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAccountType((data.accountType || data.role || 'Traveler') as AccountType);
        setIsVerified(data.verificationStatus === 'verified' || data.verified === true);
      }
    });
    return () => unsubscribe();
  }, [targetUserId]);

  // Fetch saved posts (only for current user's own profile)
  useEffect(() => {
    if (!user || activeTab !== 'saved' || !isOwnProfile) return;

    setSavedPostsLoading(true);
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, where('savedBy', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const saved = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSavedPosts(saved);
        setSavedPostsLoading(false);
      },
      (error) => {
        console.error('Error fetching saved posts:', error);
        setSavedPostsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeTab]);

  // Determine if content should be visible (Instagram-style)
  // Content is visible if: isOwnProfile OR isFollowing
  const canViewContent = isOwnProfile || followState.isFollowing;

  // Determine available tabs (references only if reviews exist, saved only for own profile)
  // Hide memories tab if not following and not own profile
  const availableTabs = useMemo(() => {
    const tabs: TabType[] = ['posts', 'bio'];
    
    // Only show memories tab if can view content
    if (canViewContent) {
      tabs.push('memories');
    }
    
    if (isOwnProfile) {
      // Only show saved tab for own profile
      tabs.push('saved');
    }
    if (reviews.length > 0) {
      tabs.push('references');
    }
    return tabs;
  }, [reviews.length, isOwnProfile, canViewContent]);

  // Reset active tab if current tab is not available (e.g., memories tab hidden)
  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab('posts');
    }
  }, [availableTabs, activeTab]);

  // Animate tab changes
  React.useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const handleEditProfile = () => {
    navigation?.push('EditProfile');
  };

  // Firebase update functions
  const updateLocation = async (value: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { location: value });
    } catch (error) {
      console.error('Error updating location:', error);
      Alert.alert('Error', 'Failed to update location. Please try again.');
    }
  };

  const updateAbout = async (value: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { aboutMe: value });
    } catch (error) {
      console.error('Error updating about:', error);
      Alert.alert('Error', 'Failed to update about information. Please try again.');
    }
  };

  const addInterest = async (value: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { interests: arrayUnion(value) });
    } catch (error) {
      console.error('Error adding interest:', error);
      Alert.alert('Error', 'Failed to add interest. Please try again.');
    }
  };

  const removeInterest = (interest: string) => {
    if (!user) return;
    Alert.alert(
      'Remove Interest',
      `Remove "${interest}" from your interests?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, { interests: arrayRemove(interest) });
            } catch (error) {
              console.error('Error removing interest:', error);
              Alert.alert('Error', 'Failed to remove interest. Please try again.');
            }
          },
        },
      ]
    );
  };

  const addCountry = async (value: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { countriesVisited: arrayUnion(value) });
    } catch (error) {
      console.error('Error adding country:', error);
      Alert.alert('Error', 'Failed to add country. Please try again.');
    }
  };

  const removeCountry = (country: string) => {
    if (!user) return;
    Alert.alert(
      'Remove Country',
      `Remove "${country}" from your visited countries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, { countriesVisited: arrayRemove(country) });
            } catch (error) {
              console.error('Error removing country:', error);
              Alert.alert('Error', 'Failed to remove country. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => {
    const displayName = profileData?.fullname || 'User';
    const username = profileData?.username || 'user';
    const userTag = profileData?.userTag || `@${username}`;
    // Use unified profile photo hook - rectangular shape for Profile Screen
    const profilePic = useProfilePhoto(targetUserId, { shape: 'rectangle' });
    const aboutMe = profileData?.aboutMe || '';
    const bio = profileData?.bio || '';
    // Bio text - prefer aboutMe, fallback to auto-generated bio
    const bioText = aboutMe || bio || '';
    
    // Get account type metadata
    const accountMetadata = getAccountTypeMetadata(accountType);
    const accountTypeDisplay = accountMetadata.displayName;

    // isOwnProfile is already determined at component level

    const handleBackPress = () => {
      if (navigation?.canGoBack?.()) {
        navigation.goBack();
      } else {
        // Fallback: navigate to Home if no screen to go back to
        navigation?.navigate('Home');
      }
    };

    return (
      <View style={styles.headerWrapper}>
        {/* Back Button - Only show when viewing other user's profile */}
        {!isOwnProfile && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color={DESIGN_COLORS.primaryText} />
          </TouchableOpacity>
        )}
        {/* Main Header Container with Layered Layout */}
        <View style={styles.headerContainer}>
          {/* Info Card - Behind the photo */}
          <View style={styles.infoCard}>
            {/* Content Container - Shifted to start beside photo */}
            <View style={styles.cardContentContainer}>
              {/* Username, Badge, Account Type, and Edit Button Row */}
              <View style={styles.usernameRow}>
                <View style={styles.usernameContainer}>
                  {username && (
                    <Text style={styles.cardUsername} numberOfLines={1}>
                      {username}
                    </Text>
                  )}
                  {/* Verified Badge */}
                  {isVerified && (
                    <View style={styles.verifiedBadge}>
                      <VerifiedBadge size={18} />
                    </View>
                  )}
                  {/* Account Type - On same row */}
                  <Text style={styles.cardAccountType}>{accountTypeDisplay}</Text>
                </View>
                {/* Edit Button - Only show for own profile */}
                {isOwnProfile ? (
                  <TouchableOpacity
                    style={styles.cardEditButton}
                    onPress={handleEditProfile}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cardEditButtonText}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  /* Follow Button - Show for visited profiles */
                  <FollowButton
                    currentUserId={currentUserId}
                    targetUserId={targetUserId}
                    followState={followState}
                    onFollowStateChange={() => {
                      // Refresh profile data and follow state to update UI
                      // This ensures content visibility updates immediately after follow/unfollow
                      fetchUserProfile(targetUserId);
                      if (currentUserId && !isOwnProfile) {
                        fetchFollowState(currentUserId, targetUserId);
                      }
                    }}
                  />
                )}
              </View>
              
              {/* Bio Text - Multi-line, max 3-4 lines */}
              {bioText ? (
                <Text style={styles.cardBio} numberOfLines={4}>
                  {bioText}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Profile Photo - In front of card with zIndex - Rectangular (no borderRadius) */}
          <View style={styles.profilePhotoBox}>
            {isDefaultProfilePhoto(profilePic) ? (
              <View style={styles.profilePhotoPlaceholder}>
                <Text style={styles.profilePhotoText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <Image 
                source={{ uri: profilePic }} 
                defaultSource={{ uri: getDefaultProfilePhoto() }}
                onError={() => {
                  // Offline/CDN failure - Image component will use defaultSource
                }}
                style={styles.profilePhotoImage} 
                resizeMode="cover" 
              />
            )}
          </View>
        </View>

        {/* Stats Section - Below Header */}
        <View style={styles.statsSection}>
          <View style={styles.statsCard}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                // Posts count - could navigate to posts grid or do nothing
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{stats.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <View style={styles.statSeparator} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                navigation?.push('Followers', {
                  profileUserId: targetUserId,
                  username: profileData?.username,
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{stats.followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statSeparator} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                navigation?.push('Followers', {
                  profileUserId: targetUserId,
                  username: profileData?.username,
                  initialTab: 'following',
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{stats.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderTabs = () => {
    const tabWidthPercent = 100 / availableTabs.length; // Equal spacing (1/3 or 1/4)

    return (
      <View style={styles.tabsContainer}>
        {availableTabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, { flex: 1 }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {tab}
              </Text>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderPostsTab = () => {
    // Content visibility: If not following and not own profile, show placeholder
    if (!canViewContent) {
      return (
        <View style={styles.lockedContainer}>
          <View style={styles.lockedIconContainer}>
            <Icon name="lock-closed" size={48} color={DESIGN_COLORS.secondaryText} />
          </View>
          <Text style={styles.lockedTitle}>This Account is Private</Text>
          <Text style={styles.lockedSubtext}>Follow to see their posts</Text>
        </View>
      );
    }

    // Show loading state if posts are still loading
    if (postsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DESIGN_COLORS.primary} />
        </View>
      );
    }

    // Only show empty state if we've finished loading and there are no posts
    if (posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubtext}>Start sharing your travel adventures!</Text>
        </View>
      );
    }

    // Ensure posts are sorted by createdAt descending (latest first)
    // This ensures the grid displays from left to right, top to bottom with newest posts first
    const sortedPosts = sortPostsByCreatedAt([...posts]);

    return (
      <View style={styles.postsGrid}>
        {sortedPosts.map((post, index) => {
          // CRITICAL: Use ONLY final cropped bitmaps - NO fallback to original images
          // Normalize post to get mediaUrls (contains final rendered bitmap URLs)
          const normalizedPost = normalizePost(post as any);
          const mediaUrls = normalizedPost.mediaUrls || [];
          
          // Use first image from mediaUrls (final cropped bitmap) or finalCroppedUrl
          // DO NOT fallback to imageUrl, imageURL, coverImage, or gallery - those might be original images
          const thumbnailUrl = mediaUrls[0] || (post as any).finalCroppedUrl || '';
          const hasMultipleImages = mediaUrls.length > 1;
          const likeCount = post.likeCount || 0;
          
          return (
            <TouchableOpacity
              key={post.id}
              style={[
                styles.postItem,
                { marginRight: index % 3 === 2 ? 0 : 2, marginBottom: 2 },
              ]}
              activeOpacity={0.9}
              onPress={() => navigation?.push('PostDetail', { postId: post.id })}
            >
              {thumbnailUrl ? (
                <>
                  <Image 
                    source={{ uri: thumbnailUrl }} 
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                  {/* Multiple images indicator */}
                  {hasMultipleImages && (
                    <View style={styles.multipleImagesIndicator}>
                      <Icon name="layers" size={16} color={DESIGN_COLORS.cardBackground} />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.postPlaceholder}>
                  <Text style={styles.placeholderText}>📷</Text>
                </View>
              )}
              {likeCount > 0 && (
                <View style={styles.postLikeOverlay}>
                  <Icon name="heart" size={12} color={DESIGN_COLORS.cardBackground} />
                  <Text style={styles.postLikeCount}>{likeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderBioTab = () => {
    const { location, aboutMe, interests, countriesVisited, bio } = profileData || {};

    return (
      <>
        <ScrollView style={styles.bioContent} contentContainerStyle={styles.bioContentInner}>
          <View style={styles.bioCard}>
            {/* Bio Section - Optional, auto-generated, shown with interests */}
            {bio && (
              <View style={styles.bioSection}>
                <Text style={styles.bioSectionTitle}>Bio</Text>
                <Text style={styles.bioTextReadOnly}>{bio}</Text>
                <Text style={styles.bioHint}>Auto-generated from your profile</Text>
              </View>
            )}

            {/* Location Section */}
            <View style={styles.bioSection}>
              <Text style={styles.bioSectionTitle}>Location</Text>
              {location ? (
                <TouchableOpacity
                  onPress={() => setLocationModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bioLocation}>{location}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setLocationModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addButtonText}>Add your location</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* About Section - Keep for additional details */}
            <View style={styles.bioSection}>
              <Text style={styles.bioSectionTitle}>
                About {profileData?.fullname || profileData?.username || 'You'}
              </Text>
              {aboutMe ? (
                <TouchableOpacity
                  onPress={() => setAboutModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bioText}>{aboutMe}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setAboutModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addButtonText}>Add about information</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Interests Section */}
            <View style={styles.bioSection}>
              <Text style={styles.bioSectionTitle}>Interests</Text>
              <View style={styles.chipsContainer}>
                {interests && interests.length > 0 ? (
                  interests.map((interest, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.chip}
                      onLongPress={() => removeInterest(interest)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipText}>{interest}</Text>
                    </TouchableOpacity>
                  ))
                ) : null}
                <TouchableOpacity
                  onPress={() => setInterestModalVisible(true)}
                  style={styles.addChipButton}
                  activeOpacity={0.7}
                >
                  <Icon name="add" size={14} color={DESIGN_COLORS.primary} />
                  <Text style={styles.addChipText}>Add interests</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Countries Visited Section */}
            <View style={styles.bioSection}>
              <Text style={styles.bioSectionTitle}>Countries I have visited</Text>
              <View style={styles.chipsContainer}>
                {countriesVisited && countriesVisited.length > 0 ? (
                  countriesVisited.map((country, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.chip}
                      onLongPress={() => removeCountry(country)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipText}>{country}</Text>
                    </TouchableOpacity>
                  ))
                ) : null}
                <TouchableOpacity
                  onPress={() => setCountryModalVisible(true)}
                  style={styles.addChipButton}
                  activeOpacity={0.7}
                >
                  <Icon name="add" size={14} color={DESIGN_COLORS.primary} />
                  <Text style={styles.addChipText}>Add countries</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Input Modals */}
        <InputModal
          visible={locationModalVisible}
          title="Add Location"
          placeholder="Enter your location"
          initialValue={location}
          onSave={updateLocation}
          onClose={() => setLocationModalVisible(false)}
        />

        <InputModal
          visible={aboutModalVisible}
          title="About You"
          placeholder="Tell others about yourself..."
          initialValue={aboutMe}
          onSave={updateAbout}
          onClose={() => setAboutModalVisible(false)}
          multiline
        />

        <InputModal
          visible={interestModalVisible}
          title="Add Interest"
          placeholder="Add interest (e.g., Hiking, Food, Photography)"
          onSave={addInterest}
          onClose={() => setInterestModalVisible(false)}
        />

        <InputModal
          visible={countryModalVisible}
          title="Add Country"
          placeholder="Enter country name"
          onSave={addCountry}
          onClose={() => setCountryModalVisible(false)}
        />
      </>
    );
  };

  const renderMemoriesTab = () => {
    // Content visibility: If not following and not own profile, show placeholder
    if (!canViewContent) {
      return (
        <View style={styles.lockedContainer}>
          <View style={styles.lockedIconContainer}>
            <Icon name="lock-closed" size={48} color={DESIGN_COLORS.secondaryText} />
          </View>
          <Text style={styles.lockedTitle}>This Account is Private</Text>
          <Text style={styles.lockedSubtext}>Follow to see their memories</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.memoriesContent} contentContainerStyle={styles.memoriesContentInner}>
        <View style={styles.memoriesCard}>
          {/* Trip Collections - Horizontal Scroll */}
          {tripCollections.length > 0 && (
            <View style={styles.memoriesSection}>
              <Text style={styles.memoriesSectionTitle}>Trip Collections</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tripsScroll}
              >
                {tripCollections.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={styles.tripCard}
                    activeOpacity={0.9}
                  >
                    {trip.coverImage ? (
                      <Image source={{ uri: trip.coverImage }} style={styles.tripImage} />
                    ) : (
                      <View style={styles.tripImagePlaceholder}>
                        <Text style={styles.tripPlaceholderText}>✈️</Text>
                      </View>
                    )}
                    <View style={styles.tripOverlay}>
                      <Text style={styles.tripName} numberOfLines={1}>
                        {trip.name}
                      </Text>
                      <Text style={styles.tripCount}>{trip.memoryCount} memories</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Memories Grid */}
          {memories.length > 0 && (
            <View style={styles.memoriesSection}>
              <Text style={styles.memoriesSectionTitle}>All Memories</Text>
              <View style={styles.memoriesGrid}>
                {memories.map((memory) => {
                  const imageUrl = memory.imageURL;
                  return (
                    <TouchableOpacity
                      key={memory.id}
                      style={styles.memoryItem}
                      activeOpacity={0.9}
                    >
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.memoryImage} />
                      ) : (
                        <View style={styles.memoryPlaceholder}>
                          <Text style={styles.memoryPlaceholderText}>📸</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {tripCollections.length === 0 && memories.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No memories yet</Text>
              <Text style={styles.emptySubtext}>Start creating trips and sharing moments!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderSavedPostsTab = () => {
    if (savedPostsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DESIGN_COLORS.primary} />
        </View>
      );
    }

    if (savedPosts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="bookmark-outline" size={48} color={DESIGN_COLORS.border} />
          <Text style={styles.emptyText}>No saved posts yet</Text>
          <Text style={styles.emptySubtext}>Bookmark posts you love to find them later!</Text>
        </View>
      );
    }

    return (
      <View style={styles.postsGrid}>
        {savedPosts.map((post, index) => {
          const imageUrl = post.imageURL || post.imageUrl || post.coverImage || (post.gallery && post.gallery[0]);
          return (
            <TouchableOpacity
              key={post.id}
              style={[
                styles.postItem,
                { marginRight: index % 3 === 2 ? 0 : 2, marginBottom: 2 },
              ]}
              activeOpacity={0.9}
              onPress={() => {
                // Navigate to post detail
                navigation?.push('PostDetail', { postId: post.id });
              }}
            >
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.postImage} />
              ) : (
                <View style={styles.postPlaceholder}>
                  <Text style={styles.placeholderText}>📷</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderReferencesTab = () => {
    const overallRating = useMemo(() => {
      if (reviews.length === 0) return 0;
      const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
      return Math.round((sum / reviews.length) * 10) / 10;
    }, [reviews]);

    const renderStars = (rating: number) => {
      return Array.from({ length: 5 }).map((_, index) => {
        const filled = index < Math.floor(rating);
        const halfFilled = index === Math.floor(rating) && rating % 1 >= 0.5;
        return (
          <Icon
            key={index}
            name={filled ? 'star' : halfFilled ? 'star-half' : 'star-outline'}
            size={20}
            color={DESIGN_COLORS.starColor}
          />
        );
      });
    };

    return (
      <ScrollView style={styles.reviewsContent} contentContainerStyle={styles.reviewsContentInner}>
        {/* Overall Rating */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingStarsContainer}>
            {renderStars(overallRating)}
          </View>
        </View>

        {/* Review Cards */}
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              {review.reviewerPhoto ? (
                <Image source={{ uri: review.reviewerPhoto }} style={styles.reviewerPhoto} />
              ) : (
                <View style={styles.reviewerPhotoPlaceholder}>
                  <Text style={styles.reviewerPhotoText}>
                    {review.reviewerName?.charAt(0).toUpperCase() || 'A'}
                  </Text>
                </View>
              )}
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName}>{review.reviewerName || 'Anonymous'}</Text>
                <View style={styles.reviewStars}>
                  {renderStars(review.rating)}
                </View>
              </View>
            </View>
            {review.feedback && (
              <Text style={styles.reviewFeedback}>{review.feedback}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={DESIGN_COLORS.primary} />
        </View>
      );
    }

    switch (activeTab) {
      case 'posts':
        return (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {renderPostsTab()}
          </Animated.View>
        );
      case 'bio':
        return (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {renderBioTab()}
          </Animated.View>
        );
      case 'memories':
        return (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {renderMemoriesTab()}
          </Animated.View>
        );
      case 'references':
        return (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {renderReferencesTab()}
          </Animated.View>
        );
      case 'saved':
        return (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {renderSavedPostsTab()}
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        {renderHeader()}
        <View style={styles.tabsWrapper}>
          {renderTabs()}
        </View>

        {/* Tab Content - No card wrapper, content centered */}
        <View style={styles.contentWrapper}>
          {renderTabContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerWrapper: {
    backgroundColor: DESIGN_COLORS.background,
    paddingTop: 16, // Reduced top spacing
    paddingHorizontal: 16,
    paddingBottom: 0,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DESIGN_COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContainer: {
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
    minHeight: 130, // Match photo height
    marginBottom: 8, // Space between header and stats: ~8px
  },
  profilePhotoBox: {
    width: 100, // Reduced from 120
    height: 130, // Reduced from 160 - more compact - Rectangular ratio (100x130)
    borderRadius: 12, // Smooth rounded corners for premium look
    overflow: 'hidden',
    backgroundColor: DESIGN_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 2, // Above the card
  },
  profilePhotoImage: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: DESIGN_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoText: {
    fontSize: 48,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.cardBackground,
  },
  infoCard: {
    position: 'absolute',
    left: 70, // Starts behind photo - card position unchanged
    right: 16,
    top: 8, // Reduced top offset
    backgroundColor: '#FFFAEE', // Warm off-white / cream tone matching reference
    borderRadius: 24, // Increased for smoother, more rounded corners
    paddingHorizontal: 0, // No horizontal padding - handled by content container
    paddingVertical: 12, // Premium padding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'flex-start', // Start from top
    alignItems: 'flex-start', // Left align content
    minHeight: 110, // Match photo height
    zIndex: 1, // Behind the photo
  },
  cardContentContainer: {
    paddingLeft: 44, // Shift content to start beside photo (30px base + 14px spacing = 44px total)
    paddingRight: 14, // Right padding
    paddingTop: 11, // 10-12px range - separates content from card top
    paddingBottom: 8, // Separates content from card bottom
    width: '100%',
  },
  usernameRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3, // Spacing before bio (2-4px)
  },
  usernameContainer: {
    flex: 1, // Take available space
    flexDirection: 'row',
    alignItems: 'center', // Align on same vertical baseline
    marginRight: 8, // Space before button
    flexWrap: 'wrap', // Allow wrapping if needed
    gap: 5, // Small gap (4-6px) between elements
  },
  cardUsername: {
    fontSize: 19, // 18-20px range
    fontFamily: Fonts.semibold, // Poppins-SemiBold
    color: '#222', // Username color for contrast
    textAlign: 'left', // Left align
    lineHeight: 22, // Consistent line height for baseline alignment
    marginRight: 0, // Gap handled by container gap
  },
  verifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0, // Gap handled by container gap
  },
  cardAccountType: {
    fontSize: 11, // Smaller font for account type
    fontFamily: Fonts.medium, // Poppins-Medium
    color: DESIGN_COLORS.primary, // Use theme primary color
    textAlign: 'left',
    lineHeight: 22, // Match username lineHeight for baseline alignment
    marginRight: 0, // Gap handled by container gap
  },
  cardBio: {
    fontSize: 12, // Reduced from 13.5px
    fontFamily: Fonts.regular, // Poppins-Regular
    color: '#444', // Bio color for contrast
    lineHeight: 16, // Reduced line-height
    marginTop: 0, // No top margin
    marginBottom: 0, // No bottom margin
    textAlign: 'left', // Left align (Instagram style)
  },
  cardEditButton: {
    backgroundColor: DESIGN_COLORS.primary,
    paddingVertical: 6, // Smaller height
    paddingHorizontal: 14, // Compact padding
    borderRadius: 16, // Rounded corners
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, // Subtle shadow
    shadowRadius: 2,
    elevation: 2,
    minWidth: 60, // Minimum width for touch target
    height: 28, // Smaller, premium size
  },
  cardEditButtonText: {
    fontSize: 12, // Smaller font
    fontFamily: Fonts.semibold, // Poppins-SemiBold for premium look
    color: '#FFFFFF', // Button text color
    letterSpacing: 0.3, // Premium letter spacing
  },
  statsSection: {
    paddingVertical: 0, // No vertical padding - handled by card
    paddingHorizontal: 20, // Increased padding to make stats card 6-10px narrower than header
    marginBottom: 10, // Space between stats and tabs: ~10px
    marginTop: 0, // Spacing handled by headerContainer marginBottom
    alignItems: 'center', // Center the stats card
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: 8, // Reduced to match header proportion (header: 18, stats: 8)
    paddingVertical: 2.5, // Reduced by ~40% (from 4px to 2.5px)
    paddingHorizontal: 14, // Reduced padding - narrower than header
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 0, // Remove extra margin
    marginTop: 0, // Remove extra margin
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statSeparator: {
    width: 1,
    height: 28, // Reduced height for tight spacing
    backgroundColor: DESIGN_COLORS.border,
    marginHorizontal: 12, // More horizontal spacing (Instagram style)
  },
  statNumber: {
    fontSize: 15.5, // 15-16px range
    fontFamily: Fonts.semibold, // Poppins-SemiBold
    color: '#1A1A1A', // Dark black for visibility
    marginBottom: 2, // Very tight vertical spacing
  },
  statLabel: {
    fontSize: 12.5, // 12-13px range
    fontFamily: Fonts.regular, // Poppins-Regular
    color: '#4D4D4D', // Dark grey for visibility
    textTransform: 'capitalize',
  },
  tabsWrapper: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    marginBottom: 20,
    marginTop: 0, // Stats section already has bottom margin
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: DESIGN_COLORS.border,
  },
  tab: {
    paddingVertical: 16,
    position: 'relative',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    textTransform: 'lowercase',
  },
  tabTextActive: {
    color: DESIGN_COLORS.primary,
    fontFamily: Fonts.semibold,
  },
  tabTextInactive: {
    color: DESIGN_COLORS.inactiveTab,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: DESIGN_COLORS.primary,
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  postItem: {
    width: POST_SIZE,
    height: POST_SIZE,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: DESIGN_COLORS.border,
  },
  postPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    backgroundColor: DESIGN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  postLikeOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  postLikeCount: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: DESIGN_COLORS.cardBackground,
  },
  multipleImagesIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioContent: {
    flex: 1,
    width: '100%',
  },
  bioContentInner: {
    paddingBottom: 20,
  },
  bioCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    width: width - 32,
  },
  bioSection: {
    marginBottom: 16,
  },
  bioSectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    fontWeight: '600',
    color: '#3C3C3B',
    marginBottom: 6,
    textAlign: 'left',
  },
  bioText: {
    fontSize: 12.5, // Reduced from 14px
    fontFamily: Fonts.regular,
    color: '#3C3C3B',
    lineHeight: 18, // Reduced line-height
    textAlign: 'left',
  },
  bioTextReadOnly: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#3C3C3B',
    lineHeight: 20,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  bioHint: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: DESIGN_COLORS.secondaryText,
    marginTop: 4,
    fontStyle: 'italic',
  },
  bioLocation: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#3C3C3B',
    textAlign: 'left',
  },
  addButtonText: {
    fontSize: 13.5,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    color: '#FF5C02',
    textAlign: 'left',
    marginVertical: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#FF5C02',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: DESIGN_COLORS.cardBackground,
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    color: '#3C3C3B',
  },
  addChipButton: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#FF5C02',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: DESIGN_COLORS.cardBackground,
    gap: 6,
  },
  addChipText: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    color: '#FF5C02',
  },
  memoriesContent: {
    flex: 1,
    width: '100%',
  },
  memoriesContentInner: {
    paddingBottom: 20,
  },
  memoriesCard: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: 0,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
  },
  memoriesSection: {
    marginBottom: 24,
  },
  memoriesSectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.primaryText,
    marginBottom: 16,
    textAlign: 'left',
  },
  tripsScroll: {
    gap: 12,
  },
  tripCard: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: DESIGN_COLORS.border,
    marginRight: 12,
  },
  tripImage: {
    width: '100%',
    height: '100%',
  },
  tripImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: DESIGN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripPlaceholderText: {
    fontSize: 48,
  },
  tripOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  tripName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.cardBackground,
    marginBottom: 4,
  },
  tripCount: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: DESIGN_COLORS.cardBackground,
  },
  memoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  memoryItem: {
    width: (width - 40 - 4) / 3, // 40px card padding + 4px gaps
    height: (width - 40 - 4) / 3,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 2,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: DESIGN_COLORS.border,
  },
  memoryPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: DESIGN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryPlaceholderText: {
    fontSize: 32,
  },
  reviewsContent: {
    flex: 1,
    width: '100%',
  },
  reviewsContentInner: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
    width: '100%',
    maxWidth: 600,
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewCard: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    maxWidth: 600,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reviewerPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DESIGN_COLORS.border,
  },
  reviewerPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DESIGN_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerPhotoText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.cardBackground,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.primaryText,
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewFeedback: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: DESIGN_COLORS.primaryText,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: DESIGN_COLORS.primaryText,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: DESIGN_COLORS.secondaryText,
    textAlign: 'center',
  },
  lockedContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  lockedIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: DESIGN_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.primaryText,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedSubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: DESIGN_COLORS.secondaryText,
    textAlign: 'center',
  },
});
