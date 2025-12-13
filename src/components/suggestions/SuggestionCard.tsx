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
import { useAuth } from '../../providers/AuthProvider';
import { useFollowStatus } from '../../global/hooks/useFollowStatus';
import * as UserService from '../../global/services/user/user.service';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';
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
  const { user: currentUser } = useAuth();
  const { isFollowing, loading: followLoading, toggleFollow } = useFollowStatus(currentUser?.uid, user.id);
  const [showPopover, setShowPopover] = useState(false);
  const [localFollowing, setLocalFollowing] = useState(isFollowing || false);

  // Fetch user data from Firestore using global service
  const [userData, setUserData] = useState<{
    username: string;
    displayName: string;
    photoURL: string;
    verified: boolean;
  } | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);

  // Fetch user public info from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user.id) {
        setLoadingUserData(false);
        return;
      }

      try {
        setLoadingUserData(true);
        console.log('[SuggestionCard] Fetching user data for:', user.id, 'prop username:', user.username);
        const publicInfo = await UserService.getUserPublicInfo(user.id);
        console.log('[SuggestionCard] Fetched publicInfo:', publicInfo ? { username: publicInfo.username, displayName: publicInfo.displayName } : 'null');

        if (publicInfo) {
          // Global service now guarantees username is never empty
          // No need for complex fallback logic
          setUserData({
            username: publicInfo.username, // ✅ Always has value from global service
            displayName: publicInfo.displayName || publicInfo.username,
            photoURL: publicInfo.photoURL || user.avatar || '',
            verified: publicInfo.verified || user.verified || false,
          });
        } else {
          // Fallback to prop data if Firestore fetch fails
          setUserData({
            username: user.username || user.name || user.id.substring(0, 8),
            displayName: user.name || user.username || 'User',
            photoURL: user.avatar || '',
            verified: user.verified || false,
          });
        }
      } catch (error) {
        console.error('[SuggestionCard] Error fetching user data:', error, 'user.id:', user.id);
        // Fallback to prop data on error
        setUserData({
          username: user.username || user.name || user.id.substring(0, 8),
          displayName: user.name || user.username || 'User',
          photoURL: user.avatar || '',
          verified: user.verified || false,
        });
      } finally {
        setLoadingUserData(false);
      }
    };

    fetchUserData();
  }, [user.id, user.username, user.name, user.avatar, user.verified]);

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
      await toggleFollow();
      // Update local state to match hook state
      setLocalFollowing(!wasFollowing);
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
          {!userData || isDefaultProfilePhoto(userData.photoURL) ? (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={32} color="#FFFFFF" />
            </View>
          ) : (
            <Image
              source={{ uri: userData.photoURL }}
              defaultSource={{ uri: getDefaultProfilePhoto() }}
              onError={() => {
                // Offline/CDN failure - Image component will use defaultSource
              }}
              style={styles.avatar}
              resizeMode="cover"
            />
          )}
          {(userData?.verified || user.verified) && (
            <View style={styles.verifiedBadge}>
              <Icon name="checkmark-circle" size={16} color={Colors.brand.primary} />
            </View>
          )}
        </View>

        {/* Name and Tagline */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {userData?.username || user.username || userData?.displayName || user.name || 'User'}
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
            followLoading && styles.loadingButton,
          ]}
          onPress={handleFollow}
          disabled={followLoading}
          activeOpacity={0.7}
        >
          {followLoading ? (
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

