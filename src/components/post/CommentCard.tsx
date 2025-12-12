import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import UserAvatar from '../user/UserAvatar';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { formatTimestamp } from '../../utils/postHelpers';

interface CommentCardProps {
  username: string;
  avatarUri?: string;
  text: string;
  timestamp?: number;
  onPressUser?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
}

function CommentCard({
  username,
  avatarUri,
  text,
  timestamp,
  onPressUser,
  onLike,
  isLiked = false,
}: CommentCardProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPressUser} activeOpacity={0.7}>
        <UserAvatar size="sm" uri={avatarUri} />
      </TouchableOpacity>
      <View style={styles.contentContainer}>
        <View style={styles.bubble}>
          <TouchableOpacity onPress={onPressUser} activeOpacity={0.7}>
            <Text style={styles.username}>{username}</Text>
          </TouchableOpacity>
          <Text style={styles.text}>{text}</Text>
        </View>
        <View style={styles.footer}>
          {timestamp && (
            <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
          )}
          {onLike && (
            <TouchableOpacity
              onPress={onLike}
              style={styles.likeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={isLiked ? 'heart' : 'heart-outline'}
                size={14}
                color={isLiked ? Colors.accent.red : Colors.black.qua}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(CommentCard, (prevProps, nextProps) => {
  return (
    prevProps.username === nextProps.username &&
    prevProps.text === nextProps.text &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.timestamp === nextProps.timestamp
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
  },
  bubble: {
    backgroundColor: Colors.white.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 2,
  },
  text: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginRight: 12,
  },
  likeButton: {
    padding: 4,
  },
});

