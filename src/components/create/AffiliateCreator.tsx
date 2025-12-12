/**
 * Affiliate Link Creator
 * 
 * Allows Creator accounts to create affiliate links to existing packages
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../utils/colors';
import { auth, db } from '../../services/auth/authService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  accountType: string;
  onClose: () => void;
  navigation: any;
}

export default function AffiliateCreator({ accountType, onClose, navigation }: Props) {
  const [packageId, setPackageId] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleCreate = async () => {
    if (!packageId || !affiliateLink) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setUploading(true);
    try {
      await addDoc(collection(db, 'affiliateLinks'), {
        createdBy: user.uid,
        creatorType: accountType,
        type: 'Affiliate Link',
        packageId,
        affiliateLink,
        description: description || null,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: Date.now(),
      });

      Alert.alert('Success', 'Affiliate link created successfully!', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create affiliate link');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Package ID *</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter the package ID you're promoting"
        value={packageId}
        onChangeText={setPackageId}
      />

      <Text style={styles.label}>Affiliate Link *</Text>
      <TextInput
        style={styles.input}
        placeholder="https://..."
        value={affiliateLink}
        onChangeText={setAffiliateLink}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Why should travelers book through this link?"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={[styles.createButton, uploading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.createButtonText}>Create Affiliate Link</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});




