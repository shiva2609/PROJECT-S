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

import React, { useState, useMemo } from 'react';
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
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import InputModal from '../components/profile/InputModal';

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

type TabType = 'posts' | 'bio' | 'memories' | 'references';

const { width } = Dimensions.get('window');
const POST_SIZE = (width - 40 - 6) / 3; // 3 columns with 2px gaps and 20px padding

export default function ProfileScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [fadeAnim] = useState(new Animated.Value(1));
  const { user } = useAuth();

  const {
    profileData,
    stats,
    posts,
    memories,
    tripCollections,
    reviews,
    loading,
  } = useProfileData();

  // Modal states
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [interestModalVisible, setInterestModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  // Determine available tabs (references only if reviews exist)
  const availableTabs = useMemo(() => {
    const tabs: TabType[] = ['posts', 'bio', 'memories'];
    if (reviews.length > 0) {
      tabs.push('references');
    }
    return tabs;
  }, [reviews.length]);

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
    navigation?.navigate('EditProfile');
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
    const profilePic = profileData?.profilePic;

    return (
      <View style={styles.headerContainer}>
        {/* Left Side: Profile Picture and Name */}
        <View style={styles.profileLeftContainer}>
          <View style={styles.profilePicContainer}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.profilePic} />
            ) : (
              <View style={styles.profilePicPlaceholder}>
                <Text style={styles.profilePicText}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          {/* Name below profile photo */}
          <Text style={styles.nameBelowPic}>{displayName}</Text>
        </View>

        {/* Right Side: Stats and Edit Button */}
        <View style={styles.profileRightContainer}>
          {/* Stats Row - Horizontal */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{stats.postsCount}</Text>
              <Text style={styles.statLabel}>posts</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{stats.followersCount}</Text>
              <Text style={styles.statLabel}>followers</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{stats.followingCount}</Text>
              <Text style={styles.statLabel}>following</Text>
            </View>
          </View>

          {/* Edit Profile Button - Centered below stats */}
          <View style={styles.editButtonContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Edit profile</Text>
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
    if (posts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubtext}>Start sharing your travel adventures!</Text>
        </View>
      );
    }

    return (
      <View style={styles.postsGrid}>
        {posts.map((post, index) => {
          const imageUrl = post.imageURL || post.coverImage || (post.gallery && post.gallery[0]);
          const likeCount = post.likeCount || 0;
          return (
            <TouchableOpacity
              key={post.id}
              style={[
                styles.postItem,
                { marginRight: index % 3 === 2 ? 0 : 2, marginBottom: 2 },
              ]}
              activeOpacity={0.9}
            >
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.postImage} />
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
            {/* Bio Section - Read-only, auto-generated */}
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
        <View style={styles.headerWrapper}>
          {renderHeader()}
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
    backgroundColor: DESIGN_COLORS.cardBackground,
    marginBottom: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 24,
  },
  profileLeftContainer: {
    alignItems: 'center',
  },
  profilePicContainer: {
    marginBottom: 12,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: DESIGN_COLORS.border,
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: DESIGN_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicText: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.cardBackground,
  },
  nameBelowPic: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: DESIGN_COLORS.primaryText,
    textAlign: 'center',
  },
  profileRightContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 32,
    marginBottom: 16,
  },
  statBlock: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: DESIGN_COLORS.primaryText,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: DESIGN_COLORS.secondaryText,
    textTransform: 'lowercase',
  },
  editButtonContainer: {
    alignItems: 'flex-start',
  },
  editButton: {
    backgroundColor: '#FF5C02', // Sanchari Orange
    paddingHorizontal: 68,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: DESIGN_COLORS.cardBackground,
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
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#3C3C3B',
    lineHeight: 20,
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
});
