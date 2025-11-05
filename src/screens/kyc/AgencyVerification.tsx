/**
 * Agency Verification Screen
 * 
 * Verification flow for Agency account type
 * Required: KYC + Business Registration + PAN + License
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';
import BaseVerificationScreen from './BaseVerificationScreen';
import { VERIFICATION_LABELS } from '../../constants/verificationTemplates';

interface AgencyVerificationProps {
  navigation: any;
}

export default function AgencyVerification({ navigation }: AgencyVerificationProps) {
  const requiredSteps = ['kyc', 'businessRegistration', 'pan', 'license'] as const;

  return (
    <BaseVerificationScreen
      accountType="Agency"
      requiredSteps={requiredSteps}
      navigation={navigation}
    >
      <View style={styles.stepsContainer}>
        <VerificationStep
          step="kyc"
          label={VERIFICATION_LABELS.kyc}
          description="Upload company director's ID document"
        />
        <VerificationStep
          step="businessRegistration"
          label={VERIFICATION_LABELS.businessRegistration}
          description="Upload business registration certificate"
        />
        <VerificationStep
          step="pan"
          label={VERIFICATION_LABELS.pan}
          description="Upload PAN card document"
        />
        <VerificationStep
          step="license"
          label={VERIFICATION_LABELS.license}
          description="Upload travel agency license"
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

