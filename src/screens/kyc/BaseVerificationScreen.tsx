/**
 * Base Verification Screen Component
 * 
 * Reusable base component for all verification screens with common functionality
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useKYCManager, VerificationDocs } from '../../hooks/useKYCManager';
import { AccountType } from '../../types/account';
import { VerificationKey } from '../../constants/verificationTemplates';

interface BaseVerificationScreenProps {
  accountType: AccountType;
  requiredSteps: VerificationKey[];
  navigation: any;
  children?: React.ReactNode;
}

export default function BaseVerificationScreen({
  accountType,
  requiredSteps,
  navigation,
  children,
}: BaseVerificationScreenProps) {
  const { user } = useAuth();
  const { uploadVerificationDocs, updateFirestoreStatus } = useKYCManager();
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<Partial<VerificationDocs>>({});
  const [stepStatus, setStepStatus] = useState<Record<string, boolean>>({});

  const handlePickDocument = async (docType: keyof VerificationDocs) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (uri) {
          setDocs((prev) => ({ ...prev, [docType]: uri }));
          setStepStatus((prev) => ({ ...prev, [docType]: true }));
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit verification');
      return;
    }

    // Check if all required steps are completed
    const allStepsComplete = requiredSteps.every((step) => {
      const docKey = getDocKeyForStep(step);
      return docs[docKey as keyof VerificationDocs] || stepStatus[step];
    });

    if (!allStepsComplete) {
      Alert.alert('Incomplete', 'Please complete all required verification steps');
      return;
    }

    try {
      setUploading(true);
      await uploadVerificationDocs(user.uid, docs as VerificationDocs);
      await updateFirestoreStatus(user.uid, 'pending');
      Alert.alert(
        'Success',
        'Your verification documents have been submitted. An admin will review them shortly.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit verification');
    } finally {
      setUploading(false);
    }
  };

  const getDocKeyForStep = (step: VerificationKey): keyof VerificationDocs => {
    const mapping: Record<VerificationKey, keyof VerificationDocs> = {
      kyc: 'idProof',
      businessRegistration: 'businessLicense',
      propertyProof: 'propertyProof',
      pan: 'pan',
      license: 'license',
      vehicleDocuments: 'vehicleDocuments',
      commercialLicense: 'commercialLicense',
      eventPermit: 'eventPermit',
      activityLicense: 'activityLicense',
      socialVerification: 'socialLink',
      legalForm: 'legalForm',
    };
    return mapping[step] || 'idProof';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Verification</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.infoBox}>
          <Icon name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Complete all required verification steps for {accountType} account type.
          </Text>
        </View>

        {children}

        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={20} color="white" />
              <Text style={styles.submitButtonText}>Submit Verification</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

