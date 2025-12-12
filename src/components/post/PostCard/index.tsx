import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import PostHeader from './PostHeader';
import PostMedia from './PostMedia';
import PostActions from './PostActions';
import PostFooter from './PostFooter';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}

interface Post {
  id: string;
  username: string;
  avatarUri?: string;
  isVerified?: boolean;
  timestamp?: number;
  media?: MediaItem[];
  aspectRatio?: number;
  caption?: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
}

interface PostCardProps {
  post: Post;
  onPressUser?: () => void;
  onPressMenu?: () => void;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onPressComments?: () => void;
  onPressLikes?: () => void;
}

function PostCard({
  post,
  onPressUser,
  onPressMenu,
  onLike,
  onComment,
  onShare,
  onSave,
  onPressComments,
  onPressLikes,
}: PostCardProps) {
  return (
    <View style={styles.container}>
      <PostHeader
        username={post.username}
        avatarUri={post.avatarUri}
        isVerified={post.isVerified}
        timestamp={post.timestamp}
        onPressUser={onPressUser}
        onPressMenu={onPressMenu}
      />
      <PostMedia
        media={post.media}
        aspectRatio={post.aspectRatio}
      />
      <PostActions
        isLiked={post.isLiked}
        isSaved={post.isSaved}
        onLike={onLike}
        onComment={onComment}
        onShare={onShare}
        onSave={onSave}
      />
      <PostFooter
        username={post.username}
        caption={post.caption}
        likeCount={post.likeCount}
        commentCount={post.commentCount}
        onPressUser={onPressUser}
        onPressComments={onPressComments}
        onPressLikes={onPressLikes}
      />
    </View>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(PostCard, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.isLiked === nextProps.post.isLiked &&
    prevProps.post.isSaved === nextProps.post.isSaved &&
    prevProps.post.likeCount === nextProps.post.likeCount &&
    prevProps.post.commentCount === nextProps.post.commentCount
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: 1,
  },
});

