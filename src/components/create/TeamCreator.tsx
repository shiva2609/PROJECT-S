/**
 * Team Creator
 * 
 * Allows Agency accounts to add team members
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
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

interface Props {
  accountType: string;
  onClose: () => void;
  navigation: any;
}

export default function TeamCreator({ accountType, onClose, navigation }: Props) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleAddTeamMember = async () => {
    if (!email || !name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    // Verify user is Agency
    if (accountType !== 'Agency') {
      Alert.alert('Error', 'Only Agency accounts can add team members');
      return;
    }

    setUploading(true);
    try {
      // Check if user exists
      const usersRef = collection(db, 'users');
      // In a real app, you'd query by email or username
      // For now, we'll create a team member document

      await addDoc(collection(db, 'teamMembers'), {
        agencyId: user.uid,
        email: email.toLowerCase().trim(),
        name,
        role: role || 'Team Member',
        status: 'pending', // Pending until they accept
        createdAt: serverTimestamp(),
        updatedAt: Date.now(),
      });

      Alert.alert(
        'Success',
        'Team member invitation sent! They will need to accept the invitation.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add team member');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.infoText}>
        Add team members to your agency. They will receive an invitation to join.
      </Text>

      <Text style={styles.label}>Team Member Email *</Text>
      <TextInput
        style={styles.input}
        placeholder="member@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="John Doe"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Role</Text>
      <TextInput
        style={styles.input}
        placeholder="Travel Agent, Guide, Manager..."
        value={role}
        onChangeText={setRole}
      />

      <TouchableOpacity
        style={[styles.createButton, uploading && styles.createButtonDisabled]}
        onPress={handleAddTeamMember}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.createButtonText}>Send Invitation</Text>
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
  infoText: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 24,
    lineHeight: 20,
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




