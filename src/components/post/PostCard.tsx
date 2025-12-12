import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/auth/authService';
// Follow functionality is handled via onFollow prop from parent
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';
import { Post } from '../../services/api/firebaseService';
import { formatTimestamp, parseHashtags } from '../../utils/postHelpers';
import { Fonts } from '../../theme/fonts';
import { Colors } from '../../theme/colors';
import PostCarousel, { MediaItem } from './PostCarousel';
import { normalizePost } from '../../utils/postUtils';
import VerifiedBadge from '../../components/user/VerifiedBadge';
import PostDropdown from './PostDropdown';

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
  onOptionsPress?: (post: Post) => void;
  currentUserId?: string;
  isFollowing?: boolean; // Whether current user follows post creator
  inForYou?: boolean; // Whether post appears in "For You" feed
  showFollowButton?: boolean; // Whether to show Follow button (Instagram logic: only in For You feed)
  onFollow?: (userId: string) => void; // Callback when user follows/unfollows
  onPostRemoved?: (postId: string) => void; // Callback when post is removed from feed
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
  onOptionsPress,
  currentUserId,
  isFollowing: isFollowingProp,
  inForYou = false,
  showFollowButton: showFollowButtonProp,
  onFollow,
  onPostRemoved,
}: PostCardProps) {
  // Safety check: return null if post is invalid
  if (!post || !post.id) {
    console.warn('[PostCard] Invalid post provided:', post);
    return null;
  }
  // CRITICAL: Validate post exists before accessing properties
  if (!post || !post.id) {
    if (__DEV__) {
      console.warn('[PostCard] Invalid post prop:', post);
    }
    return null;
  }
  
  const creatorId = post.createdBy || post.userId || post.ownerId || '';
  // Use prop if provided, otherwise check from post data
  const isFollowing = isFollowingProp !== undefined 
    ? isFollowingProp 
    : (post.isOwnerFollowed !== undefined ? post.isOwnerFollowed : false);
  
  // Instagram logic: showFollowButton = !isFollowing && inForYou && not own post
  const showFollowButton = showFollowButtonProp !== undefined 
    ? showFollowButtonProp 
    : (post.showFollowButton !== undefined 
      ? post.showFollowButton 
      : (!isFollowing && inForYou && creatorId !== currentUserId));
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Handle follow with callback
  const handleFollow = useCallback(async () => {
    if (!creatorId || !onFollow) return;
    
    setFollowLoading(true);
    try {
      await onFollow(creatorId);
    } catch (error: any) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [creatorId, onFollow]);
  
  // Check if verified is in post data, otherwise fetch from user document
  useEffect(() => {
    // First check if verified is stored in post
    if ((post as any).verified === true) {
      setIsVerified(true);
      return;
    }
    
    // If not in post, fetch from user document
    if (creatorId) {
      const userRef = doc(db, 'users', creatorId);
      getDoc(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          const verified = userData.verificationStatus === 'verified' || userData.verified === true;
          setIsVerified(verified);
        }
      }).catch(() => {
        // Silently fail if user document not found
      });
    }
  }, [post, creatorId]);



  // Normalize post to get mediaUrls array (Instagram-like multi-image support)
  const normalizedPost = useMemo(() => {
    const normalized = normalizePost(post as any);
    
    // Return normalized post with mediaUrls (final cropped bitmaps)
    // mediaUrls contains the final rendered bitmaps from CropAdjustScreen
    return normalized;
  }, [post]);

  // Get mediaUrls array - primary field for multi-image posts
  // This contains the FINAL cropped bitmap URLs (exact adjusted frames)
  // CRITICAL: Ensure mediaUrls is always an array, never undefined
  const mediaUrls = Array.isArray(normalizedPost?.mediaUrls) 
    ? normalizedPost.mediaUrls 
    : [];
  
  // Convert mediaUrls to MediaItem[] with comprehensive fallbacks
  // Priority: mediaUrls > finalCroppedUrl > media array > mediaUrl > imageUrl > files[0].url
  // CRITICAL: Always return an array, never undefined
  const normalizedMedia: MediaItem[] = useMemo(() => {
    // Priority 1: mediaUrls array (contains final cropped bitmap URLs)
    // CRITICAL: Ensure mediaUrls is an array before accessing .length
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      return mediaUrls
        .filter((url: string) => url && typeof url === 'string' && url.length > 0)
        .map((url: string, index: number) => ({
          type: 'image' as const,
          uri: url,
          id: `media-${index}`,
        }));
    }
    
    // Priority 2: finalCroppedUrl (single image posts - final cropped bitmap)
    const finalCroppedUrl = (post as any).finalCroppedUrl;
    if (finalCroppedUrl && typeof finalCroppedUrl === 'string' && finalCroppedUrl.length > 0) {
      return [{ 
        type: 'image' as const, 
        uri: finalCroppedUrl,
        id: 'final-cropped-url' 
      }];
    }
    
    // Priority 3: Check media array (filter out undefined items)
    // CRITICAL: Check if post.media exists and is an array before accessing .length
    if (post && post.media && Array.isArray(post.media) && post.media.length > 0) {
      const mediaItems = post.media
        .filter((item: any) => item != null && typeof item === 'object') // Filter undefined/null
        .map((item: any, index: number) => {
          const url = item?.url || item?.uri;
          if (url && typeof url === 'string' && url.length > 0) {
            return {
              type: (item?.type === 'video' ? 'video' : 'image') as const,
              uri: url,
              id: item?.id || `media-${index}`,
            };
          }
          return null;
        })
        .filter((item: any): item is MediaItem => item !== null);
      
      if (mediaItems.length > 0) {
        return mediaItems;
      }
    }
    
    // Priority 4: mediaUrl (single string field)
    const mediaUrl = (post as any).mediaUrl || post.mediaUrl;
    if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.length > 0) {
      return [{
        type: 'image' as const,
        uri: mediaUrl,
        id: 'media-url',
      }];
    }
    
    // Priority 5: imageUrl (legacy field)
    const imageUrl = (post as any).imageUrl || post.imageUrl;
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0) {
      return [{
        type: 'image' as const,
        uri: imageUrl,
        id: 'image-url',
      }];
    }
    
    // Priority 6: photoUrl (alternative field)
    const photoUrl = (post as any).photoUrl || post.photoUrl;
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.length > 0) {
      return [{
        type: 'image' as const,
        uri: photoUrl,
        id: 'photo-url',
      }];
    }
    
    // Priority 7: files[0]?.url (nested structure)
    const files = (post as any)?.files;
    if (Array.isArray(files) && files.length > 0 && files[0]) {
      const fileUrl = files[0]?.url || files[0]?.uri;
      if (fileUrl && typeof fileUrl === 'string' && fileUrl.length > 0) {
        return [{
          type: 'image' as const,
          uri: fileUrl,
          id: 'file-url',
        }];
      }
    }
    
    // Debug: Log if no image found (only in development)
    if (__DEV__) {
      console.warn('[PostCard] No image found for post:', {
        postId: post?.id,
        hasMediaUrls: Array.isArray(mediaUrls) && mediaUrls.length > 0,
        hasFinalCroppedUrl: !!finalCroppedUrl,
        hasMediaArray: post && Array.isArray(post.media) && post.media.length > 0,
        hasMediaUrl: !!(post as any)?.mediaUrl,
        hasImageUrl: !!(post as any)?.imageUrl,
        hasPhotoUrl: !!(post as any)?.photoUrl,
        hasFiles: Array.isArray((post as any)?.files) && (post as any).files.length > 0,
      });
    }
    
    // CRITICAL: Always return an array, never undefined
    return [];
  }, [mediaUrls, post?.media, (post as any)?.finalCroppedUrl, (post as any)?.mediaUrl, (post as any)?.imageUrl, (post as any)?.photoUrl, (post as any)?.files]);

  // Use unified profile photo hook
  const profilePhoto = useProfilePhoto(creatorId || '');
  const location = post.location || post.placeName || '';
  const username = post.username || 'User';
  const timestamp = formatTimestamp(post.createdAt || Date.now());
  
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
  
  // State for calculated aspect ratio from image dimensions (fallback)
  const [calculatedAspectRatio, setCalculatedAspectRatio] = useState<number | null>(null);
  
  // FALLBACK: Calculate aspect ratio from image dimensions if metadata is missing
  // This matches Explore screen behavior - calculate from actual image when metadata unavailable
  useEffect(() => {
    // Only calculate if both aspectRatio and ratio are missing
    if (!aspectRatio && !ratio && normalizedMedia.length > 0) {
      const firstImageUri = normalizedMedia[0]?.uri;
      if (firstImageUri) {
        Image.getSize(
          firstImageUri,
          (width, height) => {
            if (width > 0 && height > 0) {
              const calculated = width / height;
              setCalculatedAspectRatio(calculated);
            }
          },
          () => {
            // Silently fail - will use default square
          }
        );
      }
    } else {
      setCalculatedAspectRatio(null);
    }
  }, [aspectRatio, ratio, normalizedMedia]);
  
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
    // FALLBACK 1: Use ratio string if aspectRatio not available (legacy posts)
    mediaHeight = getAspectRatioHeight(screenWidth, undefined, ratio);
  } else if (calculatedAspectRatio && calculatedAspectRatio > 0) {
    // FALLBACK 2: Use calculated aspect ratio from image dimensions (Explore-style fallback)
    mediaHeight = Math.round(screenWidth * (1 / calculatedAspectRatio));
  } else {
    // LAST RESORT: Default to square only if all methods fail
    mediaHeight = screenWidth;
    if (__DEV__) {
      console.warn('⚠️ [PostCard] No aspectRatio, ratio, or image dimensions found for post', post.id, '- defaulting to square');
    }
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
      {/* CRITICAL: Check that normalizedMedia exists and is an array before accessing .length */}
      {Array.isArray(normalizedMedia) && normalizedMedia.length > 0 ? (
        <View style={{
          width: mediaWidth,
          height: mediaHeight,
          backgroundColor: 'black', // prevent ash/white gaps during load
          overflow: 'hidden', // Ensure counter stays within card bounds
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          position: 'relative',
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
          {isDefaultProfilePhoto(profilePhoto) ? (
            <View style={styles.profileImage}>
              <Icon name="person" size={20} color="#8E8E8E" />
            </View>
          ) : (
            <Image 
              source={{ uri: profilePhoto }} 
              defaultSource={{ uri: getDefaultProfilePhoto() }}
              onError={() => {
                // Offline/CDN failure - Image component will use defaultSource
              }}
              style={styles.profileImage} 
              resizeMode="cover"
            />
          )}
          <View style={styles.creatorInfo}>
            <View style={styles.usernameRow}>
              <Text style={styles.username}>{username}</Text>
              {/* Verified Badge */}
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <VerifiedBadge size={14} />
                </View>
              )}
            </View>
            {location ? (
              <View style={styles.locationRow}>
                <Icon name="location-outline" size={12} color="#8E8E8E" />
                <Text style={styles.location}>{location}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Right Section - Dynamic */}
        {/* INSTAGRAM LOGIC: Show Follow button ONLY in For You feed when not following */}
        <View style={styles.creatorRight}>
          {!isOwnPost && showFollowButton ? (
            <TouchableOpacity
              style={[styles.followButton, followLoading && styles.followButtonLoading]}
              activeOpacity={0.8}
              onPress={handleFollow}
              disabled={followLoading}
            >
              <Text style={styles.followButtonText}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Icon Row */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          onPress={onLike}
        >
          <Icon
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={Colors.brand.primary}
          />
          <Text style={styles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          onPress={onComment}
        >
          <Icon name="chatbubble-outline" size={18} color={Colors.brand.primary} />
          <Text style={styles.actionCount}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          onPress={onShare}
        >
          <Icon name="paper-plane-outline" size={18} color={Colors.brand.primary} />
          <Text style={styles.actionCount}>{shareCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          onPress={onBookmark}
        >
          <Icon
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={Colors.brand.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionPill}
          activeOpacity={0.7}
          onPress={() => {
            if (onOptionsPress) {
              onOptionsPress(post);
            } else if (currentUserId) {
              setShowDropdown(true);
            }
          }}
        >
          <Icon name="ellipsis-vertical" size={18} color={Colors.brand.primary} />
        </TouchableOpacity>
      </View>

      {/* Post Dropdown */}
      {currentUserId && creatorId && (
        <PostDropdown
          post={post}
          postUserId={creatorId}
          currentUserId={currentUserId}
          isFollowing={isFollowing}
          inForYou={inForYou}
          visible={showDropdown}
          onClose={() => setShowDropdown(false)}
          onPostRemoved={onPostRemoved}
        />
      )}

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
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5, // 4-6px gap between username and badge
    marginBottom: 2,
  },
  username: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#000000',
  },
  verifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
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
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 11, // 10-12px gap between pills
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 102, 0, 0.12)', // theme.orange with light opacity
    borderRadius: 50, // Fully rounded
    paddingHorizontal: 12, // 10-14px range
    paddingVertical: 7, // 6-8px range
    gap: 6, // Gap between icon and count
  },
  actionCount: {
    fontFamily: Fonts.semibold, // Poppins-SemiBold
    fontSize: 13.5, // 13-14px range
    color: Colors.brand.primary, // theme.orange (solid)
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

