import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface PostFooterProps {
  username: string;
  caption?: string;
  likeCount?: number;
  commentCount?: number;
  onPressUser?: () => void;
  onPressComments?: () => void;
  onPressLikes?: () => void;
}

const MAX_CAPTION_LENGTH = 100;

export default function PostFooter({
  username,
  caption,
  likeCount = 0,
  commentCount = 0,
  onPressUser,
  onPressComments,
  onPressLikes,
}: PostFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = caption && caption.length > MAX_CAPTION_LENGTH;
  const displayCaption = shouldTruncate && !isExpanded
    ? `${caption.substring(0, MAX_CAPTION_LENGTH)}...`
    : caption;

  return (
    <View style={styles.container}>
      {likeCount > 0 && (
        <TouchableOpacity onPress={onPressLikes} activeOpacity={0.7}>
          <Text style={styles.countText}>
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </Text>
        </TouchableOpacity>
      )}
      {caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>
            <TouchableOpacity onPress={onPressUser} activeOpacity={0.7}>
              <Text style={styles.username}>{username}</Text>
            </TouchableOpacity>
            {' '}
            <Text style={styles.captionText}>{displayCaption}</Text>
          </Text>
          {shouldTruncate && (
            <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
              <Text style={styles.moreText}>
                {isExpanded ? 'less' : 'more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {commentCount > 0 && (
        <TouchableOpacity onPress={onPressComments} activeOpacity={0.7}>
          <Text style={styles.viewCommentsText}>
            View all {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  countText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 8,
  },
  captionContainer: {
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    lineHeight: 20,
  },
  username: {
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  captionText: {
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
  },
  moreText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 4,
  },
  viewCommentsText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
});

