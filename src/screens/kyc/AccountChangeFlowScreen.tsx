/**
 * Account Change Flow Screen
 * 
 * Step-by-step verification flow that enforces complete validation
 * before allowing account type change submission.
 */

import React, { useState, useEffect } from 'react';
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
import { colors } from '../../utils/colors';
import { useAuth } from '../../providers/AuthProvider';
import { useKYCManager } from '../../hooks/useKYCManager';
import {
  VerificationStep,
  StepData,
  ValidationResult,
} from '../../types/kyc';
import { AccountType } from '../../types/account';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/auth/authService';

interface AccountChangeFlowScreenProps {
  navigation: any;
  route: {
    params: {
      toRole: AccountType;
      requestId?: string;
    };
  };
}

export default function AccountChangeFlowScreen({
  navigation,
  route,
}: AccountChangeFlowScreenProps) {
  const { user } = useAuth();
  const {
    getRequiredStepsForRole,
    startPendingAccountChange,
    getPendingChange,
    updatePendingStep,
    uploadDoc,
    submitAccountChange,
    abortPendingChange,
    validateStep,
    canSubmit,
  } = useKYCManager();

  const { toRole, requestId: initialRequestId } = route.params;

  const [steps, setSteps] = useState<VerificationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(initialRequestId || null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSteps();
    if (user) {
      initializeFlow();
    }
  }, [user]);

  const initializeFlow = async () => {
    if (!user) return;

    try {
      if (initialRequestId) {
        // Resume existing flow
        await loadPendingData();
      } else {
        // Start new flow
        const newRequestId = await startPendingAccountChange(user.uid, toRole);
        if (newRequestId) {
          setRequestId(newRequestId);
        } else {
          Alert.alert('Error', 'Failed to start account change process');
          navigation.goBack();
        }
      }
    } catch (error: any) {
      console.error('Error initializing flow:', error);
      Alert.alert('Error', error.message || 'Failed to initialize flow');
      navigation.goBack();
    }
  };

  const loadSteps = () => {
    const requiredSteps = getRequiredStepsForRole(toRole);
    setSteps(requiredSteps);
    setCurrentStepIndex(0);
    setLoading(false);
  };

  const loadPendingData = async () => {
    if (!user || !initialRequestId) return;

    try {
      const pending = await getPendingChange(user.uid);
      if (pending && pending.requestId === initialRequestId) {
        // Restore form data and uploaded docs
        const restoredFormData: Record<string, Record<string, any>> = {};
        const restoredDocs: Record<string, string> = {};

        Object.keys(pending.stepData).forEach((stepKey) => {
          const stepData = pending.stepData[stepKey];
          if (stepData.formData) {
            restoredFormData[stepKey] = stepData.formData;
          }
          if (stepData.uploadedDoc) {
            restoredDocs[stepKey] = stepData.uploadedDoc.url;
          }
        });

        setFormData(restoredFormData);
        setUploadedDocs(restoredDocs);
        setCurrentStepIndex(pending.currentStep - 1);
        setRequestId(pending.requestId);
      }
    } catch (error) {
      console.error('Error loading pending data:', error);
    }
  };

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  const handleFieldChange = (fieldKey: string, value: any) => {
    const stepKey = currentStep.key;
    setFormData((prev) => ({
      ...prev,
      [stepKey]: {
        ...prev[stepKey],
        [fieldKey]: value,
      },
    }));
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldKey];
      return newErrors;
    });
  };


  const handlePickDocument = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    
    if (!requestId) {
      Alert.alert('Error', 'Account change process not initialized');
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const file = {
          uri: asset.uri || '',
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `document_${Date.now()}.jpg`,
        };

        // Validate file type
        if (currentStep.acceptedFileTypes && !currentStep.acceptedFileTypes.includes(file.type)) {
          Alert.alert(
            'Invalid File Type',
            `Please upload one of: ${currentStep.acceptedFileTypes.join(', ')}`
          );
          return;
        }

        // Validate file size
        if (asset.fileSize && currentStep.maxFileSize) {
          const maxSizeBytes = currentStep.maxFileSize * 1024 * 1024;
          if (asset.fileSize > maxSizeBytes) {
            Alert.alert(
              'File Too Large',
              `File size must be less than ${currentStep.maxFileSize}MB`
            );
            return;
          }
        }

        setUploading(true);
        const url = await uploadDoc(user.uid, requestId, currentStep.key, file);
        setUploadedDocs((prev) => ({
          ...prev,
          [currentStep.key]: url,
        }));

        // Update step data
        await updatePendingStep(user.uid, currentStep.key, formData[currentStep.key] || {});
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const validateCurrentStep = (): ValidationResult => {
    if (!currentStep) {
      return { isValid: true, errors: {} };
    }

    const stepFormData = formData[currentStep.key] || {};
    const stepDoc = uploadedDocs[currentStep.key]
      ? { url: uploadedDocs[currentStep.key] }
      : undefined;

    return validateStep(currentStep, stepFormData, stepDoc);
  };

  const handleNext = async () => {
    if (!user || !requestId) {
      Alert.alert('Error', 'Please start the account change process first');
      return;
    }

    // Validate current step (only form fields, not file uploads)
    const validation = validateCurrentStep();
    // Only show errors for form fields, not file uploads
    const formFieldErrors: Record<string, string> = {};
    Object.keys(validation.errors).forEach(key => {
      if (key !== 'file') {
        formFieldErrors[key] = validation.errors[key];
      }
    });
    if (Object.keys(formFieldErrors).length > 0) {
      setValidationErrors(formFieldErrors);
      Alert.alert('Validation Error', 'Please complete all required fields');
      return;
    }

    // Save step data
    try {
      await updatePendingStep(user.uid, currentStep.key, formData[currentStep.key] || {});

      // Update current step in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'pendingAccountChange.currentStep': currentStepIndex + 2, // Next step (1-based)
        updatedAt: Date.now(),
      });

      // Move to next step
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
        setValidationErrors({});
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save step');
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setValidationErrors({});
    }
  };

  const handleSaveAndExit = async () => {
    if (!user || !requestId) {
      Alert.alert('Error', 'Please start the account change process first');
      return;
    }

    try {
      // Save current step
      await updatePendingStep(user.uid, currentStep.key, formData[currentStep.key] || {});

      Alert.alert(
        'Saved',
        'Your progress has been saved. You can resume from where you left off.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save progress');
    }
  };

  const handleSubmit = async () => {
    if (!user || !requestId) {
      Alert.alert('Error', 'Please start the account change process first');
      return;
    }

    // Allow submission even if files are missing (only validate form fields)
    // File uploads are now optional

    Alert.alert(
      'Submit Verification',
      'Are you sure you want to submit your account change request? You will not be able to edit after submission.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              await submitAccountChange(user.uid, requestId);
              // Navigate back to Account screen or go back to previous screen
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Account');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to submit');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Account Change',
      'Are you sure you want to cancel? Your progress will be saved but the account change will not be processed.',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await abortPendingChange(user.uid);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (steps.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Icon name="checkmark-circle" size={64} color={colors.primary} />
          <Text style={styles.noStepsText}>No verification required for {toRole}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Icon name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Verification</Text>
          <Text style={styles.headerSubtitle}>
            Step {currentStepIndex + 1} of {totalSteps}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
      </View>

      {/* Step Indicator */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stepIndicator}
        contentContainerStyle={styles.stepIndicatorContent}
      >
        {steps.map((step, index) => (
          <View key={step.key} style={styles.stepIndicatorItem}>
            <View
              style={[
                styles.stepIndicatorDot,
                index === currentStepIndex && styles.stepIndicatorDotActive,
                index < currentStepIndex && styles.stepIndicatorDotCompleted,
              ]}
            >
              {index < currentStepIndex ? (
                <Icon name="checkmark" size={16} color="white" />
              ) : (
                <Text style={styles.stepIndicatorNumber}>{index + 1}</Text>
              )}
            </View>
            <Text
              style={[
                styles.stepIndicatorLabel,
                index === currentStepIndex && styles.stepIndicatorLabelActive,
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Step Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentStep && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{currentStep.label}</Text>
            {currentStep.description && (
              <Text style={styles.stepDescription}>{currentStep.description}</Text>
            )}

            {/* Form Fields */}
            {currentStep.fields && currentStep.fields.length > 0 && (
              <View style={styles.fieldsContainer}>
                {currentStep.fields.map((field) => (
                  <View key={field.key} style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>
                      {field.label}
                      {field.required && <Text style={styles.required}> *</Text>}
                    </Text>
                    {field.type === 'date' ? (
                      <View style={styles.dateInputContainer}>
                        <TextInput
                          style={[
                            styles.input,
                            validationErrors[field.key] && styles.inputError,
                          ]}
                          placeholder={field.placeholder || 'YYYY-MM-DD'}
                          value={formData[currentStep.key]?.[field.key] || ''}
                          onChangeText={(text) => handleFieldChange(field.key, text)}
                          keyboardType="numeric"
                          maxLength={10}
                        />
                        <Text style={styles.dateHint}>Format: YYYY-MM-DD</Text>
                      </View>
                    ) : (
                      <TextInput
                        style={[
                          styles.input,
                          validationErrors[field.key] && styles.inputError,
                        ]}
                        placeholder={field.placeholder}
                        value={formData[currentStep.key]?.[field.key] || ''}
                        onChangeText={(text) => handleFieldChange(field.key, text)}
                        keyboardType={
                          field.type === 'email'
                            ? 'email-address'
                            : field.type === 'phone' || field.type === 'number'
                            ? 'numeric'
                            : 'default'
                        }
                        autoCapitalize="none"
                      />
                    )}
                    {validationErrors[field.key] && (
                      <Text style={styles.errorText}>{validationErrors[field.key]}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* File Upload */}
            {(currentStep.type === 'file' || currentStep.type === 'form+file') && (
              <View style={styles.uploadContainer}>
                <Text style={styles.uploadLabel}>
                  {currentStep.label} Document
                  <Text style={styles.optionalLabel}> (Optional)</Text>
                </Text>
                {uploadedDocs[currentStep.key] ? (
                  <View style={styles.uploadedDoc}>
                    <Image
                      source={{ uri: uploadedDocs[currentStep.key] }}
                      style={styles.uploadedImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeDocButton}
                      onPress={() => {
                        setUploadedDocs((prev) => {
                          const newDocs = { ...prev };
                          delete newDocs[currentStep.key];
                          return newDocs;
                        });
                      }}
                    >
                      <Icon name="close-circle" size={24} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handlePickDocument}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <Icon name="cloud-upload-outline" size={32} color={colors.primary} />
                        <Text style={styles.uploadButtonText}>Upload Document</Text>
                        {currentStep.acceptedFileTypes && (
                          <Text style={styles.uploadHint}>
                            {currentStep.acceptedFileTypes.join(', ')}
                          </Text>
                        )}
                        {currentStep.maxFileSize && (
                          <Text style={styles.uploadHint}>
                            Max size: {currentStep.maxFileSize}MB
                          </Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.saveButton]}
          onPress={handleSaveAndExit}
        >
          <Icon name="save-outline" size={20} color={colors.primary} />
          <Text style={[styles.footerButtonText, styles.saveButtonText]}>Save & Exit</Text>
        </TouchableOpacity>

        <View style={styles.navButtons}>
          {currentStepIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={handlePrevious}
            >
              <Icon name="chevron-back" size={20} color={colors.text} />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}

          {currentStepIndex < steps.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNext}
            >
              <Text style={styles.navButtonText}>Next</Text>
              <Icon name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.submitButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={20} color="white" />
                  <Text style={[styles.navButtonText, styles.submitButtonText]}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

    </SafeAreaView>
  );
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
    padding: 20,
  },
  noStepsText: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: 4,
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 8,
    textAlign: 'center',
  },
  stepIndicator: {
    maxHeight: 80,
    marginBottom: 8,
  },
  stepIndicatorContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  stepIndicatorItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  stepIndicatorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepIndicatorDotActive: {
    backgroundColor: colors.primary,
  },
  stepIndicatorDotCompleted: {
    backgroundColor: '#10B981',
  },
  stepIndicatorNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  stepIndicatorLabel: {
    fontSize: 11,
    color: colors.mutedText,
    textAlign: 'center',
  },
  stepIndicatorLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  stepContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 24,
    lineHeight: 20,
  },
  fieldsContainer: {
    gap: 20,
    marginBottom: 24,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  optionalLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '400',
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
  },
  inputPlaceholder: {
    color: colors.mutedText,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  dateInputContainer: {
    gap: 4,
  },
  dateHint: {
    fontSize: 11,
    color: colors.mutedText,
    fontStyle: 'italic',
  },
  uploadContainer: {
    gap: 12,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadHint: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 4,
  },
  uploadedDoc: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
  },
  removeDocButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    gap: 12,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  saveButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 120,
  },
  prevButton: {
    backgroundColor: colors.surface,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  submitButton: {
    backgroundColor: '#10B981',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  submitButtonText: {
    color: 'white',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

