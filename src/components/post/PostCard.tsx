import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Pressable,
} from 'react-native';
import { doc, getDoc } from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { Post } from '../../services/api/firebaseService';
import { formatTimestamp, parseHashtags } from '../../utils/postHelpers';
import { Fonts } from '../../theme/fonts';
import { Colors } from '../../theme/colors';
import { normalizePost } from '../../utils/postUtils';
import PostDropdown from './PostDropdown';
import { usePostInteractions } from '../../global/hooks/usePostInteractions';
import { MediaItem } from './PostCarousel';
import * as FollowService from '../../services/follow/followRealtimeService';
import { sendFollowNotification, removeFollowNotification } from '../../services/notifications/NotificationAPI';

// Subcomponents
import PostHeader from './PostHeader';
import PostMedia from './PostMedia';
import PostActions from './PostActions';

interface PostCardProps {
  post: Post;
  isLiked?: boolean;
  isSaved?: boolean;
  onLike?: () => void;
  onComment: () => void;
  onShare: () => void;
  onBookmark?: () => void;
  onProfilePress: () => void;
  onPostDetailPress: () => void;
  enablePress?: boolean;
  onOptionsPress?: (post: Post) => void;
  currentUserId?: string;
  isFollowing?: boolean;
  inForYou?: boolean;
  showFollowButton?: boolean;
  onFollow?: (userId: string) => void;
  onPostRemoved?: (postId: string) => void;
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
  enablePress = true,
  onOptionsPress,
  currentUserId,
  isFollowing: isFollowingProp,
  inForYou = false,
  showFollowButton: showFollowButtonProp,
  onFollow,
  onPostRemoved,
}: PostCardProps) {
  // Animation for press interaction
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!enablePress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    if (!enablePress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };
  // Safety check: return null if post is invalid
  // We cannot return early here because of hooks usage
  // The hooks should deal gracefully with empty/invalid inputs


  const creatorId = post.createdBy || post.userId || (post as any).ownerId || '';

  // OPTIMIZATION: Removed useFollowStatus listener.
  // We rely on isFollowingProp passed from the feed (which is updated by the global listener)
  // or default to false.
  const isFollowing = isFollowingProp || false;
  const [localFollowing, setLocalFollowing] = useState(isFollowing);
  const [followLoading, setFollowLoading] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setLocalFollowing(isFollowing);
  }, [isFollowing]);

  const showFollowButton = showFollowButtonProp !== undefined
    ? showFollowButtonProp
    : ((post as any).showFollowButton !== undefined
      ? (post as any).showFollowButton
      : (!isFollowing && inForYou && creatorId !== currentUserId));

  const [showDropdown, setShowDropdown] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Use global post interactions hook
  const postInteractions = usePostInteractions(post.id, {
    initialIsLiked: isLiked,
    initialLikeCount: post.likeCount,
    initialIsSaved: isSaved
  });

  const actualIsLiked = postInteractions.isLiked;
  const actualIsSaved = postInteractions.isSaved;
  const actualLikeCount = postInteractions.likeCount;
  const actualCommentCount = postInteractions.commentCount || post.commentCount || 0;

  // Handle like
  const handleLike = useCallback(async () => {
    try {
      await postInteractions.toggleLike();
      if (onLike) onLike();
    } catch (error: any) {
      console.error('[PostCard] Error toggling like:', error);
    }
  }, [postInteractions, onLike]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await postInteractions.toggleSave();
      if (onBookmark) onBookmark();
    } catch (error: any) {
      console.error('[PostCard] Error toggling save:', error);
    }
  }, [postInteractions, onBookmark]);

  // Handle follow
  const handleFollow = useCallback(async () => {
    if (!creatorId || !currentUserId || followLoading) return;

    const previousState = localFollowing;
    // Optimistic Update
    setLocalFollowing(!previousState);

    try {
      if (previousState) {
        await FollowService.unfollowUser(currentUserId, creatorId);
        await removeFollowNotification(creatorId, currentUserId);
      } else {
        await FollowService.followUser(currentUserId, creatorId);
      }

      if (onFollow) {
        onFollow(creatorId);
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      // Rollback
      setLocalFollowing(previousState);
    }
  }, [creatorId, currentUserId, localFollowing, followLoading, onFollow]);

  // V1 FEATURE FREEZE: Post sharing intentionally disabled for V1 stability.
  // Re-enable in V2 with finalized chat share UX.
  // Original implementation preserved in onShare prop, but handler is no-op.
  const handleShare = useCallback(() => {
    // No-op: Share functionality disabled for V1
    // TODO V2: Restore share functionality with proper chat integration
    // Original handler: onShare()
  }, []);

  // Check verification status
  useEffect(() => {
    if ((post as any).verified === true) {
      setIsVerified(true);
      return;
    }
    if (creatorId) {
      const userRef = doc(db, 'users', creatorId);
      getDoc(userRef).then((snapshot: any) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          const verified = userData.verificationStatus === 'verified' || userData.verified === true;
          setIsVerified(verified);
        }
      }).catch(() => { });
    }
  }, [post, creatorId]);

  // Normalize post to get mediaUrls array
  const normalizedPost = useMemo(() => {
    const normalized = normalizePost(post as any);
    return normalized;
  }, [post]);

  const imageURLs = (post as any).imageURLs || normalizedPost?.mediaUrls || [];
  const mediaUrls = Array.isArray(imageURLs) && imageURLs.length > 0
    ? imageURLs
    : (Array.isArray(normalizedPost?.mediaUrls) ? normalizedPost.mediaUrls : []);

  // Convert mediaUrls to MediaItem[]
  const normalizedMedia: MediaItem[] = useMemo(() => {
    const enrichedImageURLs = (post as any).imageURLs;
    if (Array.isArray(enrichedImageURLs) && enrichedImageURLs.length > 0) {
      return enrichedImageURLs
        .filter((url: string) => url && typeof url === 'string' && url.length > 0)
        .map((url: string, index: number) => ({
          type: 'image' as const,
          uri: url,
          id: `enriched-${index}`,
        }));
    }

    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      return mediaUrls
        .filter((url: string) => url && typeof url === 'string' && url.length > 0)
        .map((url: string, index: number) => ({
          type: 'image' as const,
          uri: url,
          id: `media-${index}`,
        }));
    }

    const finalCroppedUrl = (post as any).finalCroppedUrl;
    if (finalCroppedUrl && typeof finalCroppedUrl === 'string' && finalCroppedUrl.length > 0) {
      return [{
        type: 'image' as const,
        uri: finalCroppedUrl,
        id: 'final-cropped-url'
      }];
    }

    if (post && post.media && Array.isArray(post.media) && post.media.length > 0) {
      const mediaItems = post.media
        .filter((item: any) => item != null && typeof item === 'object')
        .map((item: any, index: number) => {
          const url = item?.url || item?.uri;
          if (url && typeof url === 'string' && url.length > 0) {
            return {
              type: (item?.type === 'video' ? 'video' : 'image'),
              uri: url,
              id: (item?.id ? String(item.id) : `media-${index}`),
            } as MediaItem;
          }
          return null;
        })
        .filter((item): item is MediaItem => item !== null);

      if (mediaItems.length > 0) {
        return mediaItems;
      }
    }

    const mediaUrl = (post as any).mediaUrl || post.mediaUrl;
    if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.length > 0) {
      return [{
        type: 'image' as const,
        uri: mediaUrl,
        id: 'media-url',
      }];
    }

    const imageUrl = (post as any).imageUrl || post.imageUrl;
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0) {
      return [{
        type: 'image' as const,
        uri: imageUrl,
        id: 'image-url',
      }];
    }

    const photoUrl = (post as any).photoUrl;
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.length > 0) {
      return [{
        type: 'image' as const,
        uri: photoUrl,
        id: 'photo-url',
      }];
    }

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
    if (__DEV__ && normalizedMedia.length === 0) {
      console.warn('[PostCard] No image found for post:', {
        postId: post?.id,
        authorId: (post as any)?.authorId,
        hasImageURLs: Array.isArray((post as any)?.imageURLs) && (post as any).imageURLs.length > 0,
        imageURLsValue: (post as any)?.imageURLs,
        hasMediaUrls: Array.isArray(mediaUrls) && mediaUrls.length > 0,
        mediaUrlsValue: mediaUrls,
        hasFinalCroppedUrl: !!finalCroppedUrl,
        hasMediaArray: post && Array.isArray(post.media) && post.media.length > 0,
        hasMediaUrl: !!(post as any)?.mediaUrl,
        hasImageUrl: !!(post as any)?.imageUrl,
        hasPhotoUrl: !!(post as any)?.photoUrl,
        hasFiles: Array.isArray((post as any)?.files) && (post as any).files.length > 0,
        rawPostKeys: Object.keys(post || {}),
      });
    }

    // CRITICAL: Always return an array, never undefined
    return [];
  }, [mediaUrls, (post as any)?.imageURLs, post?.media, (post as any)?.finalCroppedUrl, (post as any)?.mediaUrl, (post as any)?.imageUrl, (post as any)?.photoUrl, (post as any)?.files]);

  const authorUsername = (post as any).authorUsername || post.username;
  const authorAvatar = (post as any).authorAvatar || (post as any).profilePhoto || (post as any).ownerAvatar || '';
  const profilePhotoFromHook = useProfilePhoto(creatorId || '');
  const profilePhoto = authorAvatar || profilePhotoFromHook;

  const location = typeof post.location === 'object' && post.location !== null
    ? post.location.name
    : (typeof post.location === 'string' ? post.location : (post as any).placeName || '');

  const username = authorUsername;
  const timestamp = formatTimestamp(post.createdAt || Date.now());

  // DEV-ONLY: Verify username is never empty
  if (__DEV__ && !username) {
    console.warn('[PostCard] Missing username for post:', {
      postId: post.id,
      creatorId,
      authorUsername: (post as any).authorUsername,
      postUsername: post.username,
      hasAuthorUsername: !!(post as any).authorUsername,
      hasPostUsername: !!post.username,
    });
  }

  const likeCount = actualLikeCount > 0 ? actualLikeCount : Math.max(0, post.likeCount || 0);
  const commentCount = actualCommentCount > 0 ? actualCommentCount : Math.max(0, post.commentCount || 0);
  const shareCount = Math.max(0, post.shareCount || 0);
  const isOwnPost = currentUserId === creatorId;

  const renderCaption = () => {
    // 🔐 REFACTORED: Render caption and host tags independently
    // This ensures host tags appear even if caption is empty

    const parts = post.caption ? parseHashtags(post.caption) : [];

    // Check if we have tags to display
    const postTags = (post as any).tags || [];
    const hasTags = Array.isArray(postTags) && postTags.length > 0;

    // Check if we have hashtags (explicit from Create flow)
    const hashtags = post.hashtags || [];
    const hasHashtags = Array.isArray(hashtags) && hashtags.length > 0;

    // DEBUG: Log to verify data
    if (__DEV__) {
      console.log('🔍 [PostCard] Post ID:', post.id);
      console.log('🔍 [PostCard] Location:', location);
      console.log('🔍 [PostCard] Post location:', post.location);
      console.log('🔍 [PostCard] Post placeName:', (post as any).placeName);
      console.log('🔍 [PostCard] Tags:', postTags);
      console.log('🔍 [PostCard] Has tags:', hasTags);
      console.log('🔍 [PostCard] Hashtags:', hashtags);
      console.log('🔍 [PostCard] All post keys:', Object.keys(post));
    }

    if (!post.caption && !hasTags && !hasHashtags) return null;

    return (
      <View style={styles.contentContainer}>
        {/* 1. Caption Block */}
        {post.caption ? (
          <Text style={styles.captionText}>
            <Text style={styles.username}>{username} </Text>
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
        ) : null}

        {/* 2. Hashtags Block (New) */}
        {hasHashtags && (
          <View style={styles.hostTagsContainer}>
            {hashtags.map((tag: string, index: number) => (
              <Text key={`hash-${index}`} style={styles.hashtag}>
                #{tag}
                {index < hashtags.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </View>
        )}

        {/* 3. Tags Block (People) */}
        {hasTags && (
          <View style={styles.tagsContainer}>
            {postTags.map((tag: string, index: number) => (
              <Text key={index} style={styles.tag}>
                {tag}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const handleMorePress = () => {
    if (onOptionsPress) {
      onOptionsPress(post);
    } else if (currentUserId) {
      setShowDropdown(true);
    }
  };

  // Final Safety Check: If post is invalid, return null here (AFTER all hooks)
  if (!post || !post.id) {
    return null;
  }

  return (
    <Pressable
      onPress={enablePress ? onPostDetailPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!enablePress}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        <PostHeader
          username={username}
          profilePhoto={profilePhoto}
          userId={creatorId}
          isVerified={isVerified}
          location={location}
          onProfilePress={onProfilePress}
          showFollowButton={showFollowButton}
          isFollowing={localFollowing}
          isOwnPost={isOwnPost}
          onFollow={handleFollow}
          isFollowLoading={followLoading}
        />

        <PostMedia
          media={normalizedMedia}
          ratio={post.ratio}
          aspectRatio={post.aspectRatio}
          postId={post.id}
        />

        <PostActions
          isLiked={actualIsLiked}
          likeCount={likeCount}
          onLike={handleLike}
          commentCount={commentCount}
          onComment={onComment}
          shareCount={shareCount}
          onShare={handleShare}
          isSaved={actualIsSaved}
          onSave={handleSave}
          onMorePress={handleMorePress}
        />

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

        {renderCaption()}

        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </Animated.View>
    </Pressable>
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
  captionContainer: {
    // Removed specific padding, now handled by contentContainer
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  captionText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  username: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#000000',
  },
  hostTagsContainer: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#1F76FF',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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

export default React.memo(PostCard, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.isSaved === nextProps.isSaved &&
    prevProps.isFollowing === nextProps.isFollowing &&
    prevProps.post.likeCount === nextProps.post.likeCount &&
    prevProps.post.commentCount === nextProps.post.commentCount
  );
});
