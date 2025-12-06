import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFollow } from '../hooks/useFollow';
import { Post } from '../api/firebaseService';
import { formatTimestamp, parseHashtags } from '../utils/postHelpers';
import { Fonts } from '../theme/fonts';
import PostCarousel, { MediaItem } from './PostCarousel';
import { normalizePost } from '../utils/postUtils';

/**
 * Calculate image height using Instagram's exact formula
 * height = width * (1 / aspectRatio)
 * 
 * Uses numeric aspectRatio field first (primary), then falls back to ratio string
 */
function getAspectRatioHeight(width: number, aspectRatio?: number, ratio?: string): number {
  // PRIMARY: Use numeric aspectRatio field (stored in post document)
  if (aspectRatio && aspectRatio > 0) {
    // Instagram formula: height = width * (1 / aspectRatio)
    return Math.round(width * (1 / aspectRatio));
  }
  
  // FALLBACK: Use ratio string if aspectRatio not available (legacy posts)
  if (ratio) {
    switch (ratio) {
      case '1:1':
        return width; // height = width * (1/1) = width
      case '4:5':
        return Math.round(width * 1.25); // height = width * (5/4) = width * 1.25
      case '16:9':
        return Math.round(width * 0.5625); // height = width * (9/16) = width * 0.5625
      default:
        return width; // default to square
    }
  }
  
  // Default fallback
  return width;
}

interface PostCardProps {
  post: Post;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onBookmark: () => void;
  onProfilePress: () => void;
  onPostDetailPress: () => void;
  currentUserId?: string;
}

function PostCard({
  post,
  isLiked,
  isSaved,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onProfilePress,
  onPostDetailPress,
  currentUserId,
}: PostCardProps) {
  const creatorId = post.createdBy || post.userId;
  const { isFollowing, toggleFollow, isLoading: followLoading } = useFollow(creatorId || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownOpacity = useRef(new Animated.Value(0)).current;
  const dropdownRef = useRef<View>(null);

  // Animate dropdown
  useEffect(() => {
    Animated.timing(dropdownOpacity, {
      toValue: showDropdown ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showDropdown]);


  // Normalize post to get mediaUrls array (Instagram-like multi-image support)
  const normalizedPost = useMemo(() => {
    const normalized = normalizePost(post as any);
    
    // Return normalized post with mediaUrls (final cropped bitmaps)
    // mediaUrls contains the final rendered bitmaps from CropAdjustScreen
    return normalized;
  }, [post]);

  // Get mediaUrls array - primary field for multi-image posts
  // This contains the FINAL cropped bitmap URLs (exact adjusted frames)
  const mediaUrls = normalizedPost.mediaUrls || [];
  
  // CRITICAL: Convert mediaUrls to MediaItem[] using ONLY final cropped bitmaps
  // DO NOT fallback to original images (imageUrl, coverImage, gallery)
  // mediaUrls contains FINAL cropped bitmap URLs (exact adjusted frames from CropAdjustScreen)
  const normalizedMedia: MediaItem[] = useMemo(() => {
    // Priority 1: mediaUrls array (contains final cropped bitmap URLs)
    if (mediaUrls.length > 0) {
      // mediaUrls array contains the FINAL cropped bitmap URLs
      // These are the exact adjusted frames exported from CropAdjustScreen
      return mediaUrls.map((url: string, index: number) => ({
        type: 'image' as const,
        uri: url, // FINAL cropped bitmap URL (exact adjusted frame)
        id: `media-${index}`,
      }));
    }
    
    // Priority 2: finalCroppedUrl (single image posts - final cropped bitmap)
    const finalCroppedUrl = (post as any).finalCroppedUrl;
    if (finalCroppedUrl && typeof finalCroppedUrl === 'string' && finalCroppedUrl.length > 0) {
      return [{ 
        type: 'image' as const, 
        uri: finalCroppedUrl, // FINAL cropped bitmap URL
        id: 'final-cropped-url' 
      }];
    }
    
    // Priority 3: Check media array (should contain final cropped bitmap URLs)
    // Only use if url/uri fields exist (these should be final cropped bitmaps from upload)
    if (Array.isArray(post.media) && post.media.length > 0) {
      const mediaItems = post.media
        .map((item: any, index: number) => {
          const url = item.url || item.uri;
          if (url && typeof url === 'string' && url.length > 0) {
            return {
              type: (item.type || 'image') as const,
              uri: url, // Should be final cropped bitmap URL
              id: item.id || `media-${index}`,
            };
          }
          return null;
        })
        .filter((item: any) => item !== null);
      
      if (mediaItems.length > 0) {
        return mediaItems;
      }
    }
    
    // NOTE: We do NOT fallback to imageUrl, coverImage, or gallery
    // These fields might contain original image URIs, which would break the fixed aspect ratio pipeline
    // Return empty array if no final cropped bitmaps are available
    return [];
  }, [mediaUrls, post.media, (post as any).finalCroppedUrl]);

  const profilePhoto = post.profilePhoto || '';
  const location = post.location || post.placeName || '';
  const username = post.username || 'User';
  const timestamp = formatTimestamp(post.createdAt);
  
  // Ensure counts never go negative
  const likeCount = Math.max(0, post.likeCount || 0);
  const commentCount = Math.max(0, post.commentCount || 0);
  const shareCount = Math.max(0, post.shareCount || 0);
  
  const hasDetails = !!post.details || !!post.caption || normalizedMedia.length > 0; // Check if post has details

  // Don't show follow button if viewing own post
  const isOwnPost = currentUserId === creatorId;

  // INSTAGRAM LOGIC: Display the FINAL cropped bitmap at its native aspect ratio
  // The final cropped bitmap already has the correct dimensions baked in:
  // - 1:1 → 1080x1080 (aspectRatio = 1.0)
  // - 4:5 → 1080x1350 (aspectRatio = 0.8)
  // - 16:9 → 1920x1080 (aspectRatio = 1.777...)
  // 
  // We simply scale it to screen width and calculate height from aspectRatio
  // NO frame recalculation - just use the stored aspectRatio from the final bitmap
  // CRITICAL: aspectRatio is set by the user during upload and MUST NEVER be changed
  const screenWidth = Dimensions.get('window').width;
  
  // Use numeric aspectRatio field (stored from final cropped bitmap)
  // aspectRatio = width/height of the final cropped bitmap
  // This is set by the user during upload and MUST be preserved exactly
  const aspectRatio = post.aspectRatio; // Numeric: 1, 0.8, 1.777, etc.
  const ratio = post.ratio; // String: '1:1', '4:5', '16:9' (fallback)
  
  // Instagram formula: width = screenWidth, height = screenWidth * (1 / aspectRatio)
  // This displays the final cropped bitmap at full screen width, maintaining its native aspect ratio
  // CRITICAL: Always use the stored aspectRatio - never override or default to a fixed value
  // This ensures consistent aspect ratio rendering across all sections (For You, Following, Profile, etc.)
  const mediaWidth = screenWidth;
  let mediaHeight: number;
  
  if (aspectRatio && aspectRatio > 0) {
    // PRIMARY: Use stored aspectRatio from post (set by user during upload)
    mediaHeight = Math.round(screenWidth * (1 / aspectRatio));
  } else if (ratio) {
    // FALLBACK: Use ratio string if aspectRatio not available (legacy posts)
    mediaHeight = getAspectRatioHeight(screenWidth, undefined, ratio);
  } else {
    // LAST RESORT: Default to square only if both are missing (should not happen for new posts)
    mediaHeight = screenWidth;
    console.warn('⚠️ [PostCard] No aspectRatio or ratio found for post', post.id, '- defaulting to square');
  }

  const renderCaption = () => {
    if (!post.caption) return null;
    const parts = parseHashtags(post.caption);
    return (
      <View style={styles.captionContainer}>
        <Text style={styles.captionText}>
          {parts.map((part, index) => {
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
    );
  };

  return (
    <View style={styles.card}>
      {/* Post Media - Use PostCarousel for multi-media support */}
      {/* INSTAGRAM LOGIC: Display final cropped bitmap at full screen width, maintaining native aspect ratio */}
      {normalizedMedia.length > 0 ? (
        <View style={{
          width: mediaWidth,
          height: mediaHeight,
          backgroundColor: 'black', // prevent ash/white gaps during load
          overflow: 'hidden',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
        }}>
          <PostCarousel 
            media={normalizedMedia} 
            ratio={post.ratio}
            aspectRatio={post.aspectRatio}
            width={mediaWidth}
            height={mediaHeight}
          />
        </View>
      ) : (
        <View style={[styles.imageContainer, styles.postImagePlaceholder]}>
          <Icon name="image-outline" size={48} color="#8E8E8E" />
        </View>
      )}

      {/* Creator Section */}
      <View style={styles.creatorSection}>
        <TouchableOpacity
          style={styles.creatorLeft}
          activeOpacity={0.8}
          onPress={onProfilePress}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImage}>
              <Icon name="person" size={20} color="#8E8E8E" />
            </View>
          )}
          <View style={styles.creatorInfo}>
            <Text style={styles.username}>{username}</Text>
            {location ? (
              <View style={styles.locationRow}>
                <Icon name="location-outline" size={12} color="#8E8E8E" />
                <Text style={styles.location}>{location}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Right Section - Dynamic */}
        <View style={styles.creatorRight}>
          {isOwnPost ? null : isFollowing ? (
            // User follows creator - Show View Details button if hasDetails
            hasDetails ? (
              <TouchableOpacity
                style={styles.viewDetailsButton}
                activeOpacity={0.8}
                onPress={onPostDetailPress}
              >
                <Text style={styles.viewDetailsText}>View Details</Text>
              </TouchableOpacity>
            ) : null
          ) : (
            // User does NOT follow - Show Follow button + dropdown
            <View style={styles.followSection}>
              <TouchableOpacity
                style={[styles.followButton, followLoading && styles.followButtonLoading]}
                activeOpacity={0.8}
                onPress={toggleFollow}
                disabled={followLoading}
              >
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
              {hasDetails && (
                <TouchableOpacity
                  style={styles.dropdownButton}
                  activeOpacity={0.8}
                  onPress={() => setShowDropdown(!showDropdown)}
                >
                  <Icon name="chevron-down" size={16} color="#000000" />
                </TouchableOpacity>
              )}
              {hasDetails && showDropdown && (
                <Animated.View
                  ref={dropdownRef}
                  style={[
                    styles.dropdown,
                    { opacity: dropdownOpacity },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      setShowDropdown(false);
                      onPostDetailPress();
                    }}
                  >
                    <Text style={styles.dropdownItemText}>View Details</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Icon Row */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconGroup}
          activeOpacity={0.7}
          onPress={onLike}
        >
          <Icon
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color="#FF7F4D"
          />
          <Text style={styles.iconCount}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconGroup}
          activeOpacity={0.7}
          onPress={onComment}
        >
          <Icon name="chatbubble-outline" size={20} color="#FF7F4D" />
          <Text style={styles.iconCount}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconGroup}
          activeOpacity={0.7}
          onPress={onShare}
        >
          <Icon name="paper-plane-outline" size={20} color="#FF7F4D" />
          <Text style={styles.iconCount}>{shareCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconGroup}
          activeOpacity={0.7}
          onPress={onBookmark}
        >
          <Icon
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color="#FF7F4D"
          />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {renderCaption()}

      {/* Timestamp */}
      {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 12,
    marginVertical: 10,
  },
  imageContainer: {
    width: '100%',
    // REMOVED fixed height: 340 - now calculated dynamically from aspectRatio
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  creatorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#FFE3D6',
    backgroundColor: '#F5F5F5',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  creatorInfo: {
    flex: 1,
  },
  username: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#000000',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#8E8E8E',
  },
  creatorRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsButton: {
    backgroundColor: '#FFD4C3',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewDetailsText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: '#FF7F4D',
  },
  followSection: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  followButton: {
    backgroundColor: '#FF7F4D',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followButtonLoading: {
    opacity: 0.6,
  },
  followButtonText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  dropdownButton: {
    padding: 4,
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 32,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    minWidth: 140,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: '#000000',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 18,
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCount: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: '#000000',
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  captionText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  hashtag: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: '#1F76FF',
  },
  timestamp: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: '#969696',
  },
});

// Memoize PostCard to prevent unnecessary re-renders
export default React.memo(PostCard, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likeCount === nextProps.post.likeCount &&
    prevProps.post.commentCount === nextProps.post.commentCount &&
    prevProps.post.shareCount === nextProps.post.shareCount &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.isSaved === nextProps.isSaved &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});

