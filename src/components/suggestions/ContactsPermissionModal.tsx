/**
 * ContactsPermissionModal Component
 * Modal for requesting contacts permission with clear consent
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  requestContactsPermission,
  readAndHashContacts,
  uploadContactsHashes,
} from '../../utils/contactsService';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface ContactsPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ContactsPermissionModal({
  visible,
  onClose,
  onSuccess,
}: ContactsPermissionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to continue.');
      return;
    }

    setLoading(true);

    try {
      // Request permission
      const granted = await requestContactsPermission();
      
      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'Contacts permission is required to find friends. You can enable it later in settings.'
        );
        setLoading(false);
        return;
      }

      // Read and hash contacts
      const hashedPhones = await readAndHashContacts();
      
      if (hashedPhones.length === 0) {
        Alert.alert('No Contacts', 'No phone numbers found in your contacts.');
        setLoading(false);
        return;
      }

      // Upload hashed contacts
      await uploadContactsHashes(user.uid, hashedPhones);

      Alert.alert(
        'Success',
        `Found ${hashedPhones.length} contacts. We'll help you discover friends on Sanchari!`
      );

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error: any) {
      console.error('Error processing contacts:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process contacts. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotNow = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon name="people-outline" size={48} color={Colors.brand.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Find Friends from Contacts</Text>

          {/* Description */}
          <Text style={styles.description}>
            Sanchari can help you discover friends who are already on the app by matching your contacts.
            {'\n\n'}
            We only upload hashed phone numbers for matching. Your contact names and numbers are never stored.
          </Text>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Icon name="lock-closed-outline" size={16} color={Colors.black.qua} />
            <Text style={styles.privacyText}>
              Your privacy is protected. Only hashed phone numbers are uploaded.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.notNowButton]}
              onPress={handleNotNow}
              disabled={loading}
            >
              <Text style={styles.notNowButtonText}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.allowButton, loading && styles.loadingButton]}
              onPress={handleAllow}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white.primary} />
              ) : (
                <Text style={styles.allowButtonText}>Allow</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: Colors.white.primary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.brand.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  privacyText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notNowButton: {
    backgroundColor: Colors.white.tertiary,
  },
  notNowButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.black.secondary,
  },
  allowButton: {
    backgroundColor: Colors.brand.primary,
  },
  loadingButton: {
    opacity: 0.7,
  },
  allowButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
});

