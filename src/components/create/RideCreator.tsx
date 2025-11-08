/**
 * Ride Partner
 * 
 * Allows Ride Partner accounts to create transport/mobility listings
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

const VEHICLE_TYPES = ['Bike', 'Car', 'Scooter', 'Jeep', 'SUV', 'Van', 'Cab'];

export default function RideCreator({ accountType, onClose, navigation }: Props) {
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [location, setLocation] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
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
    if (!vehicleType || !vehicleName || !pricePerDay || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check authentication before creating ride listing
    const allowed = await requireAuth('create a ride listing');
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
        const path = `rides/${user.uid}/${Date.now()}_${Math.random().toString(36)}.jpg`;
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
    'RideCreator': 'RidePartner',
    'Host': 'TravelHost',
    'Agency': 'Agency',
  };
      const hostType = hostTypeMap[userAccountType] || userAccountType;

      await addDoc(collection(db, 'posts'), {
        type: 'ride',
        title: vehicleName || `${vehicleType} Rental`,
        location,
        price: parseFloat(pricePerDay),
        pricePerKm: pricePerKm ? parseFloat(pricePerKm) : null,
        vehicleType,
        vehicleName,
        pickupLocation: pickupLocation || location,
        coverImage: imageUrls[0] || '',
        gallery: imageUrls,
        description: description || '',
        hostId: user.uid,
        hostType: hostType,
        createdAt: serverTimestamp(),
        rating: null,
        reviewCount: 0,
      });

      Alert.alert('Success', 'Ride listing created successfully!', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create ride listing');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Vehicle Type *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
        {VEHICLE_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              vehicleType === type && styles.typeButtonActive,
            ]}
            onPress={() => setVehicleType(type)}
          >
            <Text
              style={[
                styles.typeButtonText,
                vehicleType === type && styles.typeButtonTextActive,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Vehicle Name/Model *</Text>
      <TextInput
        style={styles.input}
        placeholder="Honda Activa 6G"
        value={vehicleName}
        onChangeText={setVehicleName}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your vehicle..."
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Price per Day (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="500"
            keyboardType="numeric"
            value={pricePerDay}
            onChangeText={setPricePerDay}
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Price per Km (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="10"
            keyboardType="numeric"
            value={pricePerKm}
            onChangeText={setPricePerKm}
          />
        </View>
      </View>

      <Text style={styles.label}>Location *</Text>
      <TextInput
        style={styles.input}
        placeholder="Goa, India"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Pickup Location</Text>
      <TextInput
        style={styles.input}
        placeholder="Specific pickup address (optional)"
        value={pickupLocation}
        onChangeText={setPickupLocation}
      />

      <Text style={styles.label}>Vehicle Images</Text>
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
          <Text style={styles.createButtonText}>Create Ride Listing</Text>
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
  typeSelector: {
    marginBottom: 16,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  typeButtonTextActive: {
    color: 'white',
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


