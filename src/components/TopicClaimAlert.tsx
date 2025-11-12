/**
 * TopicClaimAlert Component
 * 
 * In-app alert prompt that appears when a user hasn't claimed their topic
 * before the deadline. Provides options to claim now or remind later.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

interface TopicClaimAlertProps {
  visible: boolean;
  onClaimNow: () => void;
  onRemindLater: () => void;
}

export default function TopicClaimAlert({
  visible,
  onClaimNow,
  onRemindLater,
}: TopicClaimAlertProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRemindLater}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.alertContainer}>
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Icon name="warning" size={40} color={Colors.accent.amber} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>⚠️ Topic Not Claimed Yet!</Text>

          {/* Message */}
          <Text style={styles.message}>
            You haven't selected your presentation topic.
          </Text>
          <Text style={styles.subMessage}>
            Please claim your topic before others take it.
          </Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onClaimNow}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Claim topic now"
              accessibilityHint="Navigates to the topic selection screen"
            >
              <Text style={styles.primaryButtonText}>Claim Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onRemindLater}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Remind me later"
              accessibilityHint="Dismisses the alert and schedules a reminder notification"
            >
              <Text style={styles.secondaryButtonText}>Remind Me Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  alertContainer: {
    backgroundColor: Colors.white.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent.amber + '20', // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  subMessage: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.brand.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.white.secondary,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.black.secondary,
  },
});

