/**
 * ExploreScreen
 * 
 * Displays categorized posts with real-time updates from Firestore.
 * Features premium UI matching the design reference with animations.
 * Shows ratings auto-calculated from reviews, joined counts, and avatars.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../utils/colors';
import { db } from '../api/authService';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import CustomText from '../components/CustomText';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const SMALL_CARD_WIDTH = width * 0.75;

// Post type interface matching Firestore structure
interface Post {
  id: string;
  type: 'trip' | 'bnb' | 'ride' | 'event' | 'guide' | 'reel';
  title: string;
  location: string;
  duration?: string;
  dateRange?: string;
  startDate?: Timestamp | Date;
  endDate?: Timestamp | Date;
  price?: number;
  rating?: number | null;
  reviewCount?: number;
  joinedCount?: number;
  joinedProfiles?: string[];
  coverImage: string;
  gallery?: string[];
  tags?: string[];
  description?: string;
  hostId: string;
  hostType: 'TravelHost' | 'Agency' | 'Explorer' | 'AdventurePartner' | 'Creator' | 'StayHost';
  createdAt: Timestamp | Date;
}

export default function ExploreScreen({ navigation }: any) {
  const { user, initialized } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Wait for auth initialization before loading data
  useEffect(() => {
    if (!initialized) {
      return;
    }
    
    // Real-time listener for posts
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts: Post[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];
        setPosts(fetchedPosts);
        setLoading(false);
        
        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [initialized]);

  // Filter posts by search query (location-based filtering)
  const filteredPosts = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return posts;
    }
    
    const queryLower = searchQuery.toLowerCase().trim();
    return posts.filter(
      (post) =>
        post.title?.toLowerCase().includes(queryLower) ||
        post.location?.toLowerCase().includes(queryLower)
    );
  }, [posts, searchQuery]);

  // Categorize posts (memoized for performance)
  const trips = React.useMemo(
    () => filteredPosts.filter((p) => p.type === 'trip'),
    [filteredPosts]
  );
  const bnbs = React.useMemo(
    () => filteredPosts.filter((p) => p.type === 'bnb'),
    [filteredPosts]
  );
  const rides = React.useMemo(
    () => filteredPosts.filter((p) => p.type === 'ride'),
    [filteredPosts]
  );
  const events = React.useMemo(
    () => filteredPosts.filter((p) => p.type === 'event'),
    [filteredPosts]
  );
  const guides = React.useMemo(
    () => filteredPosts.filter((p) => p.type === 'guide'),
    [filteredPosts]
  );
  const reels = React.useMemo(
    () => filteredPosts.filter((p) => p.type === 'reel'),
    [filteredPosts]
  );

  // Popular trips (top rated)
  const popularTrips = React.useMemo(
    () =>
      [...trips]
        .filter((p) => p.rating !== null && p.rating !== undefined)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 10),
    [trips]
  );

  // All popular trip packages (for the bottom section)
  const allPopularTrips = React.useMemo(
    () =>
      [...trips]
        .filter((p) => p.rating !== null && p.rating !== undefined)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0)),
    [trips]
  );

  // Sanchari recommendations (mix of high-rated across categories)
  const recommendations = React.useMemo(
    () =>
      [
        ...trips.slice(0, 3),
        ...bnbs.slice(0, 2),
        ...guides.slice(0, 2),
      ]
        .filter((p) => p.rating && p.rating >= 4)
        .slice(0, 5),
    [trips, bnbs, guides]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading amazing destinations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header with Hamburger and Search */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="menu" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={colors.mutedText} style={styles.searchIconInside} />
          <TextInput
            style={styles.searchBar}
            placeholder="Search destinations or locations"
            placeholderTextColor={colors.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Icon name="close-circle" size={20} color={colors.mutedText} />
            </TouchableOpacity>
          )}
        </View>

        <CustomText weight="bold" style={styles.mainTitle}>
          Where do you want to go?
        </CustomText>

        <FlatList
          data={[
            { key: 'popular', title: '🏆 Popular Trips', data: popularTrips, type: 'trip' },
            { key: 'categories', title: '🌄 Categories', data: [], type: 'trip' },
            { key: 'explore', title: '✨ Explore like Sanchari!', data: recommendations, type: 'mixed' },
            { key: 'allTrips', title: '📋 All Popular Trip Package', data: allPopularTrips, type: 'trip', vertical: true },
            { key: 'stays', title: '🏠 Stays & BnB Homes', data: bnbs, type: 'bnb' },
            { key: 'rides', title: '🚗 Ride Sharing', data: rides, type: 'ride' },
            { key: 'events', title: '🎯 Adventure Events', data: events, type: 'event' },
            { key: 'guides', title: '🗺️ Local Explorers / Guides', data: guides, type: 'guide' },
            { key: 'reels', title: '⭐ Creator Highlights', data: reels, type: 'reel' },
          ]}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.key === 'categories') {
              return <CategoriesSection />;
            }
            return (
              <SectionRenderer
                item={item}
                searchQuery={searchQuery}
                navigation={navigation}
                user={user}
              />
            );
          }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

// Categories Section Component
function CategoriesSection() {
  const categories = [
    { name: 'Mountains', icon: '🏔️', color: '#5D9A94' },
    { name: 'Camp', icon: '⛺', color: '#5D9A94' },
    { name: 'Beach', icon: '🏖️', color: '#87CEEB' },
    { name: 'Forest', icon: '🌲', color: '#87CEEB' },
  ];

  return (
    <View style={styles.section}>
      <CustomText weight="bold" style={styles.sectionTitle}>
        Categories
      </CustomText>
      <View style={styles.categoriesContainer}>
        {categories.map((cat, index) => (
          <TouchableOpacity key={index} style={styles.categoryItem}>
            <View style={[styles.categoryCircle, { backgroundColor: cat.color }]}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
            </View>
            <Text style={styles.categoryLabel}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Empty State Component
function EmptyState({ message, icon = 'compass-outline' }: { message: string; icon?: string }) {
  return (
    <View style={styles.emptyState}>
      <Icon name={icon as any} size={48} color={colors.mutedText} />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

// Section Renderer Component - Handles all section types consistently
function SectionRenderer({ item, searchQuery, navigation, user }: { 
  item: { key: string; title: string; data: Post[]; type: string; vertical?: boolean }; 
  searchQuery: string;
  navigation: any;
  user?: any;
}) {
  const emptyMessage = searchQuery.trim()
    ? `No packages found for "${searchQuery}" in this section.`
    : 'No packages available yet.';

  return (
    <View style={styles.section}>
      <CustomText weight="bold" style={styles.sectionTitle}>
        {item.title}
      </CustomText>
      {item.key === 'explore' && (
        <Text style={styles.subtitle}>Hand Picked Choices for you....</Text>
      )}
      {item.data.length === 0 ? (
        <EmptyState message={emptyMessage} icon="compass-outline" />
      ) : item.vertical ? (
        <VerticalTripList trips={item.data} navigation={navigation} />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={item.data}
          keyExtractor={(post) => post.id}
          contentContainerStyle={styles.horizontalList}
          ListEmptyComponent={<EmptyState message={emptyMessage} icon="compass-outline" />}
          renderItem={({ item: post }) => (
            <TripCard 
              post={post} 
              navigation={navigation} 
              large={item.key === 'popular'}
              user={user}
            />
          )}
        />
      )}
    </View>
  );
}

// Trip Card Component (for horizontal scrolling)
function TripCard({ post, navigation, large = false, user }: { post: Post; navigation: any; large?: boolean; user?: any }) {
  const cardWidth = large ? CARD_WIDTH : SMALL_CARD_WIDTH;
  const [favorite, setFavorite] = useState(false);

  const handleFavoritePress = async () => {
    if (!user) {
      return; // Auth check is handled in favoriteService
    }
    
    try {
      const { addToFavorites, removeFromFavorites, isFavorited } = await import('../utils/favoriteService');
      const currentlyFavorited = await isFavorited(post.id);
      
      if (currentlyFavorited) {
        await removeFromFavorites(post.id);
        setFavorite(false);
      } else {
        await addToFavorites(post.id);
        setFavorite(true);
      }
    } catch (error: any) {
      // Error already shown in favoriteService via Alert
      console.error('Error toggling favorite:', error);
    }
  };

  // Check favorite status on mount
  React.useEffect(() => {
    if (user) {
      import('../utils/favoriteService').then(({ isFavorited }) => {
        isFavorited(post.id).then(setFavorite);
      });
    }
  }, [post.id, user]);

  return (
    <TouchableOpacity
      style={[styles.tripCard, { width: cardWidth }]}
      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: post.coverImage || 'https://via.placeholder.com/300' }}
        style={styles.tripCardImage}
        resizeMode="cover"
      />
      <View style={styles.tripCardOverlay}>
        <View style={styles.tripCardHeader}>
          <View>
            <CustomText weight="bold" style={styles.tripCardTitle}>
              {post.title}
            </CustomText>
            {post.duration && (
              <CustomText style={styles.tripCardDuration}>{post.duration}</CustomText>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleFavoritePress();
          }}
        >
          <Icon
            name={favorite ? 'heart' : 'heart-outline'}
            size={24}
            color={favorite ? '#EF4444' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
      {!large && post.location && (
        <View style={styles.tripCardFooter}>
          <CustomText weight="semiBold" style={styles.tripCardLocation}>
            {post.location}
          </CustomText>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Vertical Trip List (for "All Popular Trip Package" section)
function VerticalTripList({ trips, navigation }: { trips: Post[]; navigation: any }) {
  return (
    <View style={styles.verticalList}>
      {trips.map((trip) => (
        <TouchableOpacity
          key={trip.id}
          style={styles.verticalTripCard}
          onPress={() => navigation.navigate('PostDetail', { postId: trip.id })}
        >
          <Image
            source={{ uri: trip.coverImage || 'https://via.placeholder.com/150' }}
            style={styles.verticalTripImage}
            resizeMode="cover"
          />
          <View style={styles.verticalTripContent}>
            <View style={styles.verticalTripHeader}>
              <CustomText weight="bold" style={styles.verticalTripTitle}>
                {trip.title}
              </CustomText>
              {trip.price !== undefined && (
                <View style={styles.priceBadge}>
                  <CustomText weight="bold" style={styles.priceBadgeText}>
                    ${trip.price}
                  </CustomText>
                </View>
              )}
            </View>

            {trip.dateRange && (
              <View style={styles.verticalTripMeta}>
                <Icon name="calendar-outline" size={14} color={colors.mutedText} />
                <Text style={styles.verticalTripMetaText}>{trip.dateRange}</Text>
              </View>
            )}

            <View style={styles.verticalTripMeta}>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name="star"
                    size={14}
                    color={trip.rating && trip.rating >= star ? '#FFD700' : '#E5E5E5'}
                  />
                ))}
                {trip.rating !== null && trip.rating !== undefined && (
                  <Text style={styles.ratingText}>{trip.rating.toFixed(1)}</Text>
                )}
              </View>
            </View>

            {trip.joinedCount !== undefined && (
              <View style={styles.joinedContainer}>
                <View style={styles.joinedAvatars}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.avatarCircle, { marginLeft: i > 1 ? -8 : 0 }]} />
                  ))}
                </View>
                <Text style={styles.joinedText}>{trip.joinedCount} Person Joined</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.mutedText,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
    paddingLeft: 8,
  },
  searchIconInside: {
    marginRight: 4,
  },
  clearButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    marginVertical: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  mainTitle: {
    fontSize: 24,
    color: colors.text,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    color: colors.primary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  horizontalList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  tripCard: {
    height: 220,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripCardImage: {
    width: '100%',
    height: '100%',
  },
  tripCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
    padding: 12,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripCardTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tripCardDuration: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  tripCardFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  tripCardLocation: {
    fontSize: 14,
    color: colors.text,
  },
  favoriteButton: {
    padding: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  verticalList: {
    paddingHorizontal: 16,
  },
  verticalTripCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  verticalTripImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
  },
  verticalTripContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  verticalTripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  verticalTripTitle: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  priceBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  verticalTripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  verticalTripMetaText: {
    fontSize: 12,
    color: colors.mutedText,
    marginLeft: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 6,
    fontWeight: '600',
  },
  joinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  joinedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  joinedText: {
    fontSize: 12,
    color: colors.mutedText,
    marginLeft: 8,
  },
});
