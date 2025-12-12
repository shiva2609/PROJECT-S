/**
 * Itinerary Creator
 * 
 * Allows Creator accounts to create travel itineraries for followers
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

export default function ItineraryCreator({ accountType, onClose, navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [dayPlans, setDayPlans] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleCreate = async () => {
    if (!title || !description || !location) {
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
      await addDoc(collection(db, 'itineraries'), {
        createdBy: user.uid,
        creatorType: accountType,
        type: 'Itinerary',
        title,
        description,
        location,
        duration: duration || null,
        dayPlans: dayPlans || null,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: Date.now(),
      });

      Alert.alert('Success', 'Itinerary created successfully!', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create itinerary');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Itinerary Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="7 Days in Bali"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Share your travel itinerary..."
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Location *</Text>
          <TextInput
            style={styles.input}
            placeholder="Bali, Indonesia"
            value={location}
            onChangeText={setLocation}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Duration</Text>
          <TextInput
            style={styles.input}
            placeholder="7 days"
            value={duration}
            onChangeText={setDuration}
          />
        </View>
      </View>

      <Text style={styles.label}>Day-by-Day Plans</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Day 1: Arrival, check-in, beach...\nDay 2: Temple visit, local markets..."
        multiline
        numberOfLines={8}
        value={dayPlans}
        onChangeText={setDayPlans}
      />

      <TouchableOpacity
        style={[styles.createButton, uploading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.createButtonText}>Create Itinerary</Text>
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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




