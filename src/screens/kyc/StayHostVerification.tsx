/**
 * Stay Host Verification Screen
 * 
 * Verification flow for Stay Host account type
 * Required: KYC + Property Proof + License
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';
import BaseVerificationScreen from './BaseVerificationScreen';
import { VERIFICATION_LABELS } from '../../constants/verificationTemplates';

interface StayHostVerificationProps {
  navigation: any;
}

export default function StayHostVerification({ navigation }: StayHostVerificationProps) {
  const requiredSteps = ['kyc', 'propertyProof', 'license'] as const;

  return (
    <BaseVerificationScreen
      accountType="StayHost"
      requiredSteps={requiredSteps}
      navigation={navigation}
    >
      <View style={styles.stepsContainer}>
        <VerificationStep
          step="kyc"
          label={VERIFICATION_LABELS.kyc}
          description="Upload your ID document"
        />
        <VerificationStep
          step="propertyProof"
          label={VERIFICATION_LABELS.propertyProof}
          description="Upload property ownership or rental agreement"
        />
        <VerificationStep
          step="license"
          label={VERIFICATION_LABELS.license}
          description="Upload hospitality license (if applicable)"
        />
      </View>
    </BaseVerificationScreen>
  );
}

function VerificationStep({ step, label, description }: { step: string; label: string; description: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <Icon name="document-text" size={24} color={colors.primary} />
        <Text style={styles.stepTitle}>{label}</Text>
      </View>
      <Text style={styles.stepDescription}>{description}</Text>
      <TouchableOpacity style={styles.uploadButton}>
        <Icon name="cloud-upload-outline" size={32} color={colors.primary} />
        <Text style={styles.uploadButtonText}>Upload Document</Text>
      </TouchableOpacity>
    </View>
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
});

