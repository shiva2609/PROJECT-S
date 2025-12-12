/**
 * Course Creator
 * 
 * Allows Adventure Pro accounts to create adventure courses
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
import { launchImageLibrary } from 'react-native-image-picker';
import { colors } from '../../utils/colors';
import { uploadImageAsync } from '../../services/api/firebaseService';
import { auth, db } from '../../services/auth/authService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  accountType: string;
  onClose: () => void;
  navigation: any;
}

export default function CourseCreator({ accountType, onClose, navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [schedule, setSchedule] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 5,
        quality: 0.8,
      });
      if (result.assets) {
        const uris = result.assets.map((asset) => asset.uri).filter(Boolean) as string[];
        setImages([...images, ...uris]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images');
    }
  };

  const handleCreate = async () => {
    if (!title || !description || !price || !location) {
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
      const imageUrls: string[] = [];
      for (const imageUri of images) {
        const path = `courses/${user.uid}/${Date.now()}_${Math.random().toString(36)}.jpg`;
        const url = await uploadImageAsync({ uri: imageUri, path });
        imageUrls.push(url);
      }

      await addDoc(collection(db, 'courses'), {
        createdBy: user.uid,
        creatorType: accountType,
        type: 'Course',
        title,
        description,
        price: parseFloat(price),
        location,
        duration: duration || null,
        schedule: schedule || null,
        batchSize: batchSize ? parseInt(batchSize) : null,
        images: imageUrls,
        visibility: 'public',
        createdAt: serverTimestamp(),
        updatedAt: Date.now(),
      });

      Alert.alert('Success', 'Adventure course created successfully!', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create course');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Course Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="Scuba Diving Certification"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your adventure course..."
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="15000"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Duration</Text>
          <TextInput
            style={styles.input}
            placeholder="3 days"
            value={duration}
            onChangeText={setDuration}
          />
        </View>
      </View>

      <Text style={styles.label}>Location *</Text>
      <TextInput
        style={styles.input}
        placeholder="Andaman Islands, India"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Schedule</Text>
      <TextInput
        style={styles.input}
        placeholder="Daily 9 AM - 5 PM"
        value={schedule}
        onChangeText={setSchedule}
      />

      <Text style={styles.label}>Batch Size</Text>
      <TextInput
        style={styles.input}
        placeholder="10"
        keyboardType="numeric"
        value={batchSize}
        onChangeText={setBatchSize}
      />

      <Text style={styles.label}>Images</Text>
      <TouchableOpacity style={styles.imagePicker} onPress={pickImages}>
        <Icon name="image-outline" size={24} color={colors.primary} />
        <Text style={styles.imagePickerText}>Add Images</Text>
      </TouchableOpacity>

      {images.length > 0 && (
        <View style={styles.imagePreview}>
          <Text style={styles.imageCount}>{images.length} image(s) selected</Text>
          <TouchableOpacity onPress={() => setImages([])}>
            <Text style={styles.removeText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.createButton, uploading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.createButtonText}>Create Course</Text>
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
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginTop: 8,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  imagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  imageCount: {
    fontSize: 14,
    color: colors.mutedText,
  },
  removeText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: '600',
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




