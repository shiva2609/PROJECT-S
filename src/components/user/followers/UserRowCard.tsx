/**
 * UserRowCard Component
 * Mini ProfileScreen-style card for followers/following lists
 * Compact version matching reference image dimensions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { Fonts } from '../../../theme/fonts';
import { Colors } from '../../../theme/colors';
import VerifiedBadge from '../VerifiedBadge';
import { useFollow } from '../../../hooks/useFollow';
import { useProfilePhoto } from '../../../hooks/useProfilePhoto';
import { getDefaultProfilePhoto, isDefaultProfilePhoto } from '../../../services/users/userProfilePhotoService';
import Icon from 'react-native-vector-icons/Ionicons';

interface UserRowCardProps {
  user: {
    id: string;
    username: string;
    fullname?: string;
    profilePic?: string;
    verified?: boolean;
    accountType?: string;
    bio?: string;
    aboutMe?: string;
  };
  currentUserId: string;
  onUserPress?: (userId: string) => void;
  onMessagePress?: (userId: string) => void;
  showMenuButton?: boolean; // Show three dots menu
  isFollowingTab?: boolean; // True if this is in the following tab
  onUnfollowPress?: (userId: string) => void;
  onRemoveFollowerPress?: (userId: string) => void;
  isMutualFollow?: boolean; // If current user follows them back
}

export default function UserRowCard({
  user,
  currentUserId,
  onUserPress,
  onMessagePress,
  showMenuButton = false,
  isFollowingTab = false,
  onUnfollowPress,
  onRemoveFollowerPress,
  isMutualFollow = false,
}: UserRowCardProps) {
  const { isFollowing, unfollow } = useFollow(user.id);
  const [menuVisible, setMenuVisible] = useState(false);
  const isOwnProfile = user.id === currentUserId;
  // Use unified profile photo hook
  const profilePhoto = useProfilePhoto(user.id);

  const handleUserPress = () => {
    if (onUserPress && !isOwnProfile) {
      onUserPress(user.id);
    }
  };

  const handleMessagePress = () => {
    if (onMessagePress) {
      onMessagePress(user.id);
    }
  };

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleUnfollow = () => {
    setMenuVisible(false);
    if (isFollowingTab && onUnfollowPress) {
      onUnfollowPress(user.id);
    } else {
      unfollow();
    }
  };

  const handleRemoveFollower = () => {
    setMenuVisible(false);
    if (onRemoveFollowerPress) {
      onRemoveFollowerPress(user.id);
    }
  };

  const showUnfollowOption = isFollowingTab && isFollowing;
  const showRemoveFollowerOption = !isFollowingTab && showMenuButton;

  return (
    <>
      {/* Outer wrapper - fixes overlapping issues */}
      <View style={styles.cardWrapper}>
        {/* Main Header Container with Layered Layout - Compact Mini Version */}
        <View style={styles.headerContainer}>
          {/* Info Card - Behind the photo (shorter than profile box) */}
          <View style={styles.infoCard}>
            {/* Content Container - Shifted to start beside photo */}
            <View style={styles.cardContentContainer}>
              {/* Username, Badge Row */}
              <View style={styles.usernameRow}>
                <View style={styles.usernameContainer}>
                  <Text style={styles.cardUsername} numberOfLines={1}>
                    {user.username}
                  </Text>
                  {/* Verified Badge */}
                  {user.verified && (
                    <View style={styles.verifiedBadge}>
                      <VerifiedBadge size={14} />
                    </View>
                  )}
                </View>
                {/* Message Icon Button and 3-dots on the right */}
                {!isOwnProfile && (
                  <View style={styles.rightActionsContainer}>
                    <TouchableOpacity
                      style={styles.messageIconButton}
                      onPress={handleMessagePress}
                      activeOpacity={0.7}
                    >
                      <Icon name="chatbubble-outline" size={20} color={Colors.black.primary} />
                    </TouchableOpacity>
                    {showMenuButton && (
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={handleMenuPress}
                        activeOpacity={0.7}
                      >
                        <Icon name="ellipsis-horizontal" size={18} color={Colors.black.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Profile Photo - In front of card with zIndex */}
          <TouchableOpacity
            style={styles.profilePhotoBox}
            onPress={handleUserPress}
            activeOpacity={0.8}
          >
            {isDefaultProfilePhoto(profilePhoto) ? (
              <View style={styles.profilePhotoPlaceholder}>
                <Text style={styles.profilePhotoText}>
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: profilePhoto }}
                defaultSource={{ uri: getDefaultProfilePhoto() }}
                onError={() => {
                  // Offline/CDN failure - Image component will use defaultSource
                }}
                style={styles.profilePhotoImage}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Dropdown Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          />
          <View style={styles.menuContainer}>
            {showUnfollowOption && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleUnfollow}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemText}>Unfollow</Text>
              </TouchableOpacity>
            )}
            {showRemoveFollowerOption && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleRemoveFollower}
                activeOpacity={0.7}
              >
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                  Remove follower
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => setMenuVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Outer wrapper - fixes overlapping issues
  cardWrapper: {
    paddingVertical: 0,
    marginBottom: 12, // 10-12px range
    paddingHorizontal: 13, // 12-14px range
    width: '100%',
    alignItems: 'center',
    minHeight: 62, // Increased to accommodate larger profile photo
  },
  // Main Header Container - Compact size
  headerContainer: {
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
    minHeight: 62, // Increased height to match profile photo
    maxWidth: '100%', // Ensure card doesn't extend beyond container
  },
  // Profile Photo Box - Increased size for better spacing
  profilePhotoBox: {
    width: 62, // Increased for better proportions
    height: 62, // Increased for better proportions
    borderRadius: 10, // Slightly rounded, not fully large
    overflow: 'hidden',
    backgroundColor: Colors.white.tertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    zIndex: 2, // Above the card
  },
  profilePhotoImage: {
    width: '100%',
    height: '100%',
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.brand.primary, // Orange background
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoText: {
    fontSize: 28, // Increased to match larger profile box
    fontFamily: Fonts.bold,
    color: Colors.white.primary,
  },
  // Info Card - Behind the photo (10% from top, 10% from bottom)
  infoCard: {
    position: 'absolute',
    left: 40, // Starts behind photo (profile box width 62px - overlap ~22px)
    right: 0, // Extends to right edge
    top: 6, // 10% from top (62px * 0.1 = 6.2px, rounded to 6px)
    height: 50, // 10% from top (6px) + 10% from bottom (6px) = 62px - 12px = 50px
    backgroundColor: '#FFFFFF', // White background
    borderRadius: 10, // Slightly rounded, matching profile box
    paddingHorizontal: 0, // No horizontal padding - handled by content container
    paddingVertical: 0, // No vertical padding - handled by content container
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1, // Behind the photo
  },
  // Card Content Container - Comfortable padding for neat layout
  cardContentContainer: {
    paddingLeft: 32, // Shift content to start beside photo (profile box width 62px - overlap ~30px)
    paddingRight: 12, // Increased right padding for better spacing
    paddingTop: 12, // Comfortable top padding
    paddingBottom: 12, // Comfortable bottom padding
    width: '100%',
    height: '100%',
    justifyContent: 'center', // Vertically center content
  },
  // Username Row
  usernameRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  usernameContainer: {
    flex: 1, // Take available space
    flexDirection: 'row',
    alignItems: 'center', // Align on same vertical baseline
    marginRight: 10, // Increased space before button for better spacing
    flexWrap: 'wrap',
    gap: 5, // Small gap between elements
  },
  cardUsername: {
    fontSize: 15, // Good size for readability
    fontFamily: Fonts.semibold, // Poppins-SemiBold
    color: '#222',
    textAlign: 'left',
    lineHeight: 20,
    marginRight: 0,
  },
  verifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // Gap between message icon button and menu
  },
  messageIconButton: {
    width: 36, // Circular button size
    height: 36, // Circular button size
    borderRadius: 18, // Perfect circle (half of width/height)
    backgroundColor: Colors.white.tertiary, // Gray background
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
    minWidth: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    textAlign: 'center',
  },
  menuItemTextDanger: {
    color: Colors.accent.red,
  },
});
