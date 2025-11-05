/**
 * Upgrade Account Modal
 * 
 * Allows users to request account type upgrades with KYC submission
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { colors } from '../utils/colors';
import { AccountType, ACCOUNT_TYPE_METADATA } from '../types/account';
import { VERIFICATION_TEMPLATES, VERIFICATION_LABELS, VerificationKey } from '../constants/verificationTemplates';
import { getDoc, doc as fsDoc, collection as fsCollection } from 'firebase/firestore';
import { db } from '../api/authService';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentAccountType: AccountType;
}

const UPGRADEABLE_TYPES: AccountType[] = [
  'Host',
  'Agency',
  'AdventurePro',
  'Creator',
  'StayHost',
  'RideCreator',
  'EventOrganizer',
];

export default function UpgradeAccountModal({ visible, onClose, currentAccountType }: Props) {
  const { user, initialized } = useAuth();
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState<'passport' | 'aadhaar' | 'driver_license' | 'pan' | 'business_registration'>('passport');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [idDocumentUri, setIdDocumentUri] = useState<string | null>(null);
  const [safetyAgreementAccepted, setSafetyAgreementAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requiredSteps, setRequiredSteps] = useState<VerificationKey[]>([]);
  const [stepStates, setStepStates] = useState<Record<VerificationKey, 'pending' | 'approved' | 'denied'>>({} as any);

  // Log auth state when modal is visible
  React.useEffect(() => {
    if (visible) {
      console.log('✅ Auth state:', { initialized, userExists: !!user, uid: user?.uid });
    }
  }, [visible, initialized, user]);

  const handlePickIdDocument = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      if (result.assets && result.assets[0]) {
        setIdDocumentUri(result.assets[0].uri || null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit = async () => {
    // Wait for auth initialization
    if (!initialized) {
      console.log('⏳ Waiting for auth initialization...');
      Alert.alert('Please wait', 'Checking authentication status...');
      return;
    }

    // Check if user is logged in
    if (!user) {
      console.log('❌ User not logged in');
      Alert.alert('Login Required', 'You must be logged in to submit your KYC.');
      return;
    }

    console.log('📝 Submitting KYC for user:', user.uid);

    // Form validation
    if (!selectedType) {
      Alert.alert('Error', 'Please select an account type');
      return;
    }

    if (!fullName || !idNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if ((selectedType === 'Agency' || selectedType === 'StayHost' || selectedType === 'RideCreator') && !businessName) {
      Alert.alert('Error', 'Business name is required for this account type');
      return;
    }

    if (selectedType === 'Agency' && !registrationNumber) {
      Alert.alert('Error', 'Registration number is required for Agency accounts');
      return;
    }

    if (!safetyAgreementAccepted) {
      Alert.alert('Error', 'You must accept the safety agreement');
      return;
    }

    setSubmitting(true);
    try {
      // Use the verified user from context (already verified above)
      console.log('📝 Starting KYC submission process...');
      console.log('🔑 Current User ID:', user.uid);
      console.log('📦 Firestore instance:', db ? 'Available' : 'NULL');

      // Upload ID document if provided
      let idDocumentUrl = null;
      if (idDocumentUri) {
        console.log('📤 Uploading ID document to Storage...');
        // TODO: Upload to Firebase Storage in production
        // For now, we'll store the URI
        idDocumentUrl = idDocumentUri;
      }

      const kycData = {
        fullName,
        idType,
        idNumber,
        idDocumentUrl,
        address: address || null,
        phone: phone || null,
        businessName: (selectedType === 'Agency' || selectedType === 'StayHost' || selectedType === 'RideCreator') ? businessName : null,
        registrationNumber: selectedType === 'Agency' ? registrationNumber : null,
        submittedAt: Date.now(),
      };

      const safetyAgreement = {
        accepted: true,
        acceptedAt: Date.now(),
        version: '1.0',
      };

      // Create upgrade request
      console.log('📝 Creating upgrade request in Firestore...');
      console.log('📁 Collection: upgradeRequests');
      const upgradeRequestData = {
        uid: user.uid,
        requestedAccountType: selectedType,
        currentAccountType,
        kycData,
        safetyAgreement,
        status: 'pending',
        createdAt: Date.now(),
      };
      console.log('📄 Upgrade request data:', upgradeRequestData);

      const upgradeRequestsRef = collection(db, 'upgradeRequests');
      const requestDocRef = await addDoc(upgradeRequestsRef, upgradeRequestData);
      console.log('✅ Upgrade request created! Document ID:', requestDocRef.id);

      // Update user document with pending status
      console.log('📝 Updating user document...');
      console.log('📁 Collection: users, Document:', user.uid);
      const userDocRef = doc(db, 'users', user.uid);
      // Initialize verification object with required steps set to pending, auto-approve known ones
      const verificationInit: Record<string, 'pending' | 'approved' | 'denied'> = {};
      requiredSteps.forEach((step) => {
        verificationInit[step] = stepStates[step] || 'pending';
      });
      await updateDoc(userDocRef, {
        verificationStatus: 'pending',
        kycStatus: 'pending',
        verification: verificationInit,
        kycData,
        safetyAgreement,
        requestedAccountType: selectedType,
        updatedAt: Date.now(),
      });
      console.log('✅ User document updated');
      console.log('✅ Firestore connection successful');

      Alert.alert(
        'Success',
        'Your upgrade request has been submitted! An admin will review it shortly.',
        [{ text: 'OK', onPress: onClose }]
      );

      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('❌ Error submitting KYC:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      // Detailed error messages
      let errorMessage = 'Failed to submit upgrade request';
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your Firebase rules and ensure you are logged in.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network unavailable. Please check your connection.';
      } else if (error.code === 'not-found') {
        errorMessage = 'User document not found. Please try logging out and back in.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setFullName('');
    setIdNumber('');
    setAddress('');
    setPhone('');
    setBusinessName('');
    setRegistrationNumber('');
    setIdDocumentUri(null);
    setSafetyAgreementAccepted(false);
    setRequiredSteps([]);
    setStepStates({} as any);
  };

  const selectedMetadata = selectedType ? ACCOUNT_TYPE_METADATA[selectedType] : null;

  // Load required steps when type changes; attempt to fetch from Firestore, fallback to constants
  React.useEffect(() => {
    const loadTemplate = async () => {
      if (!selectedType) {
        setRequiredSteps([]);
        return;
      }
      try {
        // Firestore document: verificationTemplates/{accountType}
        const docRef = fsDoc(db, 'verificationTemplates', selectedType);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const steps = (data?.steps || []) as VerificationKey[];
          setRequiredSteps(steps);
        } else {
          setRequiredSteps((VERIFICATION_TEMPLATES as any)[selectedType] || []);
        }
      } catch (e) {
        setRequiredSteps((VERIFICATION_TEMPLATES as any)[selectedType] || []);
      }
    };
    loadTemplate();
  }, [selectedType]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Show loading state while auth initializes */}
          {!initialized && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 16, color: colors.mutedText }}>Loading user...</Text>
            </View>
          )}
          <View style={styles.header}>
            <Text style={styles.title}>Upgrade Your Account</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Select Account Type *</Text>
            <View style={styles.typeGrid}>
              {UPGRADEABLE_TYPES.map((type) => {
                const metadata = ACCOUNT_TYPE_METADATA[type];
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeCard,
                      selectedType === type && { borderColor: metadata.color, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[styles.typeTag, { color: metadata.color }]}>
                      {metadata.tag}
                    </Text>
                    <Text style={styles.typeName}>{metadata.displayName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedType && (
              <>
                {/* Required Verification Checklist */}
                <Text style={styles.sectionTitle}>Required Verification</Text>
                {requiredSteps.length === 0 ? (
                  <Text style={{ color: colors.mutedText }}>No additional documents required.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {requiredSteps.map((step) => (
                      <View key={step} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon name="checkbox-outline" size={18} color={colors.primary} />
                        <Text style={{ color: colors.text, fontSize: 14 }}>
                          {VERIFICATION_LABELS[step] || step}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={styles.sectionTitle}>KYC Information</Text>

                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={fullName}
                  onChangeText={setFullName}
                />

                <Text style={styles.label}>ID Type *</Text>
                <View style={styles.idTypeSelector}>
                  {(['passport', 'aadhaar', 'driver_license', 'pan', 'business_registration'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.idTypeButton,
                        idType === type && styles.idTypeButtonActive,
                      ]}
                      onPress={() => setIdType(type)}
                    >
                      <Text
                        style={[
                          styles.idTypeText,
                          idType === type && styles.idTypeTextActive,
                        ]}
                      >
                        {type.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>ID Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your ID number"
                  value={idNumber}
                  onChangeText={setIdNumber}
                />

                {(selectedType === 'Agency' || selectedType === 'Stay Host' || selectedType === 'Ride Partner') && (
                  <>
                    <Text style={styles.label}>Business Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Your business/company name"
                      value={businessName}
                      onChangeText={setBusinessName}
                    />
                  </>
                )}

                {selectedType === 'Agency' && (
                  <>
                    <Text style={styles.label}>Registration Number *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Business registration number"
                      value={registrationNumber}
                      onChangeText={setRegistrationNumber}
                    />
                  </>
                )}

                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Your address"
                  multiline
                  value={address}
                  onChangeText={setAddress}
                />

                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 1234567890"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />

                <Text style={styles.label}>ID Document</Text>
                <TouchableOpacity style={styles.documentPicker} onPress={handlePickIdDocument}>
                  <Icon name="document-attach-outline" size={24} color={colors.primary} />
                  <Text style={styles.documentPickerText}>
                    {idDocumentUri ? 'Document selected' : 'Upload ID Document'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.agreementBox}>
                  <Switch
                    value={safetyAgreementAccepted}
                    onValueChange={setSafetyAgreementAccepted}
                  />
                  <Text style={styles.agreementText}>
                    I accept the safety agreement and legal terms for becoming a {selectedMetadata?.displayName}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, (!safetyAgreementAccepted || submitting || !initialized || !user) && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={!safetyAgreementAccepted || submitting || !initialized || !user}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  typeCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeTag: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 16,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  idTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  idTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  idTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  idTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  idTypeTextActive: {
    color: 'white',
  },
  documentPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  documentPickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  agreementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  agreementText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});


