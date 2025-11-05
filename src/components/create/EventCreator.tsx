/**
 * Event Creator (Placeholder MVP)
 *
 * Allows Event Organizer accounts to create basic event listings.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../../utils/colors';
import { auth, db } from '../../api/authService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  accountType: string;
  onClose: () => void;
  navigation: any;
}

export default function EventCreator({ onClose }: Props) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title || !location || !date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    setCreating(true);
    try {
      await addDoc(collection(db, 'events'), {
        title,
        location,
        date,
        description: description || '',
        organizerId: user.uid,
        createdAt: serverTimestamp(),
        visibility: 'public',
        exploreCategory: 'Events',
      });
      Alert.alert('Success', 'Event created successfully', [{ text: 'OK', onPress: onClose }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Event Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Sanchari Fest" />

      <Text style={styles.label}>Location *</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Goa, India" />

      <Text style={styles.label}>Date *</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2025-12-20" />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe your event..."
        multiline
      />

      <TouchableOpacity style={[styles.createButton, creating && styles.createButtonDisabled]} onPress={handleCreate} disabled={creating}>
        {creating ? <ActivityIndicator color="white" /> : <Text style={styles.createButtonText}>Create Event</Text>}
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


