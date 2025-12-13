import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  View,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Fonts } from '../../theme/fonts';

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
  isFollowing: boolean;
  isFollowedBack: boolean;
  isLoading?: boolean;
  onToggleFollow: () => void;
  followersCount?: number; // Optional purely for display if needed
}

export default function FollowButton({
  isFollowing,
  isFollowedBack,
  isLoading = false,
  onToggleFollow,
}: FollowButtonProps) {
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  // Determine button configuration based on props ONLY
  const getButtonConfig = () => {
    if (isFollowing) {
      return {
        text: 'Following',
        showDropdown: true,
        backgroundColor: DESIGN_COLORS.cardBackground,
        textColor: DESIGN_COLORS.primaryText,
        borderColor: DESIGN_COLORS.border,
      };
    } else if (isFollowedBack) {
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

  const handleMainPress = () => {
    if (isLoading) return;

    if (isFollowing) {
      // If following, open dropdown to confirm unfollow
      showBottomSheet();
    } else {
      // If not following (or following back), just follow immediately
      onToggleFollow();
    }
  };

  const handleUnfollowConfirm = () => {
    hideBottomSheet();
    onToggleFollow();
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

  if (isLoading) {
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
        onPress={handleMainPress}
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
                  onPress={handleUnfollowConfirm}
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
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 120,
    height: 36,
    // shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingButton: {
    backgroundColor: DESIGN_COLORS.cardBackground,
    borderColor: DESIGN_COLORS.border,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    letterSpacing: 0.3,
  },
  dropdownIcon: {
    marginLeft: 6,
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
