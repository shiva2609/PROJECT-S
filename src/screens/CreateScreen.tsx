/**
 * Dynamic Create Screen
 * 
 * Adapts based on the logged-in user's verified account type.
 * Shows different creation options (Post, Reel, Package, Stay, etc.)
 * based on account permissions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../utils/colors';
import { db } from '../api/authService';
import { doc, onSnapshot } from 'firebase/firestore';
import { AccountType, getAccountTypeMetadata, CreateOption, VerificationStatus } from '../types/account';
import { useAuth } from '../contexts/AuthContext';

// Creator Components
import PostAndReelCreator from '../components/create/PostAndReelCreator';
import PackageCreator from '../components/create/PackageCreator';
import StayCreator from '../components/create/StayCreator';
import RideCreator from '../components/create/RideCreator';
import EventCreator from '../components/create/EventCreator';
import CourseCreator from '../components/create/CourseCreator';
import AffiliateCreator from '../components/create/AffiliateCreator';
import LocalTourCreator from '../components/create/LocalTourCreator';
import ItineraryCreator from '../components/create/ItineraryCreator';
import TeamCreator from '../components/create/TeamCreator';

type CreateMode = CreateOption | null;

export default function CreateScreen({ navigation }: any) {
  const { user } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>('Traveler');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('none');
  const [loading, setLoading] = useState(true);
  const [createMode, setCreateMode] = useState<CreateMode>(null);

  // Real-time listener for accountType changes
  useEffect(() => {
    if (!user) {
      setAccountType('Traveler');
      setVerificationStatus('none');
      setLoading(false);
      return;
    }

    console.log('📊 CreateScreen - Setting up real-time accountType listener for:', user.uid);

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          const userData = snap.data();
          const accType = (userData.accountType || userData.role || 'Traveler') as AccountType;
          const verStatus = (userData.verificationStatus || 'none') as VerificationStatus;
          
          console.log('📊 CreateScreen - AccountType updated:', {
            accountType: accType,
            verificationStatus: verStatus,
            uid: user.uid,
            createOptions: getAccountTypeMetadata(accType).createOptions,
          });
          
          setAccountType(accType);
          setVerificationStatus(verStatus);
          
          // Reset createMode if current mode is not available for new accountType
          const metadata = getAccountTypeMetadata(accType);
          setCreateMode((currentMode) => {
            if (currentMode && !metadata.createOptions.includes(currentMode)) {
              console.log('📊 CreateScreen - Resetting createMode, not available for new accountType');
              return null;
            }
            return currentMode;
          });
        } else {
          console.log('⚠️ CreateScreen - User document not found, defaulting to Traveler');
          setAccountType('Traveler');
          setVerificationStatus('none');
          setCreateMode(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ CreateScreen - Error fetching user data:', error);
        setAccountType('Traveler');
        setVerificationStatus('none');
        setLoading(false);
      }
    );

    return () => {
      console.log('📊 CreateScreen - Cleaning up accountType listener');
      unsubscribe();
    };
  }, [user]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📊 CreateScreen - Screen focused, current accountType:', accountType);
    }, [accountType])
  );

  const accountMetadata = getAccountTypeMetadata(accountType);
  
  // Debug logging
  console.log('📊 CreateScreen - Render state:', {
    accountType,
    verificationStatus,
    createOptions: accountMetadata.createOptions,
    createOptionsCount: accountMetadata.createOptions.length,
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // If a specific create mode is selected, show that creator
  if (createMode) {
    const CreatorComponent = getCreatorComponent(createMode);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCreateMode(null)} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create {createMode}</Text>
          <View style={{ width: 24 }} />
        </View>
        <CreatorComponent
          accountType={accountType}
          onClose={() => setCreateMode(null)}
          navigation={navigation}
        />
      </SafeAreaView>
    );
  }

  // Main menu - show available creation options
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create</Text>
          <View style={[styles.badge, { backgroundColor: accountMetadata.color }]}>
            <Text style={styles.badgeText}>{accountMetadata.tag}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>What would you like to create?</Text>

        <View style={styles.optionsGrid}>
          {accountMetadata.createOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.optionCard}
              onPress={() => {
                // Navigate to specific screens for Post and Reel
                if (option === 'Post') {
                  navigation.navigate('CreatePostScreen');
                } else if (option === 'Reel') {
                  navigation.navigate('CreateReelScreen');
                } else {
                  // For other options, use the existing component-based flow
                  setCreateMode(option);
                }
              }}
            >
              <Icon name={getIconForOption(option)} size={32} color={colors.primary} />
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getCreatorComponent(mode: CreateMode): React.ComponentType<any> {
  switch (mode) {
    case 'Post':
    case 'Reel':
      return PostAndReelCreator;
    case 'Package':
      return PackageCreator;
    case 'Stay':
      return StayCreator;
    case 'Ride':
      return RideCreator;
    case 'Event':
      return EventCreator;
    case 'Course':
      return CourseCreator;
    case 'Local Tour':
      return LocalTourCreator;
    case 'Affiliate Link':
      return AffiliateCreator;
    case 'Itinerary':
      return ItineraryCreator;
    case 'Add Team':
      return TeamCreator;
    default:
      return PostAndReelCreator;
  }
}

function getIconForOption(option: CreateOption): string {
  const iconMap: Record<CreateOption, string> = {
    Post: 'image-outline',
    Reel: 'videocam-outline',
    Package: 'briefcase-outline',
    Stay: 'bed-outline',
    Ride: 'car-outline',
    Event: 'calendar-outline',
    Course: 'school-outline',
    'Local Tour': 'map-outline',
    'Affiliate Link': 'link-outline',
    Itinerary: 'list-outline',
    'Add Team': 'people-outline',
  };
  return iconMap[option] || 'add-circle-outline';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  backButton: {
    padding: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});




