import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../api/authService';
import { toggleLikePost, toggleBookmarkPost, toggleSharePost, Post } from '../api/firebaseService';
import { formatTimestamp, parseHashtags } from '../utils/postHelpers';
import { normalizePost } from '../utils/postUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetailScreen({ navigation, route }: any) {
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    const postRef = doc(db, 'posts', postId);
    const unsubscribe = onSnapshot(postRef, (snapshot) => {
      if (snapshot.exists()) {
        const postData = { id: snapshot.id, ...snapshot.data() } as Post;
        
        // CRITICAL: Log raw post data to debug image URL issues
        console.log('🔵 [PostDetailScreen] Raw post data from Firestore:', {
          id: postData.id,
          hasMediaUrls: Array.isArray(postData.mediaUrls) && postData.mediaUrls.length > 0,
          mediaUrlsCount: postData.mediaUrls?.length || 0,
          hasFinalCroppedUrl: !!(postData as any).finalCroppedUrl,
          finalCroppedUrl: ((postData as any).finalCroppedUrl || '').substring(0, 50) + '...',
          hasMediaArray: Array.isArray(postData.media) && postData.media.length > 0,
          mediaArrayCount: postData.media?.length || 0,
          hasImageUrl: !!postData.imageUrl,
          imageUrl: (postData.imageUrl || '').substring(0, 50) + '...',
          ratio: (postData as any).ratio,
          aspectRatio: (postData as any).aspectRatio,
        });
        
        // Normalize post to ensure mediaUrls exists (prioritizes final cropped bitmaps)
        const normalizedPost = normalizePost(postData);
        
        // CRITICAL: Log normalized post data to verify correct URLs are used
        console.log('🔵 [PostDetailScreen] Normalized post data:', {
          id: normalizedPost.id,
          mediaUrlsCount: normalizedPost.mediaUrls?.length || 0,
          mediaUrls: normalizedPost.mediaUrls?.map((url: string) => url.substring(0, 50) + '...') || [],
          finalCroppedUrl: ((normalizedPost as any).finalCroppedUrl || '').substring(0, 50) + '...',
          ratio: (normalizedPost as any).ratio,
          aspectRatio: (normalizedPost as any).aspectRatio,
        });
        
        setPost(normalizedPost as Post);
        setIsLiked(user ? (postData.likedBy?.includes(user.uid) || false) : false);
        setIsSaved(user ? (postData.savedBy?.includes(user.uid) || false) : false);
        setCurrentImageIndex(0); // Reset to first image when post changes
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading post:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, user]);

  const handleLike = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to like posts');
      return;
    }
    try {
      const newIsLiked = await toggleLikePost(postId, user.uid);
      setIsLiked(newIsLiked);
    } catch (error: any) {
      console.error('Error toggling like:', error);
      // Handle version conflict errors gracefully (Firebase transaction retry failed)
      if (error.code === 'failed-precondition' || error.message?.includes('version')) {
        console.warn('⚠️ Version conflict detected, will retry automatically on next attempt');
        // Don't show alert for version conflicts - Firebase will retry automatically
        return;
      }
      // Only show alert for other errors
      if (error.code !== 'failed-precondition') {
        Alert.alert('Error', error.message || 'Failed to like post');
      }
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to save posts');
      return;
    }
    try {
      const newIsSaved = await toggleBookmarkPost(postId, user.uid);
      setIsSaved(newIsSaved);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save post');
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      if (user) {
        await toggleSharePost(post.id, user.uid);
      }
      // Use final cropped bitmap URL for sharing (not original image)
      const shareUrl = displayMediaUrls[0] || finalCroppedUrl || '';
      await Share.share({
        message: `${post.caption || 'Check out this post!'}${shareUrl ? `\n${shareUrl}` : ''}`,
        url: shareUrl,
      });
    } catch (error: any) {
      console.error('Error sharing post:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // CRITICAL: Use ONLY final cropped bitmaps - NO fallback to original images
  // mediaUrls contains the final rendered bitmap URLs uploaded to Firebase Storage
  // These are the exact images exported from CropAdjustScreen with fixed aspect ratios
  const mediaUrls = (post as any).mediaUrls || [];
  
  // If mediaUrls is empty, check for finalCroppedUrl (single image posts)
  // DO NOT fallback to imageUrl or coverImage - those might be original images
  const finalCroppedUrl = (post as any).finalCroppedUrl;
  const displayMediaUrls = mediaUrls.length > 0 
    ? mediaUrls 
    : (finalCroppedUrl ? [finalCroppedUrl] : []);
  
  const profilePhoto = post.profilePhoto || '';
  const location = post.location || post.placeName || '';
  const username = post.username || 'User';
  const timestamp = formatTimestamp(post.createdAt);
  const captionParts = parseHashtags(post.caption || '');
  
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };
  
  const handleDoubleTap = () => {
    handleLike();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Row */}
        <TouchableOpacity
          style={styles.profileRow}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Profile', { userId: post.userId || post.createdBy })}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileAvatar} />
          ) : (
            <View style={styles.profileAvatar}>
              <Icon name="person" size={24} color={Colors.black.qua} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{username}</Text>
            {location ? (
              <View style={styles.locationRow}>
                <Icon name="location-outline" size={12} color={Colors.black.qua} />
                <Text style={styles.locationText}>{location}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Post Images - Swipeable Carousel */}
        {displayMediaUrls.length > 0 ? (
          <View style={styles.imageCarouselContainer}>
            <FlatList
              ref={flatListRef}
              data={displayMediaUrls}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyExtractor={(item, index) => `image-${index}`}
              renderItem={({ item }) => {
                // Calculate height based on post aspect ratio (if available)
                // This ensures the final cropped bitmap displays at its native aspect ratio
                const aspectRatio = post.aspectRatio;
                const ratio = post.ratio;
                let imageHeight = 400; // Default height
                
                if (aspectRatio && aspectRatio > 0) {
                  // Use stored aspectRatio: height = width * (1 / aspectRatio)
                  imageHeight = Math.round(SCREEN_WIDTH * (1 / aspectRatio));
                } else if (ratio) {
                  // Fallback to ratio string
                  switch (ratio) {
                    case '1:1':
                      imageHeight = SCREEN_WIDTH;
                      break;
                    case '4:5':
                      imageHeight = Math.round(SCREEN_WIDTH * 1.25);
                      break;
                    case '16:9':
                      imageHeight = Math.round(SCREEN_WIDTH * 0.5625);
                      break;
                  }
                }
                
                return (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleDoubleTap}
                    style={[styles.imageContainer, { height: imageHeight }]}
                  >
                    <Image 
                      source={{ uri: item }} 
                      style={[styles.postImage, { height: imageHeight }]} 
                      resizeMode="contain" 
                    />
                  </TouchableOpacity>
                );
              }}
            />
            {/* Pagination Dots */}
            {displayMediaUrls.length > 1 && (
              <View style={styles.paginationContainer}>
                {displayMediaUrls.map((_item: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.postImage, styles.postImagePlaceholder]}>
            <Icon name="image-outline" size={48} color={Colors.black.qua} />
          </View>
        )}

        {/* Engagement Strip */}
        <View style={styles.engagementStrip}>
          <TouchableOpacity style={styles.engagementButton} activeOpacity={0.7} onPress={handleLike}>
            <View style={styles.engagementIconContainer}>
              <Icon
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={Colors.black.primary}
              />
            </View>
            <Text style={styles.engagementText}>{post.likeCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.engagementButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Comments', { postId: post.id })}
          >
            <View style={styles.engagementIconContainer}>
              <Icon name="chatbubble-outline" size={24} color={Colors.black.primary} />
            </View>
            <Text style={styles.engagementText}>{post.commentCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.engagementButton} activeOpacity={0.7} onPress={handleShare}>
            <View style={styles.engagementIconContainer}>
              <Icon name="paper-plane-outline" size={24} color={Colors.black.primary} />
            </View>
            <Text style={styles.engagementText}>{post.shareCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.engagementButton} activeOpacity={0.7} onPress={handleBookmark}>
            <View style={styles.engagementIconContainer}>
              <Icon
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color={Colors.black.primary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {post.caption ? (
          <View style={styles.captionContainer}>
            <Text style={styles.captionText}>
              {captionParts.map((part, index) => {
                if (part.isHashtag) {
                  return (
                    <Text key={index} style={styles.hashtag}>
                      {part.text}
                    </Text>
                  );
                }
                return <Text key={index}>{part.text}</Text>;
              })}
            </Text>
          </View>
        ) : null}

        {/* Timestamp */}
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
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
  content: {
    flex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white.tertiary,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  imageCarouselContainer: {
    width: '100%',
    // Height will be calculated dynamically based on post aspect ratio
    position: 'relative',
    backgroundColor: Colors.white.tertiary,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    // Height is set dynamically in renderItem based on aspect ratio
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
    // CRITICAL: Use contain to maintain exact aspect ratio of final cropped bitmap
    // Do NOT use cover - that would crop the final bitmap
  },
  postImagePlaceholder: {
    width: '100%',
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white.tertiary,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: Colors.white.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  engagementStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
    gap: 12,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engagementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementText: {
    color: Colors.black.primary,
    fontFamily: Fonts.medium,
    fontSize: 15,
    marginLeft: 4,
  },
  captionContainer: {
    padding: 16,
    backgroundColor: Colors.white.primary,
  },
  captionText: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    lineHeight: 22,
  },
  hashtag: {
    color: Colors.brand.primary,
    fontFamily: Fonts.semibold,
  },
  timestamp: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    color: Colors.black.qua,
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
});

