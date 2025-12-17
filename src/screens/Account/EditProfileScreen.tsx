/**
 * Edit Profile Screen
 * 
 * Base Edit Profile screen with all COMMON fields that apply to every user,
 * regardless of role. Ready to be extended with role-based sections.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/auth/authService';
import { useAuth } from '../../providers/AuthProvider';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import Card from '../../components/profile/Card';
import MultiSelectDropdown from '../../components/profile/MultiSelectDropdown';
import { uploadImageAsync, uploadProfilePhoto, deleteOldProfilePhoto, updateProfilePhotoInDatabase } from '../../services/api/firebaseService';
import { AccountType } from '../../types/account';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Auto Bio Generation Function
 * Generates bio automatically from user profile fields based on account type
 */
const generateAutoBio = (formData: ProfileData, accountType: AccountType): string => {
  const parts: string[] = [];

  // Start with account type
  const accountTypeDisplay = accountType === 'Host' ? 'Trip Host' :
    accountType === 'EventOrganizer' ? 'Event Organizer' :
      accountType === 'RideCreator' ? 'Ride Partner' :
        accountType === 'StayHost' ? 'Stay Host' :
          accountType === 'AdventurePro' ? 'Adventure Pro' :
            accountType === 'Agency' ? 'Travel Agency' :
              accountType;
  parts.push(accountTypeDisplay);

  // Role-specific bio generation
  if (accountType === 'Traveler') {
    // Traveler: "Traveler | Solo Traveler exploring Nature & Adventure destinations."
    if (formData.travelerType) {
      parts.push(formData.travelerType);
    }
    if (formData.travelPreferences && formData.travelPreferences.length > 0) {
      const topPrefs = formData.travelPreferences.slice(0, 2).join(' & ');
      parts.push(`exploring ${topPrefs} destinations`);
    }
    if (formData.interests && formData.interests.length > 0) {
      const topInterests = formData.interests.slice(0, 2).join(' & ');
      if (!parts.includes(`exploring ${topInterests} destinations`)) {
        parts.push(`passionate about ${topInterests}`);
      }
    }
  } else if (accountType === 'Host') {
    // Host: "Trip Host | Trekking & Adventure specialist with 4+ years, operating across Manali & Auli."
    if (formData.tripCategories && formData.tripCategories.length > 0) {
      const categories = formData.tripCategories.slice(0, 2).join(' & ');
      parts.push(`${categories} specialist`);
    }
    if (formData.yearsOfExperience) {
      parts.push(`with ${formData.yearsOfExperience}+ years`);
    }
    if (formData.operatingRegions) {
      const regions = formData.operatingRegions.split(',').slice(0, 2).map(r => r.trim()).join(' & ');
      parts.push(`operating across ${regions}`);
    }
  } else if (accountType === 'Agency') {
    // Agency: "Travel Agency | Tour Operator offering Package Tours & Custom Itineraries in Goa."
    if (formData.agencyCategory) {
      parts.push(formData.agencyCategory);
    }
    if (formData.servicesOffered && formData.servicesOffered.length > 0) {
      const services = formData.servicesOffered.slice(0, 2).join(' & ');
      parts.push(`offering ${services}`);
    }
    if (formData.agencyLocation) {
      parts.push(`in ${formData.agencyLocation}`);
    }
  } else if (accountType === 'RideCreator') {
    // RideCreator: "Ride Partner | Car & SUV rentals from ₹500/day, available in Goa & Mumbai."
    if (formData.vehicleTypesAvailable && formData.vehicleTypesAvailable.length > 0) {
      const vehicles = formData.vehicleTypesAvailable.slice(0, 2).join(' & ');
      parts.push(`${vehicles} rentals`);
    }
    if (formData.priceRangePerDay) {
      parts.push(`from ${formData.priceRangePerDay}`);
    }
    if (formData.pickupLocations) {
      const locations = formData.pickupLocations.split(',').slice(0, 2).map(l => l.trim()).join(' & ');
      parts.push(`available in ${locations}`);
    }
  } else if (accountType === 'StayHost') {
    // StayHost: "Stay Host | BnB in Goa with WiFi, Parking & Breakfast, ₹2,000/night."
    if (formData.stayType) {
      parts.push(formData.stayType);
    }
    if (formData.stayLocation) {
      parts.push(`in ${formData.stayLocation}`);
    }
    if (formData.amenities && formData.amenities.length > 0) {
      const topAmenities = formData.amenities.slice(0, 3).join(', ');
      parts.push(`with ${topAmenities}`);
    }
    if (formData.pricePerNight) {
      parts.push(`₹${formData.pricePerNight.toLocaleString()}/night`);
    }
  } else if (accountType === 'EventOrganizer') {
    // EventOrg: "Event Organizer | Music & Food Festival specialist with 5+ years, hosting events across Mumbai & Delhi."
    if (formData.eventCategories && formData.eventCategories.length > 0) {
      const categories = formData.eventCategories.slice(0, 2).join(' & ');
      parts.push(`${categories} specialist`);
    }
    if (formData.yearsOfExperience) {
      parts.push(`with ${formData.yearsOfExperience}+ years`);
    }
    if (formData.regionsOfOperation) {
      const regions = formData.regionsOfOperation.split(',').slice(0, 2).map(r => r.trim()).join(' & ');
      parts.push(`hosting events across ${regions}`);
    }
  } else if (accountType === 'AdventurePro') {
    // AdventurePro: "Adventure Pro | Certified Skiing & Surfing Instructor with 4+ years, conducting courses across Manali & Auli."
    if (formData.adventureCategoriesOffered && formData.adventureCategoriesOffered.length > 0) {
      const categories = formData.adventureCategoriesOffered.slice(0, 2).join(' & ');
      if (formData.certificationProvided) {
        parts.push(`Certified ${categories} Instructor`);
      } else {
        parts.push(`${categories} Instructor`);
      }
    }
    if (formData.instructorExperience) {
      parts.push(`with ${formData.instructorExperience}+ years`);
    }
    if (formData.courseLocations) {
      const locations = formData.courseLocations.split(',').slice(0, 2).map(l => l.trim()).join(' & ');
      parts.push(`conducting courses across ${locations}`);
    }
  }

  // Join parts with " | " separator
  let bio = parts.join(' | ');

  // Add period at the end if not empty
  if (bio && !bio.endsWith('.')) {
    bio += '.';
  }

  // Fallback if bio is too short or empty
  if (!bio || bio.length < 10) {
    bio = `${accountTypeDisplay}.`;
  }

  return bio;
};

// Common languages list
const COMMON_LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Turkish', 'Dutch',
  'Swedish', 'Norwegian', 'Danish', 'Polish', 'Greek', 'Thai', 'Vietnamese',
  'Indonesian', 'Malay', 'Tagalog', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Other'
];

// Common interests list
const COMMON_INTERESTS = [
  'Adventure', 'Beach', 'Mountains', 'Culture', 'Food', 'Photography',
  'Wildlife', 'History', 'Art', 'Music', 'Sports', 'Shopping', 'Nightlife',
  'Wellness', 'Spiritual', 'Architecture', 'Nature', 'Hiking', 'Diving',
  'Skiing', 'Camping', 'Backpacking', 'Luxury Travel', 'Budget Travel',
  'Solo Travel', 'Family Travel', 'Business Travel', 'Other'
];

// Traveler types
const TRAVELER_TYPES = [
  'Solo Traveler', 'Couple', 'Family', 'Group Traveler', 'Business Traveler',
  'Backpacker', 'Luxury Traveler', 'Adventure Seeker', 'Cultural Explorer', 'Other'
];

// Travel experience levels
const TRAVEL_EXPERIENCE_LEVELS = [
  'Beginner', 'Intermediate', 'Experienced', 'Expert', 'Professional'
];

// Role-specific constants
const TRAVEL_PREFERENCES = ['Nature', 'Adventure', 'Heritage', 'Food', 'Culture', 'Beaches'];

const TRIP_CATEGORIES = [
  'Trekking', 'Adventure', 'Road Trips', 'Cycling', 'Hiking', 'Camping',
  'Wildlife Safari', 'Cultural Tours', 'Beach Tours', 'Mountain Tours', 'Other'
];

const AGENCY_CATEGORIES = [
  'Tour Operator', 'Travel Agency', 'Visa Services', 'Hotel Booking',
  'Flight Booking', 'Travel Insurance', 'Custom Packages', 'Other'
];

const AGENCY_SERVICES = [
  'Package Tours', 'Custom Itineraries', 'Hotel Booking', 'Flight Booking',
  'Visa Assistance', 'Travel Insurance', 'Car Rental', 'Guide Services', 'Other'
];

const VEHICLE_TYPES = ['Bike', 'Scooter', 'Car', 'SUV', 'Van', 'Other'];

const STAY_TYPES = ['BnB', 'Homestay', 'Hostel', 'Villa', 'Hotel', 'Resort', 'Other'];

const STAY_AMENITIES = [
  'WiFi', 'Parking', 'Breakfast', 'AC', 'Heating', 'Kitchen', 'Pool',
  'Gym', 'Laundry', 'Pet Friendly', 'Smoking Allowed', 'Other'
];

const EVENT_CATEGORIES = [
  'Music Festival', 'Food Festival', 'Cultural Event', 'Sports Event',
  'Adventure Event', 'Wellness Retreat', 'Workshop', 'Conference', 'Other'
];

const ADVENTURE_CATEGORIES = [
  'Skiing', 'Paragliding', 'Surfing', 'Scuba Diving', 'Rock Climbing',
  'Bungee Jumping', 'Rafting', 'Kayaking', 'Skydiving', 'Mountaineering', 'Other'
];

const COURSE_DURATIONS = ['1 week', '2 weeks', '3 weeks', '4 weeks'];

const SAFETY_STANDARDS = [
  'ISO Certified', 'Government Approved', 'Industry Standard',
  'International Certified', 'Local Standards', 'Other'
];

interface ProfileData {
  profilePhoto?: string;
  fullName: string;
  username: string;
  bio?: string;
  gender?: string;
  dob?: string;
  phoneNumber: string;
  email: string;
  country: string;
  state: string;
  city: string;
  languagesKnown: string[];
  interests: string[];
  travelerType?: string;
  travelExperience?: string;
  totalTripsDone?: number;
  favouriteDestinations?: string;
  aboutMe?: string;
  // Role-specific fields
  // Traveler
  travelPreferences?: string[];
  // HostTrip (Host)
  tripBrandName?: string;
  tripCategories?: string[];
  operatingRegions?: string;
  yearsOfExperience?: number;
  // Agency
  agencyName?: string;
  agencyCategory?: string;
  agencyLocation?: string;
  servicesOffered?: string[];
  businessLogo?: string;
  // RideCreator
  rentalBrandName?: string;
  vehicleTypesAvailable?: string[];
  priceRangePerDay?: string;
  pickupLocations?: string;
  rentalTermsAndRules?: string;
  // StayHost
  stayName?: string;
  stayLocation?: string;
  stayType?: string;
  amenities?: string[];
  pricePerNight?: number;
  maxGuests?: number;
  houseRules?: string;
  stayPhotos?: string[];
  // EventOrg (EventOrganizer)
  eventBrandName?: string;
  eventCategories?: string[];
  regionsOfOperation?: string;
  audienceCapacity?: number;
  previousEventGallery?: string[];
  // AdventurePro
  academyName?: string;
  adventureCategoriesOffered?: string[];
  courseDuration?: string;
  certificationProvided?: boolean;
  instructorExperience?: number;
  safetyStandardsFollowed?: string;
  equipmentIncluded?: string[];
  coursePriceRange?: string;
  courseLocations?: string;
  courseGallery?: string[];
}

export default function EditProfileScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('Traveler');

  const [formData, setFormData] = useState<ProfileData>({
    fullName: '',
    username: '',
    phoneNumber: '',
    email: '',
    country: '',
    state: '',
    city: '',
    languagesKnown: [],
    interests: [],
  });
  const [previousProfilePhotoUrl, setPreviousProfilePhotoUrl] = useState<string | null>(null);

  // Fetch user data from Firestore - memoized with useCallback
  const fetchUserData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log('📋 [EditProfileScreen] Fetched user data:', {
          fullName: data.fullName || data.displayName,
          username: data.username,
          email: data.email || user.email,
          profilePhoto: data.profilePhoto || data.photoURL || data.profilePhotoUrl,
        });

        const userAccountType = (data.accountType || data.role || 'Traveler') as AccountType;
        setAccountType(userAccountType);

        const currentProfilePhoto = data.profilePhoto || data.photoURL || data.profilePhotoUrl || '';
        setPreviousProfilePhotoUrl(currentProfilePhoto || null);
        setFormData({
          profilePhoto: currentProfilePhoto,
          fullName: data.fullName || data.displayName || '',
          username: data.username || '',
          bio: data.bio || '', // Hidden field, auto-generated later
          gender: data.gender || '',
          dob: data.dob || '',
          phoneNumber: data.phoneNumber || data.phone || '',
          email: data.email || user.email || '',
          country: data.country || '',
          state: data.state || '',
          city: data.city || '',
          languagesKnown: data.languagesKnown || [],
          interests: data.interests || [],
          travelerType: data.travelerType || '',
          travelExperience: data.travelExperience || '',
          totalTripsDone: data.totalTripsDone || undefined,
          favouriteDestinations: data.favouriteDestinations || '',
          aboutMe: data.aboutMe || data.about || '',
          // Role-specific fields
          travelPreferences: data.travelPreferences || [],
          tripBrandName: data.tripBrandName || '',
          tripCategories: data.tripCategories || [],
          operatingRegions: data.operatingRegions || '',
          yearsOfExperience: data.yearsOfExperience || undefined,
          agencyName: data.agencyName || '',
          agencyCategory: data.agencyCategory || '',
          agencyLocation: data.agencyLocation || '',
          servicesOffered: data.servicesOffered || [],
          businessLogo: data.businessLogo || '',
          rentalBrandName: data.rentalBrandName || '',
          vehicleTypesAvailable: data.vehicleTypesAvailable || [],
          priceRangePerDay: data.priceRangePerDay || '',
          pickupLocations: data.pickupLocations || '',
          rentalTermsAndRules: data.rentalTermsAndRules || '',
          stayName: data.stayName || '',
          stayLocation: data.stayLocation || '',
          stayType: data.stayType || '',
          amenities: data.amenities || [],
          pricePerNight: data.pricePerNight || undefined,
          maxGuests: data.maxGuests || undefined,
          houseRules: data.houseRules || '',
          stayPhotos: data.stayPhotos || [],
          eventBrandName: data.eventBrandName || '',
          eventCategories: data.eventCategories || [],
          regionsOfOperation: data.regionsOfOperation || '',
          audienceCapacity: data.audienceCapacity || undefined,
          previousEventGallery: data.previousEventGallery || [],
          academyName: data.academyName || '',
          adventureCategoriesOffered: data.adventureCategoriesOffered || [],
          courseDuration: data.courseDuration || '',
          certificationProvided: data.certificationProvided || false,
          instructorExperience: data.instructorExperience || undefined,
          safetyStandardsFollowed: data.safetyStandardsFollowed || '',
          equipmentIncluded: data.equipmentIncluded || [],
          coursePriceRange: data.coursePriceRange || '',
          courseLocations: data.courseLocations || '',
          courseGallery: data.courseGallery || [],
        });
        console.log('✅ [EditProfileScreen] Form data updated with user data');
      } else {
        console.warn('⚠️ [EditProfileScreen] User document does not exist');
        // Initialize with user email if available
        setFormData((prev) => ({
          ...prev,
          email: user.email || prev.email,
        }));
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch user data when component mounts or user changes
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const handleProfilePhotoUpload = useCallback(async (finalImageUri: string) => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Upload new profile photo
      const downloadURL = await uploadProfilePhoto(finalImageUri, user.uid);
      console.log('✅ [EditProfileScreen] Profile photo uploaded:', downloadURL);

      // Delete old profile photo if exists
      if (previousProfilePhotoUrl) {
        await deleteOldProfilePhoto(previousProfilePhotoUrl);
        console.log('✅ [EditProfileScreen] Old profile photo deleted');
      }

      // Update Firestore
      await updateProfilePhotoInDatabase(user.uid, downloadURL);
      console.log('✅ [EditProfileScreen] Profile photo updated in database');

      // Update local state
      setFormData((prev) => ({ ...prev, profilePhoto: downloadURL }));
      setPreviousProfilePhotoUrl(downloadURL);

      // Refetch user data to ensure everything is in sync
      await fetchUserData();

      Alert.alert('Success', 'Profile photo updated successfully');
    } catch (error: any) {
      console.error('❌ [EditProfileScreen] Error uploading profile photo:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  }, [user, previousProfilePhotoUrl, fetchUserData]);

  // Handle finalProfilePhoto from ProfilePhotoCropScreen
  useFocusEffect(
    React.useCallback(() => {
      const finalPhoto = route.params?.finalProfilePhoto;
      if (finalPhoto) {
        console.log('📸 [EditProfileScreen] Received final profile photo from crop screen');
        // Clear the param first to prevent re-processing
        navigation.setParams({ finalProfilePhoto: undefined });
        // Then handle the upload
        handleProfilePhotoUpload(finalPhoto);
      }
    }, [route.params?.finalProfilePhoto, navigation, handleProfilePhotoUpload])
  );

  const handlePickProfilePhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1.0, // High quality for profile photos
      });

      if (result.assets && result.assets[0]) {
        const imageAsset = result.assets[0];
        // Navigate to ProfilePhotoCropScreen instead of uploading directly
        navigation.navigate('ProfilePhotoCrop', {
          imageUri: imageAsset.uri || '',
        });
      }
    } catch (error: any) {
      console.error('Error picking photo:', error);
      if (error.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('Error', 'Failed to pick image');
      }
    }
  };


  const handleSave = async () => {
    // Validate required fields
    if (!formData.fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Phone number is required');
      return;
    }
    if (!formData.country.trim()) {
      Alert.alert('Validation Error', 'Country is required');
      return;
    }
    if (!formData.state.trim()) {
      Alert.alert('Validation Error', 'State is required');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Validation Error', 'City is required');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      setSaving(true);
      const userRef = doc(db, 'users', user.uid);

      // Generate auto bio
      const generatedBio = generateAutoBio(formData, accountType);

      // Prepare update data (exclude readonly fields: username, email)
      const updateData: any = {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        country: formData.country.trim(),
        state: formData.state.trim(),
        city: formData.city.trim(),
        languagesKnown: formData.languagesKnown.length > 0 ? formData.languagesKnown : null,
        interests: formData.interests.length > 0 ? formData.interests : null,
        bio: generatedBio, // Auto-generated bio
        updatedAt: Date.now(),
      };

      // Add optional fields - set to null if empty
      updateData.profilePhoto = formData.profilePhoto || null;
      if (formData.profilePhoto) {
        updateData.photoURL = formData.profilePhoto; // Also update legacy field
      }
      updateData.gender = formData.gender || null;
      updateData.dob = formData.dob || null;
      updateData.travelerType = formData.travelerType || null;
      updateData.travelExperience = formData.travelExperience || null;
      updateData.totalTripsDone = formData.totalTripsDone !== undefined ? formData.totalTripsDone : null;
      updateData.favouriteDestinations = formData.favouriteDestinations?.trim() || null;
      updateData.aboutMe = formData.aboutMe?.trim() || null;

      // Role-specific fields - set to null if empty
      if (accountType === 'Traveler') {
        updateData.travelPreferences = formData.travelPreferences && formData.travelPreferences.length > 0 ? formData.travelPreferences : null;
      } else if (accountType === 'Host') {
        updateData.tripBrandName = formData.tripBrandName?.trim() || null;
        updateData.tripCategories = formData.tripCategories && formData.tripCategories.length > 0 ? formData.tripCategories : null;
        updateData.operatingRegions = formData.operatingRegions?.trim() || null;
        updateData.yearsOfExperience = formData.yearsOfExperience !== undefined ? formData.yearsOfExperience : null;
      } else if (accountType === 'Agency') {
        updateData.agencyName = formData.agencyName?.trim() || null;
        updateData.agencyCategory = formData.agencyCategory || null;
        updateData.agencyLocation = formData.agencyLocation?.trim() || null;
        updateData.servicesOffered = formData.servicesOffered && formData.servicesOffered.length > 0 ? formData.servicesOffered : null;
        updateData.businessLogo = formData.businessLogo || null;
      } else if (accountType === 'RideCreator') {
        updateData.rentalBrandName = formData.rentalBrandName?.trim() || null;
        updateData.vehicleTypesAvailable = formData.vehicleTypesAvailable && formData.vehicleTypesAvailable.length > 0 ? formData.vehicleTypesAvailable : null;
        updateData.priceRangePerDay = formData.priceRangePerDay?.trim() || null;
        updateData.pickupLocations = formData.pickupLocations?.trim() || null;
        updateData.rentalTermsAndRules = formData.rentalTermsAndRules?.trim() || null;
      } else if (accountType === 'StayHost') {
        updateData.stayName = formData.stayName?.trim() || null;
        updateData.stayLocation = formData.stayLocation?.trim() || null;
        updateData.stayType = formData.stayType || null;
        updateData.amenities = formData.amenities && formData.amenities.length > 0 ? formData.amenities : null;
        updateData.pricePerNight = formData.pricePerNight !== undefined ? formData.pricePerNight : null;
        updateData.maxGuests = formData.maxGuests !== undefined ? formData.maxGuests : null;
        updateData.houseRules = formData.houseRules?.trim() || null;
        updateData.stayPhotos = formData.stayPhotos && formData.stayPhotos.length > 0 ? formData.stayPhotos : null;
      } else if (accountType === 'EventOrganizer') {
        updateData.eventBrandName = formData.eventBrandName?.trim() || null;
        updateData.eventCategories = formData.eventCategories && formData.eventCategories.length > 0 ? formData.eventCategories : null;
        updateData.regionsOfOperation = formData.regionsOfOperation?.trim() || null;
        updateData.yearsOfExperience = formData.yearsOfExperience !== undefined ? formData.yearsOfExperience : null;
        updateData.audienceCapacity = formData.audienceCapacity !== undefined ? formData.audienceCapacity : null;
        updateData.previousEventGallery = formData.previousEventGallery && formData.previousEventGallery.length > 0 ? formData.previousEventGallery : null;
      } else if (accountType === 'AdventurePro') {
        updateData.academyName = formData.academyName?.trim() || null;
        updateData.adventureCategoriesOffered = formData.adventureCategoriesOffered && formData.adventureCategoriesOffered.length > 0 ? formData.adventureCategoriesOffered : null;
        updateData.courseDuration = formData.courseDuration || null;
        updateData.certificationProvided = formData.certificationProvided !== undefined ? formData.certificationProvided : null;
        updateData.instructorExperience = formData.instructorExperience !== undefined ? formData.instructorExperience : null;
        updateData.safetyStandardsFollowed = formData.safetyStandardsFollowed || null;
        updateData.equipmentIncluded = formData.equipmentIncluded && formData.equipmentIncluded.length > 0 ? formData.equipmentIncluded : null;
        updateData.coursePriceRange = formData.coursePriceRange?.trim() || null;
        updateData.courseLocations = formData.courseLocations?.trim() || null;
        updateData.courseGallery = formData.courseGallery && formData.courseGallery.length > 0 ? formData.courseGallery : null;
      }

      await updateDoc(userRef, updateData);

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };


  const handlePickGalleryImages = async (galleryField: 'stayPhotos' | 'previousEventGallery' | 'courseGallery') => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 10,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (result.assets && result.assets.length > 0) {
        setUploadingGallery(galleryField);
        const uploadPromises = result.assets.map(async (asset) => {
          if (!user?.uid) throw new Error('User ID required');
          return await uploadImageAsync(
            { uri: asset.uri || '' },
            user.uid,
            galleryField
          );
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        setFormData((prev) => ({
          ...prev,
          [galleryField]: [...(prev[galleryField] || []), ...uploadedUrls],
        }));
        setUploadingGallery(null);
      }
    } catch (error: any) {
      console.error('Error picking/uploading gallery images:', error);
      setUploadingGallery(null);
      Alert.alert('Error', 'Failed to upload images');
    }
  };

  const handleRemoveGalleryImage = (galleryField: 'stayPhotos' | 'previousEventGallery' | 'courseGallery', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [galleryField]: (prev[galleryField] || []).filter((_, i) => i !== index),
    }));
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo Section */}
        <Card style={styles.profilePhotoCard}>
          <View style={styles.profilePhotoContainer}>
            {formData.profilePhoto ? (
              <Image source={{ uri: formData.profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Icon name="person" size={40} color={Colors.black.qua} />
              </View>
            )}
            <TouchableOpacity
              style={styles.editPhotoButton}
              onPress={handlePickProfilePhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={Colors.white.primary} />
              ) : (
                <Icon name="camera" size={20} color={Colors.white.primary} />
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* Basic Information Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.black.qua}
              value={formData.fullName}
              onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, styles.inputReadonly]}
              value={formData.username}
              editable={false}
              placeholder="Username"
              placeholderTextColor={Colors.black.qua}
            />
            <Text style={styles.hint}>Username cannot be changed</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputReadonly]}
              value={formData.email}
              editable={false}
              placeholder="Email"
              placeholderTextColor={Colors.black.qua}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.hint}>Email cannot be changed</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.radioGroup}>
              {['Male', 'Female', 'Other', 'Prefer not to say'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.radioOption,
                    formData.gender === option && styles.radioOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: option })}
                >
                  <Text
                    style={[
                      styles.radioText,
                      formData.gender === option && styles.radioTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.black.qua}
              value={formData.dob}
              onChangeText={(text) => setFormData({ ...formData, dob: text })}
              keyboardType="numeric"
              maxLength={10}
            />
            <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor={Colors.black.qua}
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Country *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your country"
              placeholderTextColor={Colors.black.qua}
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your state"
              placeholderTextColor={Colors.black.qua}
              value={formData.state}
              onChangeText={(text) => setFormData({ ...formData, state: text })}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your city"
              placeholderTextColor={Colors.black.qua}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />
          </View>

          <MultiSelectDropdown
            label="Languages Known"
            options={COMMON_LANGUAGES}
            selectedValues={formData.languagesKnown}
            onSelectionChange={(values) => setFormData({ ...formData, languagesKnown: values })}
            placeholder="Select languages"
          />

          <MultiSelectDropdown
            label="Interests"
            options={COMMON_INTERESTS}
            selectedValues={formData.interests}
            onSelectionChange={(values) => setFormData({ ...formData, interests: values })}
            placeholder="Select interests"
          />

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>About Me</Text>
            <Text style={styles.hint}>This will be used to auto-generate your bio later. Recommended: 50-60 characters (max 60)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                formData.aboutMe && formData.aboutMe.length > 100 && styles.inputError,
              ]}
              placeholder="Tell us about yourself, your travel experiences, and what makes you unique... (50-60 characters recommended)"
              placeholderTextColor={Colors.black.qua}
              value={formData.aboutMe}
              onChangeText={(text) => {
                // Limit to 100 characters
                if (text.length <= 100) {
                  setFormData({ ...formData, aboutMe: text });
                }
              }}
              multiline
              numberOfLines={3}
              maxLength={100}
            />
            <View style={styles.characterCountContainer}>
              <Text
                style={[
                  styles.characterCount,
                  formData.aboutMe && formData.aboutMe.length < 80 && styles.characterCountWarning,
                  formData.aboutMe && formData.aboutMe.length > 100 && styles.characterCountError,
                ]}
              >
                {formData.aboutMe?.length || 0}/100 characters
                {formData.aboutMe && formData.aboutMe.length < 80 && ' (Recommended: 80-90 characters)'}
                {formData.aboutMe && formData.aboutMe.length > 100 && ' (Exceeds limit)'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Travel Information Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Travel Information</Text>
          <Text style={styles.sectionDescription}>Optional travel-related details</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Travel Experience</Text>
            <View style={styles.selectContainer}>
              {TRAVEL_EXPERIENCE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.selectOption,
                    formData.travelExperience === level && styles.selectOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, travelExperience: level })}
                >
                  <Text
                    style={[
                      styles.selectText,
                      formData.travelExperience === level && styles.selectTextSelected,
                    ]}
                  >
                    {level}
                  </Text>
                  {formData.travelExperience === level && (
                    <Icon name="checkmark" size={18} color={Colors.brand.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Total Trips Done</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter number of trips"
              placeholderTextColor={Colors.black.qua}
              value={formData.totalTripsDone?.toString() || ''}
              onChangeText={(text) => {
                const num = parseInt(text, 10);
                setFormData({
                  ...formData,
                  totalTripsDone: isNaN(num) ? undefined : num,
                });
              }}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Favourite Destinations</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List your favourite destinations (comma-separated)"
              placeholderTextColor={Colors.black.qua}
              value={formData.favouriteDestinations}
              onChangeText={(text) => setFormData({ ...formData, favouriteDestinations: text })}
              multiline
              numberOfLines={3}
            />
          </View>
        </Card>

        {/* Role-Based Sections */}
        {accountType === 'Traveler' && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Traveler Profile</Text>
            <MultiSelectDropdown
              label="Travel Preferences"
              options={TRAVEL_PREFERENCES}
              selectedValues={formData.travelPreferences || []}
              onSelectionChange={(values) => setFormData({ ...formData, travelPreferences: values })}
              placeholder="Select travel preferences"
            />
          </Card>
        )}

        {accountType === 'Host' && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Trip Host Profile</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Trip Brand Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your trip brand name"
                placeholderTextColor={Colors.black.qua}
                value={formData.tripBrandName}
                onChangeText={(text) => setFormData({ ...formData, tripBrandName: text })}
              />
            </View>
            <MultiSelectDropdown
              label="Trip Categories"
              options={TRIP_CATEGORIES}
              selectedValues={formData.tripCategories || []}
              onSelectionChange={(values) => setFormData({ ...formData, tripCategories: values })}
              placeholder="Select trip categories"
            />
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Operating Regions</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter regions where you operate"
                placeholderTextColor={Colors.black.qua}
                value={formData.operatingRegions}
                onChangeText={(text) => setFormData({ ...formData, operatingRegions: text })}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter years of experience"
                placeholderTextColor={Colors.black.qua}
                value={formData.yearsOfExperience?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  setFormData({
                    ...formData,
                    yearsOfExperience: isNaN(num) ? undefined : num,
                  });
                }}
                keyboardType="numeric"
              />
            </View>
          </Card>
        )}

        {accountType === 'Agency' && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Agency Profile</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Agency Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your agency name"
                placeholderTextColor={Colors.black.qua}
                value={formData.agencyName}
                onChangeText={(text) => setFormData({ ...formData, agencyName: text })}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Agency Category</Text>
              <View style={styles.selectContainer}>
                {AGENCY_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.selectOption,
                      formData.agencyCategory === category && styles.selectOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, agencyCategory: category })}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        formData.agencyCategory === category && styles.selectTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                    {formData.agencyCategory === category && (
                      <Icon name="checkmark" size={18} color={Colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Agency Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter agency location"
                placeholderTextColor={Colors.black.qua}
                value={formData.agencyLocation}
                onChangeText={(text) => setFormData({ ...formData, agencyLocation: text })}
              />
            </View>
            <MultiSelectDropdown
              label="Services Offered"
              options={AGENCY_SERVICES}
              selectedValues={formData.servicesOffered || []}
              onSelectionChange={(values) => setFormData({ ...formData, servicesOffered: values })}
              placeholder="Select services offered"
            />
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Business Logo (Optional)</Text>
              <TouchableOpacity
                style={styles.logoButton}
                onPress={async () => {
                  try {
                    const result = await launchImageLibrary({
                      mediaType: 'photo',
                      quality: 0.8,
                      maxWidth: 800,
                      maxHeight: 800,
                    });
                    if (result.assets && result.assets[0]) {
                      const fileName = `business_logos/${user?.uid}/${Date.now()}.jpg`;
                      const downloadURL = await uploadImageAsync({
                        uri: result.assets[0].uri || '',
                        path: fileName,
                      });
                      setFormData({ ...formData, businessLogo: downloadURL });
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Failed to upload logo');
                  }
                }}
              >
                {formData.businessLogo ? (
                  <Image source={{ uri: formData.businessLogo }} style={styles.logoPreview} />
                ) : (
                  <>
                    <Icon name="image-outline" size={24} color={Colors.brand.primary} />
                    <Text style={styles.logoButtonText}>Upload Logo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {accountType === 'RideCreator' && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ride Creator Profile</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Rental Brand Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your rental brand name"
                placeholderTextColor={Colors.black.qua}
                value={formData.rentalBrandName}
                onChangeText={(text) => setFormData({ ...formData, rentalBrandName: text })}
              />
            </View>
            <MultiSelectDropdown
              label="Vehicle Types Available"
              options={VEHICLE_TYPES}
              selectedValues={formData.vehicleTypesAvailable || []}
              onSelectionChange={(values) => setFormData({ ...formData, vehicleTypesAvailable: values })}
              placeholder="Select vehicle types"
            />
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Price Range Per Day</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., ₹500 - ₹5,000"
                placeholderTextColor={Colors.black.qua}
                value={formData.priceRangePerDay}
                onChangeText={(text) => setFormData({ ...formData, priceRangePerDay: text })}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Pickup Locations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List pickup locations (comma-separated)"
                placeholderTextColor={Colors.black.qua}
                value={formData.pickupLocations}
                onChangeText={(text) => setFormData({ ...formData, pickupLocations: text })}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Rental Terms and Rules</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter rental terms and rules"
                placeholderTextColor={Colors.black.qua}
                value={formData.rentalTermsAndRules}
                onChangeText={(text) => setFormData({ ...formData, rentalTermsAndRules: text })}
                multiline
                numberOfLines={5}
              />
            </View>
          </Card>
        )}

        {accountType === 'StayHost' && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Stay Host Profile</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Stay Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your stay name"
                placeholderTextColor={Colors.black.qua}
                value={formData.stayName}
                onChangeText={(text) => setFormData({ ...formData, stayName: text })}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Stay Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter stay location"
                placeholderTextColor={Colors.black.qua}
                value={formData.stayLocation}
                onChangeText={(text) => setFormData({ ...formData, stayLocation: text })}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Stay Type</Text>
              <View style={styles.selectContainer}>
                {STAY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.selectOption,
                      formData.stayType === type && styles.selectOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, stayType: type })}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        formData.stayType === type && styles.selectTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                    {formData.stayType === type && (
                      <Icon name="checkmark" size={18} color={Colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <MultiSelectDropdown
              label="Amenities"
              options={STAY_AMENITIES}
              selectedValues={formData.amenities || []}
              onSelectionChange={(values) => setFormData({ ...formData, amenities: values })}
              placeholder="Select amenities"
            />
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Price Per Night (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price per night"
                placeholderTextColor={Colors.black.qua}
                value={formData.pricePerNight?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  setFormData({
                    ...formData,
                    pricePerNight: isNaN(num) ? undefined : num,
                  });
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Max Guests</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter maximum guests"
                placeholderTextColor={Colors.black.qua}
                value={formData.maxGuests?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  setFormData({
                    ...formData,
                    maxGuests: isNaN(num) ? undefined : num,
                  });
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>House Rules</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter house rules"
                placeholderTextColor={Colors.black.qua}
                value={formData.houseRules}
                onChangeText={(text) => setFormData({ ...formData, houseRules: text })}
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Stay Photos</Text>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={() => handlePickGalleryImages('stayPhotos')}
                disabled={uploadingGallery === 'stayPhotos'}
              >
                {uploadingGallery === 'stayPhotos' ? (
                  <ActivityIndicator size="small" color={Colors.brand.primary} />
                ) : (
                  <>
                    <Icon name="images-outline" size={20} color={Colors.brand.primary} />
                    <Text style={styles.galleryButtonText}>Add Images</Text>
                  </>
                )}
              </TouchableOpacity>
              {formData.stayPhotos && formData.stayPhotos.length > 0 && (
                <View style={styles.galleryPreview}>
                  {formData.stayPhotos.map((url, index) => (
                    <View key={index} style={styles.galleryImageContainer}>
                      <Image source={{ uri: url }} style={styles.galleryImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveGalleryImage('stayPhotos', index)}
                      >
                        <Icon name="close-circle" size={24} color="#E53935" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Card>
        )}

        {accountType === 'EventOrganizer' && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Event Organizer Profile</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Event Brand Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your event brand name"
                placeholderTextColor={Colors.black.qua}
                value={formData.eventBrandName}
                onChangeText={(text) => setFormData({ ...formData, eventBrandName: text })}
              />
            </View>
            <MultiSelectDropdown
              label="Event Categories"
              options={EVENT_CATEGORIES}
              selectedValues={formData.eventCategories || []}
              onSelectionChange={(values) => setFormData({ ...formData, eventCategories: values })}
              placeholder="Select event categories"
            />
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Regions of Operation</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter regions where you operate"
                placeholderTextColor={Colors.black.qua}
                value={formData.regionsOfOperation}
                onChangeText={(text) => setFormData({ ...formData, regionsOfOperation: text })}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter years of experience"
                placeholderTextColor={Colors.black.qua}
                value={formData.yearsOfExperience?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  setFormData({
                    ...formData,
                    yearsOfExperience: isNaN(num) ? undefined : num,
                  });
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Audience Capacity</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter maximum audience capacity"
                placeholderTextColor={Colors.black.qua}
                value={formData.audienceCapacity?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  setFormData({
                    ...formData,
                    audienceCapacity: isNaN(num) ? undefined : num,
                  });
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Previous Event Gallery</Text>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={() => handlePickGalleryImages('previousEventGallery')}
                disabled={uploadingGallery === 'previousEventGallery'}
              >
                {uploadingGallery === 'previousEventGallery' ? (
                  <ActivityIndicator size="small" color={Colors.brand.primary} />
                ) : (
                  <>
                    <Icon name="images-outline" size={20} color={Colors.brand.primary} />
                    <Text style={styles.galleryButtonText}>Add Images</Text>
                  </>
                )}
              </TouchableOpacity>
              {formData.previousEventGallery && formData.previousEventGallery.length > 0 && (
                <View style={styles.galleryPreview}>
                  {formData.previousEventGallery.map((url, index) => (
                    <View key={index} style={styles.galleryImageContainer}>
                      <Image source={{ uri: url }} style={styles.galleryImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveGalleryImage('previousEventGallery', index)}
                      >
                        <Icon name="close-circle" size={24} color="#E53935" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Card>
        )}

        {accountType === 'AdventurePro' && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Adventure Pro Profile</Text>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Academy Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your academy name"
                placeholderTextColor={Colors.black.qua}
                value={formData.academyName}
                onChangeText={(text) => setFormData({ ...formData, academyName: text })}
              />
            </View>
            <MultiSelectDropdown
              label="Adventure Categories Offered"
              options={ADVENTURE_CATEGORIES}
              selectedValues={formData.adventureCategoriesOffered || []}
              onSelectionChange={(values) => setFormData({ ...formData, adventureCategoriesOffered: values })}
              placeholder="Select adventure categories"
            />
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Course Duration</Text>
              <View style={styles.selectContainer}>
                {COURSE_DURATIONS.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.selectOption,
                      formData.courseDuration === duration && styles.selectOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, courseDuration: duration })}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        formData.courseDuration === duration && styles.selectTextSelected,
                      ]}
                    >
                      {duration}
                    </Text>
                    {formData.courseDuration === duration && (
                      <Icon name="checkmark" size={18} color={Colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Certification Provided</Text>
              <View style={styles.radioGroup}>
                {['YES', 'NO'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.radioOption,
                      (formData.certificationProvided ? 'YES' : 'NO') === option && styles.radioOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, certificationProvided: option === 'YES' })}
                  >
                    <Text
                      style={[
                        styles.radioText,
                        (formData.certificationProvided ? 'YES' : 'NO') === option && styles.radioTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Instructor Experience (Years)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter instructor experience in years"
                placeholderTextColor={Colors.black.qua}
                value={formData.instructorExperience?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  setFormData({
                    ...formData,
                    instructorExperience: isNaN(num) ? undefined : num,
                  });
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Safety Standards Followed</Text>
              <View style={styles.selectContainer}>
                {SAFETY_STANDARDS.map((standard) => (
                  <TouchableOpacity
                    key={standard}
                    style={[
                      styles.selectOption,
                      formData.safetyStandardsFollowed === standard && styles.selectOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, safetyStandardsFollowed: standard })}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        formData.safetyStandardsFollowed === standard && styles.selectTextSelected,
                      ]}
                    >
                      {standard}
                    </Text>
                    {formData.safetyStandardsFollowed === standard && (
                      <Icon name="checkmark" size={18} color={Colors.brand.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <MultiSelectDropdown
              label="Equipment Included"
              options={['Helmet', 'Safety Gear', 'Equipment', 'Training Materials', 'Certification', 'Other']}
              selectedValues={formData.equipmentIncluded || []}
              onSelectionChange={(values) => setFormData({ ...formData, equipmentIncluded: values })}
              placeholder="Select equipment included"
            />
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Course Price Range</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., ₹10,000 - ₹50,000"
                placeholderTextColor={Colors.black.qua}
                value={formData.coursePriceRange}
                onChangeText={(text) => setFormData({ ...formData, coursePriceRange: text })}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Course Locations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List course locations (comma-separated)"
                placeholderTextColor={Colors.black.qua}
                value={formData.courseLocations}
                onChangeText={(text) => setFormData({ ...formData, courseLocations: text })}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Course Gallery</Text>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={() => handlePickGalleryImages('courseGallery')}
                disabled={uploadingGallery === 'courseGallery'}
              >
                {uploadingGallery === 'courseGallery' ? (
                  <ActivityIndicator size="small" color={Colors.brand.primary} />
                ) : (
                  <>
                    <Icon name="images-outline" size={20} color={Colors.brand.primary} />
                    <Text style={styles.galleryButtonText}>Add Images</Text>
                  </>
                )}
              </TouchableOpacity>
              {formData.courseGallery && formData.courseGallery.length > 0 && (
                <View style={styles.galleryPreview}>
                  {formData.courseGallery.map((url, index) => (
                    <View key={index} style={styles.galleryImageContainer}>
                      <Image source={{ uri: url }} style={styles.galleryImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveGalleryImage('courseGallery', index)}
                      >
                        <Icon name="close-circle" size={24} color="#E53935" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Bottom spacing for floating button */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white.primary} />
          ) : (
            <>
              <Icon name="checkmark-circle" size={20} color={Colors.white.primary} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profilePhotoCard: {
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 24,
  },
  profilePhotoContainer: {
    position: 'relative',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white.tertiary,
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white.primary,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.black.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white.primary,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
  },
  inputReadonly: {
    backgroundColor: Colors.white.secondary,
    color: Colors.black.qua,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginTop: 4,
  },
  characterCountContainer: {
    marginTop: 6,
    alignItems: 'flex-end',
  },
  characterCount: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  characterCountWarning: {
    color: Colors.accent.amber,
  },
  characterCountError: {
    color: Colors.accent.red,
  },
  inputError: {
    borderColor: Colors.accent.red,
    borderWidth: 1,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    backgroundColor: Colors.white.primary,
  },
  radioOptionSelected: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.accent,
  },
  radioText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  radioTextSelected: {
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    backgroundColor: Colors.white.primary,
  },
  selectOptionSelected: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.accent,
  },
  selectText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
  },
  selectTextSelected: {
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
  },
  bottomSpacing: {
    height: 80,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.white.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.white.tertiary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.brand.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white.primary,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.white.primary,
  },
  galleryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
  },
  galleryPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  galleryImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    backgroundColor: Colors.white.primary,
    minHeight: 60,
  },
  logoButtonText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.brand.primary,
  },
  logoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: Colors.white.tertiary,
  },
});

