/**
 * Package Creator
 * 
 * Allows Host and Agency accounts to create travel packages
 * Implements 2-week posting rule validation and mandatory fields
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
import { collection, addDoc, serverTimestamp, Timestamp, getDoc, doc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { requireAuth } from '../../utils/authUtils';

interface Props {
  accountType: string;
  onClose: () => void;
  navigation: any;
}

export default function PackageCreator({ accountType, onClose, navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const [itinerary, setItinerary] = useState('');
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

  // Parse date from DD/MM/YYYY format
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.trim().length === 0) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  // Validate 2-week posting rule
  const validateStartDate = (startDateStr: string): boolean => {
    const startDateObj = parseDate(startDateStr);
    if (!startDateObj) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksFromToday = new Date(today);
    twoWeeksFromToday.setDate(today.getDate() + 14);
    
    return startDateObj >= twoWeeksFromToday;
  };

  const handleCreate = async () => {
    // Validate mandatory fields
    if (!title || !location || !duration || !price || !availableSeats) {
      Alert.alert('Error', 'Please fill in all required fields (Title, Location, Duration, Price, Available Seats)');
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('Error', 'Start Date and End Date are required');
      return;
    }

    // Validate 2-week posting rule
    if (!validateStartDate(startDate)) {
      Alert.alert(
        'Validation Error',
        'Trip start date must be at least 2 weeks from today. Please select a date at least 14 days in the future.'
      );
      return;
    }

    // Validate dates
    const startDateObj = parseDate(startDate);
    const endDateObj = parseDate(endDate);
    if (!startDateObj || !endDateObj) {
      Alert.alert('Error', 'Please enter valid dates in DD/MM/YYYY format');
      return;
    }

    if (endDateObj < startDateObj) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    // Validate cover image
    if (images.length === 0) {
      Alert.alert('Error', 'Please upload at least one cover image');
      return;
    }

    // Validate itinerary
    if (!itinerary || itinerary.trim().length === 0) {
      Alert.alert('Error', 'Itinerary is required. Please provide day-wise details.');
      return;
    }

    // Validate price and seats
    const priceNum = parseFloat(price);
    const seatsNum = parseInt(availableSeats, 10);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    if (isNaN(seatsNum) || seatsNum <= 0) {
      Alert.alert('Error', 'Please enter a valid number of available seats');
      return;
    }

    // Check authentication before creating post
    const allowed = await requireAuth('create a post');
    if (!allowed) return;

    const user = auth.currentUser;
    if (!user) {
      console.error('❌ User is null after requireAuth - this should not happen');
      Alert.alert('Error', 'Authentication failed. Please try logging in again.');
      return;
    }

    console.log('User verified:', user.uid);

    // Get user document to get accountType
    let userAccountType = accountType;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userAccountType = userData.accountType || accountType;
      }
    } catch (error) {
      console.warn('Could not fetch user account type, using prop:', error);
    }

    // Map account types to hostType
    const hostTypeMap: Record<string, string> = {
      'Host': 'TravelHost',
      'Agency': 'Agency',
      'Explorer': 'Explorer',
      'Adventure Pro': 'AdventurePartner',
      'Creator': 'Creator',
      'Stay Host': 'StayHost',
    };
    const hostType = hostTypeMap[userAccountType] || userAccountType;

    setUploading(true);
    try {
      // Upload images
      const imageUrls: string[] = [];
      for (const imageUri of images) {
        const path = `posts/${user.uid}/${Date.now()}_${Math.random().toString(36)}.jpg`;
        const url = await uploadImageAsync({ uri: imageUri, path });
        imageUrls.push(url);
      }

      // Format date range string
      const dateRange = `${startDate} - ${endDate}`;

      // Create post document in unified 'posts' collection
      await addDoc(collection(db, 'posts'), {
        type: 'trip',
        title,
        location,
        duration,
        dateRange,
        startDate: Timestamp.fromDate(startDateObj),
        endDate: Timestamp.fromDate(endDateObj),
        price: priceNum,
        availableSeats: seatsNum,
        joinedCount: 0,
        joinedProfiles: [],
        coverImage: imageUrls[0],
        gallery: imageUrls,
        description: description || '',
        itinerary: itinerary.trim(),
        tags: [],
        hostId: user.uid,
        hostType: hostType,
        createdAt: serverTimestamp(),
        rating: null, // Will be calculated from reviews
        reviewCount: 0,
      });

      Alert.alert('Success', 'Trip package created successfully!', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      console.error('Error creating package:', error);
      Alert.alert('Error', error.message || 'Failed to create package');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="Amazing Bali Adventure"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Location *</Text>
      <TextInput
        style={styles.input}
        placeholder="Bali, Indonesia"
        value={location}
        onChangeText={setLocation}
      />

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Duration *</Text>
          <TextInput
            style={styles.input}
            placeholder="5 days 4 nights"
            value={duration}
            onChangeText={setDuration}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="5000"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Start Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            value={startDate}
            onChangeText={setStartDate}
          />
          <Text style={styles.hint}>Must be at least 2 weeks from today</Text>
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>End Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="DD/MM/YYYY"
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
      </View>

      <Text style={styles.label}>Available Seats *</Text>
      <TextInput
        style={styles.input}
        placeholder="20"
        keyboardType="numeric"
        value={availableSeats}
        onChangeText={setAvailableSeats}
      />

      <Text style={styles.label}>Itinerary (Day-wise details) *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Day 1: Arrival, check-in, welcome dinner&#10;Day 2: Morning hike, local markets, beach time&#10;Day 3: Temple visit, cultural show..."
        multiline
        numberOfLines={8}
        value={itinerary}
        onChangeText={setItinerary}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your package..."
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Cover Image *</Text>
      <Text style={styles.hint}>Upload at least one image as cover</Text>
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
          <Text style={styles.createButtonText}>Create Package</Text>
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
  hint: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 4,
    fontStyle: 'italic',
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


