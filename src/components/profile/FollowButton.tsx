/**
 * Follow Button Component
 * 
 * Instagram-style follow button with three states:
 * - Follow (not following)
 * - Following ▼ (following, shows bottom sheet on press)
 * - Follow Back (visited user follows you but you don't follow)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../../theme/fonts';
import { followUser, unfollowUser } from '../../services/followService';
import { fetchFollowState } from '../../services/profileService';
import { store } from '../../store';
import { setUserFollowState } from '../../store/userFollowStateSlice';
import type { FollowState } from '../../store/userFollowStateSlice';
import { Alert } from 'react-native';

const DESIGN_COLORS = {
  primary: '#FF5C02',
  primaryText: '#3C3C3B',
  secondaryText: '#757574',
  background: '#F4F5F7',
  cardBackground: '#FFFFFF',
  border: '#E5E5E5',
  destructive: '#FF3B30',
};

interface FollowButtonProps {
  currentUserId: string;
  targetUserId: string;
  followState: FollowState;
  onFollowStateChange?: () => void;
}

export default function FollowButton({
  currentUserId,
  targetUserId,
  followState,
  onFollowStateChange,
}: FollowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  const { isFollowing, isFollowedBack, isLoading: stateLoading } = followState;

  // Determine button text and behavior
  const getButtonConfig = () => {
    if (isFollowing) {
      return {
        text: 'Following',
        showDropdown: true,
        backgroundColor: DESIGN_COLORS.cardBackground,
        textColor: DESIGN_COLORS.primaryText,
        borderColor: DESIGN_COLORS.border,
      };
    } else if (isFollowedBack && !isFollowing) {
      return {
        text: 'Follow Back',
        showDropdown: false,
        backgroundColor: DESIGN_COLORS.primary,
        textColor: '#FFFFFF',
        borderColor: DESIGN_COLORS.primary,
      };
    } else {
      return {
        text: 'Follow',
        showDropdown: false,
        backgroundColor: DESIGN_COLORS.primary,
        textColor: '#FFFFFF',
        borderColor: DESIGN_COLORS.primary,
      };
    }
  };

  const buttonConfig = getButtonConfig();

  const handleFollow = async () => {
    if (isLoading || stateLoading) return;

    setIsLoading(true);
    
    // Optimistic update
    const optimisticState: FollowState = {
      ...followState,
      isFollowing: true,
      isLoading: true,
      followerCount: followState.followerCount + 1,
    };
    store.dispatch(setUserFollowState({ userId: targetUserId, followState: optimisticState }));

    try {
      await followUser(currentUserId, targetUserId);
      
      // Refresh follow state
      await fetchFollowState(currentUserId, targetUserId);
      
      if (onFollowStateChange) {
        onFollowStateChange();
      }
    } catch (error: any) {
      console.error('Error following user:', error);
      
      // Rollback optimistic update
      const rollbackState: FollowState = {
        ...followState,
        isFollowing: false,
        isLoading: false,
      };
      store.dispatch(setUserFollowState({ userId: targetUserId, followState: rollbackState }));
      
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowingPress = () => {
    if (buttonConfig.showDropdown) {
      showBottomSheet();
    }
  };

  const handleUnfollow = async () => {
    hideBottomSheet();
    
    if (isLoading || stateLoading) return;

    setIsLoading(true);
    
    // Optimistic update
    const optimisticState: FollowState = {
      ...followState,
      isFollowing: false,
      isLoading: true,
      followerCount: Math.max(0, followState.followerCount - 1),
    };
    store.dispatch(setUserFollowState({ userId: targetUserId, followState: optimisticState }));

    try {
      await unfollowUser(currentUserId, targetUserId);
      
      // Refresh follow state
      await fetchFollowState(currentUserId, targetUserId);
      
      if (onFollowStateChange) {
        onFollowStateChange();
      }
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      
      // Rollback optimistic update
      const rollbackState: FollowState = {
        ...followState,
        isFollowing: true,
        isLoading: false,
      };
      store.dispatch(setUserFollowState({ userId: targetUserId, followState: rollbackState }));
      
      Alert.alert('Error', 'Failed to unfollow user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showBottomSheet = () => {
    setBottomSheetVisible(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const hideBottomSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setBottomSheetVisible(false);
    });
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  if (isLoading || stateLoading) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.loadingButton]}
        disabled
      >
        <ActivityIndicator size="small" color={DESIGN_COLORS.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: buttonConfig.backgroundColor,
            borderColor: buttonConfig.borderColor,
            borderWidth: 1,
          },
        ]}
        onPress={isFollowing ? handleFollowingPress : handleFollow}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: buttonConfig.textColor }]}>
          {buttonConfig.text}
        </Text>
        {buttonConfig.showDropdown && (
          <Icon name="chevron-down" size={16} color={DESIGN_COLORS.primaryText} style={styles.dropdownIcon} />
        )}
      </TouchableOpacity>

      {/* Bottom Sheet for Unfollow */}
      <Modal
        visible={bottomSheetVisible}
        transparent
        animationType="none"
        onRequestClose={hideBottomSheet}
      >
        <TouchableWithoutFeedback onPress={hideBottomSheet}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.bottomSheet,
                  {
                    transform: [{ translateY }],
                  },
                ]}
              >
                <View style={styles.bottomSheetHandle} />
                
                <TouchableOpacity
                  style={styles.bottomSheetItem}
                  onPress={handleUnfollow}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bottomSheetItemTextDestructive}>Unfollow</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.bottomSheetItem}
                  onPress={hideBottomSheet}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bottomSheetItemText}>Cancel</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 100,
    height: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingButton: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderColor: DESIGN_COLORS.border,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.3,
  },
  dropdownIcon: {
    marginLeft: 4,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: DESIGN_COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bottomSheetItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_COLORS.border,
  },
  bottomSheetItemText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: DESIGN_COLORS.primaryText,
    textAlign: 'center',
  },
  bottomSheetItemTextDestructive: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: DESIGN_COLORS.destructive,
    textAlign: 'center',
  },
});

