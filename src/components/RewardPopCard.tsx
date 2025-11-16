/**
 * RewardPopCard Component
 * 
 * A welcome reward pop card that appears when a newly-registered user
 * first lands on the Home screen. Displays 150 Explorer Points reward
 * with smooth animations and dismissible functionality.
 * 
 * Features:
 * - Slide up from bottom with scale and fade animation
 * - Dismissible via close button or tap outside
 * - Accessible with proper labels
 * - Modern card design with shadow and rounded corners
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

interface RewardPopCardProps {
  visible: boolean;
  onClose: () => void;
  onClaim?: () => void; // New: Claim button handler
  onViewWallet?: () => void;
  points?: number;
  claiming?: boolean; // Loading state during claim
  error?: Error | null; // Error state
}

const REWARD_POINTS = 150;

export default function RewardPopCard({
  visible,
  onClose,
  onClaim,
  onViewWallet,
  points = REWARD_POINTS,
  claiming = false,
  error = null,
}: RewardPopCardProps) {
  const slideAnim = useRef(new Animated.Value(300)).current; // Start below screen
  const scaleAnim = useRef(new Animated.Value(0.8)).current; // Start slightly smaller
  const fadeAnim = useRef(new Animated.Value(0)).current; // Start transparent
  const backdropFadeAnim = useRef(new Animated.Value(0)).current; // Backdrop fade

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropFadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when hidden
      slideAnim.setValue(300);
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
      backdropFadeAnim.setValue(0);
    }
  }, [visible, slideAnim, scaleAnim, fadeAnim, backdropFadeAnim]);

  const handleClose = () => {
    // Animate out before closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  /**
   * Handle claim button press
   * Calls onClaim handler and waits for completion before closing
   */
  const handleClaim = async () => {
    if (onClaim) {
      await onClaim();
      // Modal will close automatically after successful claim
      // (handled in the hook)
    }
  };

  /**
   * Handle view wallet button press
   * Only closes if no claim handler is provided
   */
  const handleViewWallet = () => {
    if (onClaim) {
      // If claim handler exists, view wallet should also claim first
      handleClaim();
    }
    
    if (onViewWallet) {
      // Small delay to allow claim to process
      setTimeout(() => {
        onViewWallet();
      }, 300);
    } else {
      // If no view wallet handler, just close
      handleClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropFadeAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim },
                  ],
                  opacity: fadeAnim,
                },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close reward card"
                accessibilityHint="Dismisses the welcome reward notification"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={24} color={Colors.black.secondary} />
              </TouchableOpacity>

              {/* Reward Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <Icon name="gift" size={48} color={Colors.brand.primary} />
                </View>
              </View>

              {/* Points Display */}
              <Text style={styles.pointsText}>
                {points} Explorer Points
              </Text>

              {/* Message */}
              <Text style={styles.messageText}>
                Welcome! Claim your {points} Explorer Points reward now.
              </Text>

              {/* Error Message */}
              {error && (
                <Text style={styles.errorText}>
                  {error.message || 'Failed to claim reward. Please try again.'}
                </Text>
              )}

              {/* Button Container */}
              <View style={styles.buttonContainer}>
                {/* Claim Button (Primary) */}
                {onClaim && (
                  <TouchableOpacity
                    style={[styles.ctaButton, styles.claimButton, claiming && styles.buttonDisabled]}
                    onPress={handleClaim}
                    activeOpacity={0.8}
                    disabled={claiming}
                    accessibilityRole="button"
                    accessibilityLabel="Claim reward"
                    accessibilityHint="Claims your welcome reward of Explorer Points"
                  >
                    {claiming ? (
                      <Text style={styles.ctaButtonText}>Claiming...</Text>
                    ) : (
                      <Text style={styles.ctaButtonText}>Claim Now</Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* View Wallet Button (Secondary) */}
                {onViewWallet && (
                  <TouchableOpacity
                    style={[styles.ctaButton, styles.secondaryButton]}
                    onPress={handleViewWallet}
                    activeOpacity={0.8}
                    disabled={claiming}
                    accessibilityRole="button"
                    accessibilityLabel="View wallet"
                    accessibilityHint="Opens your wallet to view your Explorer Points"
                  >
                    <Text style={styles.secondaryButtonText}>View Wallet</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.white.primary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
      },
      android: {
        elevation: 12,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.brand.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.brand.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  claimButton: {
    backgroundColor: Colors.brand.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.white.secondary,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.black.secondary,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.accent.red,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
});

