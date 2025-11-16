/**
 * Stay Creator
 * 
 * Allows Stay Host accounts to create accommodation listings
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
import { uploadImageAsync } from '../../api/firebaseService';
import { auth, db } from '../../api/authService';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { requireAuth } from '../../utils/authUtils';

interface Props {
  accountType: string;
  onClose: () => void;
  navigation: any;
}

export default function StayCreator({ accountType, onClose, navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [guests, setGuests] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 10,
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
    if (!title || !description || !price || !location || !address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check authentication before creating stay listing
    const allowed = await requireAuth('create a stay listing');
    if (!allowed) return;

    const user = auth.currentUser;
    if (!user) {
      console.error('❌ User is null after requireAuth - this should not happen');
      Alert.alert('Error', 'Authentication failed. Please try logging in again.');
      return;
    }

    console.log('User verified:', user.uid);

    setUploading(true);
    try {
      const imageUrls: string[] = [];
      for (const imageUri of images) {
        const path = `stays/${user.uid}/${Date.now()}_${Math.random().toString(36)}.jpg`;
        const url = await uploadImageAsync({ uri: imageUri, path });
        imageUrls.push(url);
      }

      // Get user document to determine hostType
      let userAccountType = accountType;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userAccountType = userData.accountType || accountType;
        }
      } catch (error) {
        console.warn('Could not fetch user account type:', error);
      }

      const hostTypeMap: Record<string, string> = {
        'Stay Host': 'StayHost',
        'Host': 'TravelHost',
        'Agency': 'Agency',
      };
      const hostType = hostTypeMap[userAccountType] || userAccountType;

      await addDoc(collection(db, 'posts'), {
        type: 'bnb',
        createdBy: user.uid, // Primary field
        hostId: user.uid, // Legacy field
        title,
        location,
        price: parseFloat(price),
        address,
        guests: guests ? parseInt(guests) : null,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseInt(bathrooms) : null,
        coverImage: imageUrls[0] || '',
        gallery: imageUrls,
        description: description || '',
        hostType: hostType,
        createdAt: serverTimestamp(), // Always use serverTimestamp
        rating: null,
        reviewCount: 0,
      });

      Alert.alert('Success', 'Stay listing created successfully!', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create stay listing');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="Cozy Beachfront Villa"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your stay..."
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Price per night (₹) *</Text>
      <TextInput
        style={styles.input}
        placeholder="2000"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />

      <Text style={styles.label}>Location *</Text>
      <TextInput
        style={styles.input}
        placeholder="Goa, India"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Full Address *</Text>
      <TextInput
        style={styles.input}
        placeholder="Street, City, State, ZIP"
        value={address}
        onChangeText={setAddress}
      />

      <View style={styles.row}>
        <View style={styles.thirdWidth}>
          <Text style={styles.label}>Max Guests</Text>
          <TextInput
            style={styles.input}
            placeholder="4"
            keyboardType="numeric"
            value={guests}
            onChangeText={setGuests}
          />
        </View>
        <View style={styles.thirdWidth}>
          <Text style={styles.label}>Bedrooms</Text>
          <TextInput
            style={styles.input}
            placeholder="2"
            keyboardType="numeric"
            value={bedrooms}
            onChangeText={setBedrooms}
          />
        </View>
        <View style={styles.thirdWidth}>
          <Text style={styles.label}>Bathrooms</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            keyboardType="numeric"
            value={bathrooms}
            onChangeText={setBathrooms}
          />
        </View>
      </View>

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
          <Text style={styles.createButtonText}>Create Stay Listing</Text>
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
  thirdWidth: {
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


