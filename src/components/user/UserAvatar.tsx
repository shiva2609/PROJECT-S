import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import VerifiedBadge from './VerifiedBadge';
import { SmartImage } from '../common/SmartImage';

interface UserAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  uri?: string;
  hasStoryRing?: boolean;
  isVerified?: boolean;
  variant?: 'default' | 'profile'; // 'profile' uses brand color for icon
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

const STORY_RING_WIDTH = 2;

/**
 * Checks if URI is empty or placeholder
 */
function isEmptyAvatar(uri?: string): boolean {
  if (!uri) return true;
  if (uri.trim() === '') return true;
  if (uri.includes('placeholder')) return true;
  return false;
}

export default function UserAvatar({
  size = 'md',
  uri,
  hasStoryRing = false,
  isVerified = false,
  variant = 'default', // Default to neutral gray
}: UserAvatarProps) {
  const avatarSize = SIZE_MAP[size];
  const containerSize = hasStoryRing ? avatarSize + STORY_RING_WIDTH * 2 : avatarSize;
  const isEmpty = isEmptyAvatar(uri);
  const iconSize = Math.floor(avatarSize * 0.5);

  // Use brand secondary color for profile variant, neutral gray for default
  const iconColor = variant === 'profile' ? Colors.brand.secondary : '#8E8E8E';

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      {hasStoryRing && (
        <View
          style={[
            styles.storyRing,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
            },
          ]}
        />
      )}
      {isEmpty ? (
        <View
          style={[
            styles.avatar,
            styles.emptyAvatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderWidth: 2,
              borderColor: '#E0E0E0',
            },
          ]}
        >
          <Icon name="person" size={iconSize} color={iconColor} />
        </View>
      ) : (
        <SmartImage
          uri={uri}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderWidth: 2,
            borderColor: '#E0E0E0',
          }}
          resizeMode="cover"
          showPlaceholder={true}
          borderRadius={avatarSize / 2}
        />
      )}
      {isVerified && (
        <View style={[styles.verifiedBadge, { bottom: size === 'xs' ? -2 : 0, right: size === 'xs' ? -2 : 0 }]}>
          <VerifiedBadge size={size === 'xs' ? 12 : size === 'sm' ? 14 : 18} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyRing: {
    position: 'absolute',
    borderWidth: STORY_RING_WIDTH,
    borderColor: '#FF5C02',
    backgroundColor: 'transparent',
  },
  avatar: {
    backgroundColor: '#EAEAEA',
  },
  emptyAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
  },
});

