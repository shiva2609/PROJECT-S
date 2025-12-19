import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
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
import { useFollowStatus } from '../../global/hooks/useFollowStatus';
import { MediaItem } from './PostCarousel';

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
  onOptionsPress,
  currentUserId,
  isFollowing: isFollowingProp,
  inForYou = false,
  showFollowButton: showFollowButtonProp,
  onFollow,
  onPostRemoved,
}: PostCardProps) {
  // Safety check: return null if post is invalid
  // We cannot return early here because of hooks usage
  // The hooks should deal gracefully with empty/invalid inputs


  const creatorId = post.createdBy || post.userId || post.ownerId || '';

  // Use REAL-TIME follow status hook
  const followStatus = useFollowStatus(currentUserId, creatorId);
  const isFollowing = followStatus.isFollowing || isFollowingProp || false;

  const showFollowButton = showFollowButtonProp !== undefined
    ? showFollowButtonProp
    : (post.showFollowButton !== undefined
      ? post.showFollowButton
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
    if (!creatorId) return;
    try {
      if (followStatus.toggleFollow) {
        await followStatus.toggleFollow();
      }
      if (onFollow) {
        await onFollow(creatorId);
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
    }
  }, [creatorId, followStatus, onFollow]);

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
      getDoc(userRef).then((snapshot) => {
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

    const photoUrl = (post as any).photoUrl || post.photoUrl;
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

  const location = post.location || post.placeName || '';
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
    <View style={styles.card}>
      <PostHeader
        username={username}
        profilePhoto={profilePhoto}
        userId={creatorId}
        isVerified={isVerified}
        location={location}
        onProfilePress={onProfilePress}
        showFollowButton={showFollowButton}
        isFollowing={isFollowing}
        isOwnPost={isOwnPost}
        onFollow={handleFollow}
        isFollowLoading={followStatus.loading}
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
