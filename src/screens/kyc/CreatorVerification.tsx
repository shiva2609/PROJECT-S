/**
 * Creator Verification Screen
 * 
 * Verification flow for Creator/Affiliate account type
 * Required: KYC + Social Verification
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../utils/colors';
import BaseVerificationScreen from './BaseVerificationScreen';
import { VERIFICATION_LABELS } from '../../constants/verificationTemplates';

interface CreatorVerificationProps {
  navigation: any;
}

export default function CreatorVerification({ navigation }: CreatorVerificationProps) {
  const [socialLink, setSocialLink] = useState('');
  const requiredSteps = ['kyc', 'socialVerification'] as const;

  return (
    <BaseVerificationScreen
      accountType="Creator"
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
            Upload your ID document
          </Text>
          <TouchableOpacity style={styles.uploadButton}>
            <Icon name="cloud-upload-outline" size={32} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Upload ID Document</Text>
          </TouchableOpacity>
        </View>

        {/* Social Verification Step */}
        <View style={styles.step}>
          <View style={styles.stepHeader}>
            <Icon name="people" size={24} color={colors.primary} />
            <Text style={styles.stepTitle}>{VERIFICATION_LABELS.socialVerification}</Text>
          </View>
          <Text style={styles.stepDescription}>
            Provide a link to your social media profile (Instagram, YouTube, TikTok, etc.)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="https://instagram.com/yourusername"
            value={socialLink}
            onChangeText={setSocialLink}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.hint}>
            This helps verify your creator status and audience reach
          </Text>
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
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.mutedText,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedText,
    fontStyle: 'italic',
  },
});

