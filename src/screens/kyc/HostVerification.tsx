/**
 * Host Verification Screen
 * 
 * Verification flow for Host account type
 * Required: KYC + Legal Form
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';
import BaseVerificationScreen from './BaseVerificationScreen';
import { AccountType } from '../../types/account';
import { VERIFICATION_LABELS } from '../../constants/verificationTemplates';

interface HostVerificationProps {
  navigation: any;
}

export default function HostVerification({ navigation }: HostVerificationProps) {
  const [kycDoc, setKycDoc] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<string | null>(null);

  const requiredSteps = ['kyc', 'legalForm'] as const;

  return (
    <BaseVerificationScreen
      accountType="Host"
      requiredSteps={requiredSteps}
      navigation={navigation}
    >
      <View style={styles.stepsContainer}>
        {/* KYC Step */}
        <View style={styles.step}>
          <View style={styles.stepHeader}>
            <Icon name="document-text" size={24} color={colors.primary} />
            <Text style={styles.stepTitle}>{VERIFICATION_LABELS.kyc}</Text>
          </View>
          <Text style={styles.stepDescription}>
            Upload a valid ID document (Passport, Aadhaar, or Driver's License)
          </Text>
          {kycDoc ? (
            <View style={styles.docPreview}>
              <Image source={{ uri: kycDoc }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setKycDoc(null)}
              >
                <Icon name="close-circle" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => {
                // Handle document picker - will be connected to BaseVerificationScreen
              }}
            >
              <Icon name="cloud-upload-outline" size={32} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Upload ID Document</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Legal Form Step */}
        <View style={styles.step}>
          <View style={styles.stepHeader}>
            <Icon name="document-text" size={24} color={colors.primary} />
            <Text style={styles.stepTitle}>{VERIFICATION_LABELS.legalForm}</Text>
          </View>
          <Text style={styles.stepDescription}>
            Upload signed legal agreement form
          </Text>
          {legalDoc ? (
            <View style={styles.docPreview}>
              <Image source={{ uri: legalDoc }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setLegalDoc(null)}
              >
                <Icon name="close-circle" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton}>
              <Icon name="cloud-upload-outline" size={32} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Upload Legal Form</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BaseVerificationScreen>
  );
}

const styles = StyleSheet.create({
  stepsContainer: {
    gap: 24,
  },
  step: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 16,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  docPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 16,
  },
});

