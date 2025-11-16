/**
 * SuggestionCard Component
 * Displays a user suggestion with avatar, name, tagline, verified badge, and follow button
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFollow } from '../../hooks/useFollow';
import { SuggestionCandidate } from '../../utils/suggestionUtils';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface SuggestionCardProps {
  user: SuggestionCandidate;
  onPress?: (userId: string) => void;
  onLongPress?: (user: SuggestionCandidate) => void;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
}

export default function SuggestionCard({ user, onPress, onLongPress, onFollowChange }: SuggestionCardProps) {
  const { isFollowing, isLoading, follow, unfollow } = useFollow(user.id);
  const [showPopover, setShowPopover] = useState(false);
  const [localFollowing, setLocalFollowing] = useState(user.isFollowing || false);

  // Debug: Log when card mounts
  useEffect(() => {
    console.log('[SuggestionCard] Mounted:', user.id, user.name);
  }, [user.id, user.name]);

  // Sync with hook state
  useEffect(() => {
    setLocalFollowing(isFollowing);
  }, [isFollowing]);

  // Notify parent of follow state change - use ref to avoid infinite loop
  const onFollowChangeRef = useRef(onFollowChange);
  useEffect(() => {
    onFollowChangeRef.current = onFollowChange;
  }, [onFollowChange]);

  // Only notify on actual state changes, not on every render
  const prevFollowingRef = useRef(localFollowing);
  useEffect(() => {
    if (prevFollowingRef.current !== localFollowing && onFollowChangeRef.current) {
      onFollowChangeRef.current(user.id, localFollowing);
      prevFollowingRef.current = localFollowing;
    }
  }, [localFollowing, user.id]);

  const handlePress = () => {
    if (onPress) {
      onPress(user.id);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(user);
    } else {
      // Default: show mini popover with bio and mutuals
      setShowPopover(true);
      setTimeout(() => setShowPopover(false), 3000);
    }
  };

  const handleFollow = async () => {
    const wasFollowing = localFollowing;
    
    // Optimistic update - instantly show ✓ Following or Follow
    setLocalFollowing(!wasFollowing);
    
    try {
      if (wasFollowing) {
        await unfollow();
      } else {
        await follow();
      }
    } catch (error) {
      // Rollback on error
      setLocalFollowing(wasFollowing);
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    }
  };

  const tagline = user.postsCount 
    ? `Visited ${user.location || 'Unknown'} • ${user.postsCount} posts`
    : user.location || 'Traveler';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {user.verified && (
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={16} color={Colors.brand.primary} />
            </View>
          )}
        </View>

        {/* Name and Tagline */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.tagline} numberOfLines={1}>
            {tagline}
          </Text>
        </View>

        {/* Follow Button - Always visible, never hides card */}
        <TouchableOpacity
          style={[
            styles.followButton,
            localFollowing && styles.followingButton,
            isLoading && styles.loadingButton,
          ]}
          onPress={handleFollow}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <Text style={styles.followButtonText}>...</Text>
          ) : localFollowing ? (
            <View style={styles.followingButtonContent}>
              <Icon name="checkmark" size={14} color={Colors.black.secondary} />
              <Text style={styles.followingButtonText}>Following</Text>
            </View>
          ) : (
            <Text style={styles.followButtonText}>Follow</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Mini Popover (shown on long press) */}
      {showPopover && (
        <View style={styles.popover}>
          {user.bio && (
            <Text style={styles.popoverBio} numberOfLines={2}>
              {user.bio}
            </Text>
          )}
          {user.mutualFollowersCount && user.mutualFollowersCount > 0 && (
            <Text style={styles.popoverMutuals}>
              {user.mutualFollowersCount} mutual followers
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    marginRight: 12,
    position: 'relative',
  },
  card: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white.tertiary,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.white.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.white.primary,
    borderRadius: 10,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  name: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.brand.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: Colors.white.tertiary,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  loadingButton: {
    opacity: 0.6,
  },
  followButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
  followingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followingButtonText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.black.secondary,
  },
  popover: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    backgroundColor: Colors.black.primary,
    padding: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  popoverBio: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.white.primary,
    marginBottom: 4,
  },
  popoverMutuals: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.white.secondary,
  },
});

