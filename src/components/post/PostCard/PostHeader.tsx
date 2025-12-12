import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import UserAvatar from '../../user/UserAvatar';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { formatTimestamp } from '../../utils/postHelpers';

interface PostHeaderProps {
  username: string;
  avatarUri?: string;
  isVerified?: boolean;
  timestamp?: number;
  onPressUser?: () => void;
  onPressMenu?: () => void;
}

export default function PostHeader({
  username,
  avatarUri,
  isVerified = false,
  timestamp,
  onPressUser,
  onPressMenu,
}: PostHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={onPressUser}
        activeOpacity={0.7}
      >
        <UserAvatar size="sm" uri={avatarUri} isVerified={isVerified} />
        <View style={styles.userDetails}>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{username}</Text>
            {isVerified && (
              <View style={styles.verifiedIcon}>
                <Icon name="checkmark-circle" size={16} color={Colors.brand.primary} />
              </View>
            )}
          </View>
          {timestamp && (
            <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
          )}
        </View>
      </TouchableOpacity>
      {onPressMenu && (
        <TouchableOpacity
          onPress={onPressMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="ellipsis-horizontal" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  timestamp: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 2,
  },
});

