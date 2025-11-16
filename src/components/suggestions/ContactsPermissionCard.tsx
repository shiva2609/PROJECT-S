/**
 * ContactsPermissionCard Component
 * Card that prompts user to find friends from contacts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import ContactsPermissionModal from './ContactsPermissionModal';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface ContactsPermissionCardProps {
  onSuccess?: () => void;
}

export default function ContactsPermissionCard({ onSuccess }: ContactsPermissionCardProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Icon name="people-outline" size={32} color={Colors.brand.primary} />
        </View>
        <Text style={styles.title}>Find Friends from Contacts</Text>
        <Text style={styles.description}>
          Discover people you know who are already on Sanchari
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Icon name="people-outline" size={18} color={Colors.white.primary} />
          <Text style={styles.buttonText}>Find Friends</Text>
        </TouchableOpacity>
        <View style={styles.privacyNote}>
          <Icon name="lock-closed-outline" size={12} color={Colors.black.qua} />
          <Text style={styles.privacyText}>
            Only hashed phone numbers are used. Your privacy is protected.
          </Text>
        </View>
      </View>

      <ContactsPermissionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          if (onSuccess) onSuccess();
          setModalVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white.primary,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.brand.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
});

