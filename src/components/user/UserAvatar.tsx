import React from 'react';
import { View, Image, StyleSheet, ImageStyle } from 'react-native';
import VerifiedBadge from './VerifiedBadge';

interface UserAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  uri?: string;
  hasStoryRing?: boolean;
  isVerified?: boolean;
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

const STORY_RING_WIDTH = 2;

export default function UserAvatar({
  size = 'md',
  uri,
  hasStoryRing = false,
  isVerified = false,
}: UserAvatarProps) {
  const avatarSize = SIZE_MAP[size];
  const containerSize = hasStoryRing ? avatarSize + STORY_RING_WIDTH * 2 : avatarSize;

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
      <Image
        source={uri ? { uri } : { uri: 'https://via.placeholder.com/150/FF5C02/FFFFFF?text=User' }}
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
        defaultSource={{ uri: 'https://via.placeholder.com/150/FF5C02/FFFFFF?text=User' }}
      />
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
  verifiedBadge: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 2,
  },
});

