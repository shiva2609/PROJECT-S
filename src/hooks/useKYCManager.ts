/**
 * useKYCManager Hook - Secure Account Change & Verification Flow
 * 
 * Implements robust verification flow where account type change is NOT applied
 * until all required verification steps are completed and admin-approved.
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from '../core/firebase/compat';
import { ref, uploadBytes, getDownloadURL } from '../core/firebase/compat';
import { db, storage } from '../core/firebase';
import { AccountType } from '../types/account';
import {
  PendingAccountChange,
  PendingStatus,
  VerificationStep,
  StepData,
  UpgradeRequest,
  ValidationResult,
  UploadedDoc,
} from '../types/kyc';
import { getRequiredStepsForRole, validateField } from '../config/rolesMetadata';
import { ROLES_METADATA } from '../config/rolesMetadata';

/**
 * Determines if an account type requires verification
 */
export function requiresVerification(accountType: AccountType): boolean {
  return accountType !== 'Traveler' && accountType !== 'superAdmin';
}

export interface UseKYCManagerReturn {
  // Core functions
  requiresVerification: (accountType: AccountType) => boolean;
  getRequiredStepsForRole: (role: AccountType) => VerificationStep[];
  startPendingAccountChange: (uid: string, toRole: AccountType) => Promise<string | null>;
  updatePendingStep: (uid: string, stepKey: string, formData: Record<string, any>) => Promise<void>;
  uploadDoc: (uid: string, requestId: string, stepKey: string, file: { uri: string; type: string; name: string }) => Promise<string>;
  submitAccountChange: (uid: string, requestId: string) => Promise<void>;
  abortPendingChange: (uid: string) => Promise<void>;
  listenToRequestStatus: (requestId: string, callback: (status: PendingStatus) => void) => Unsubscribe;

  // Validation
  validateStep: (step: VerificationStep, formData: Record<string, any>, uploadedDoc?: UploadedDoc) => ValidationResult;
  canSubmit: (uid: string) => Promise<{ canSubmit: boolean; missingSteps: string[] }>;

  // Status checks
  getPendingChange: (uid: string) => Promise<PendingAccountChange | null>;
  hasPendingChange: (uid: string) => Promise<boolean>;
}

export function useKYCManager(): UseKYCManagerReturn {
  const [loading, setLoading] = useState(false);

  /**
   * Get required steps for a role
   */
  const getRequiredStepsForRoleFunc = useCallback((role: AccountType): VerificationStep[] => {
    return getRequiredStepsForRole(role);
  }, []);

  /**
   * Start pending account change - creates pendingAccountChange object
   * Does NOT change accountType yet
   */
  const startPendingAccountChange = useCallback(async (
    uid: string,
    toRole: AccountType
  ): Promise<string | null> => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert('Error', 'Your account was not found. Please try logging in again.');
        return null;
      }

      const userData = userSnap.data();
      if (!userData) {
        Alert.alert('Error', 'Unable to load your account information. Please try again.');
        return null;
      }

      const currentRole = (userData.accountType || 'Traveler') as AccountType;

      // Check if there's already a pending change (safely handle missing property)
      const existingPendingChange = userData.pendingAccountChange;
      if (existingPendingChange &&
        (existingPendingChange.status === 'in_progress' ||
          existingPendingChange.status === 'submitted')) {
        const existingRequestId = existingPendingChange.requestId;
        if (existingRequestId) {
          Alert.alert(
            'Pending Change',
            'You already have a pending account change. Please complete or cancel it first.',
            [{ text: 'OK' }]
          );
          return existingRequestId;
        }
      }

      // Get required steps for the new role
      const requiredSteps = getRequiredStepsForRole(toRole);
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Initialize pending account change
      const newPendingChange: PendingAccountChange = {
        requestId,
        toRole,
        startedAt: serverTimestamp(),
        status: 'in_progress',
        currentStep: 1,
        requiredSteps,
        stepData: {},
        uploadedDocs: {},
      };

      // Update user document with pending change
      try {
        await updateDoc(userRef, {
          pendingAccountChange: newPendingChange,
          updatedAt: Date.now(),
        });

        console.log('✅ Pending account change started:', requestId);
        return requestId;
      } catch (updateError: any) {
        console.error('❌ Error updating user document:', updateError);
        Alert.alert(
          'Error',
          'Failed to save your account change request. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
        return null;
      }
    } catch (error: any) {
      console.error('❌ Error starting pending account change:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Failed to start account change process. Please try again.';

      if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to change your account type. Please contact support.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service is temporarily unavailable. Please check your connection and try again.';
      } else if (error.message) {
        // Only show technical error if it's user-friendly
        if (error.message.includes('not found') ||
          error.message.includes('network') ||
          error.message.includes('connection')) {
          errorMessage = error.message;
        }
      }

      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update pending step data (form fields)
   */
  const updatePendingStep = useCallback(async (
    uid: string,
    stepKey: string,
    formData: Record<string, any>
  ): Promise<void> => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert('Error', 'Your account was not found. Please try logging in again.');
        return;
      }

      const userData = userSnap.data();
      if (!userData) {
        Alert.alert('Error', 'Unable to load your account information.');
        return;
      }

      // Safely check for pendingAccountChange
      const pendingChange = userData.pendingAccountChange as PendingAccountChange | undefined;

      if (!pendingChange) {
        Alert.alert(
          'Error',
          'No active account change found. Please start a new account change from your profile.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (pendingChange.status !== 'in_progress') {
        Alert.alert(
          'Error',
          `Your account change is ${pendingChange.status}. Please start a new account change if needed.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Update step data
      const stepData: StepData = {
        stepKey,
        formData,
        completed: false,
        ...pendingChange.stepData[stepKey],
      };

      const updatedStepData = {
        ...pendingChange.stepData,
        [stepKey]: stepData,
      };

      await updateDoc(userRef, {
        'pendingAccountChange.stepData': updatedStepData,
        updatedAt: Date.now(),
      });

      console.log('✅ Step data updated:', stepKey);
    } catch (error: any) {
      console.error('❌ Error updating step:', error);
      Alert.alert(
        'Error',
        'Failed to save your progress. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Upload document for a step
   */
  const uploadDoc = useCallback(async (
    uid: string,
    requestId: string,
    stepKey: string,
    file: { uri: string; type: string; name: string }
  ): Promise<string> => {
    try {
      setLoading(true);

      // Create storage reference
      const fileName = `${uid}/${requestId}/${stepKey}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `verification_docs/${fileName}`);

      // Convert file URI to blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (blob.size > maxSize) {
        throw new Error('File size exceeds 10MB limit');
      }

      // Upload to Firebase Storage
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Update user document with uploaded doc
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert('Error', 'Your account was not found. Please try logging in again.');
        throw new Error('User document not found');
      }

      const userData = userSnap.data();
      if (!userData) {
        Alert.alert('Error', 'Unable to load your account information.');
        throw new Error('User data not found');
      }

      // Safely check for pendingAccountChange
      const pendingChange = userData.pendingAccountChange as PendingAccountChange | undefined;

      if (!pendingChange) {
        Alert.alert(
          'Error',
          'No active account change found. Please start a new account change from your profile.',
          [{ text: 'OK' }]
        );
        throw new Error('No active pending account change');
      }

      if (pendingChange.status !== 'in_progress') {
        Alert.alert(
          'Error',
          `Your account change is ${pendingChange.status}. Please start a new account change if needed.`,
          [{ text: 'OK' }]
        );
        throw new Error(`Account change status is ${pendingChange.status}, not in_progress`);
      }

      const uploadedDoc: UploadedDoc = {
        url: downloadURL,
        uploadedAt: serverTimestamp(),
        fileName: file.name,
        fileSize: blob.size,
      };

      const updatedDocs = {
        ...pendingChange.uploadedDocs,
        [stepKey]: uploadedDoc,
      };

      // Mark step as completed if it has all required form data (files are optional)
      const step = pendingChange.requiredSteps.find(s => s.key === stepKey);
      const stepData = pendingChange.stepData[stepKey] || { stepKey, completed: false };

      const isStepComplete = step
        ? (!step.fields || step.fields.every(f => !f.required || stepData.formData?.[f.key]))
        : true;

      const updatedStepData = {
        ...pendingChange.stepData,
        [stepKey]: {
          ...stepData,
          uploadedDoc,
          completed: isStepComplete,
          completedAt: isStepComplete ? serverTimestamp() : undefined,
        },
      };

      await updateDoc(userRef, {
        'pendingAccountChange.uploadedDocs': updatedDocs,
        'pendingAccountChange.stepData': updatedStepData,
        updatedAt: Date.now(),
      });

      console.log('✅ Document uploaded:', stepKey);
      return downloadURL;
    } catch (error: any) {
      console.error('❌ Error uploading document:', error);

      let errorMessage = 'Failed to upload document. Please try again.';

      if (error.message?.includes('size')) {
        errorMessage = 'File size exceeds the 10MB limit. Please choose a smaller file.';
      } else if (error.message?.includes('type') || error.message?.includes('format')) {
        errorMessage = 'Invalid file type. Please upload an image (JPEG, PNG) or PDF file.';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'You do not have permission to upload files. Please contact support.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'Upload was canceled. Please try again.';
      } else if (error.message) {
        // Only show technical message if it's user-friendly
        if (error.message.includes('network') ||
          error.message.includes('connection') ||
          error.message.includes('offline')) {
          errorMessage = 'Please check your internet connection and try again.';
        }
      }

      Alert.alert('Upload Error', errorMessage, [{ text: 'OK' }]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate a step
   * Note: File uploads are now optional, only form fields are validated
   */
  const validateStep = useCallback((
    step: VerificationStep,
    formData: Record<string, any>,
    uploadedDoc?: UploadedDoc
  ): ValidationResult => {
    const errors: Record<string, string> = {};

    // Validate form fields only (file uploads are optional)
    if (step.fields) {
      for (const field of step.fields) {
        if (field.required) {
          const value = formData[field.key];
          const validation = validateField(value, field);
          if (!validation.isValid) {
            errors[field.key] = validation.error || `${field.label} is required`;
          }
        }
      }
    }

    // File uploads are optional - no validation needed
    // File type validation is still checked during upload in uploadDoc function

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, []);

  /**
   * Check if all steps are complete and can submit
   */
  const canSubmit = useCallback(async (
    uid: string
  ): Promise<{ canSubmit: boolean; missingSteps: string[] }> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return { canSubmit: false, missingSteps: ['User account not found'] };
      }

      const userData = userSnap.data();
      if (!userData) {
        return { canSubmit: false, missingSteps: ['Unable to load account data'] };
      }

      // Safely check for pendingAccountChange
      const pendingChange = userData.pendingAccountChange as PendingAccountChange | undefined;

      if (!pendingChange) {
        return { canSubmit: false, missingSteps: ['No active account change found'] };
      }

      if (pendingChange.status !== 'in_progress') {
        return { canSubmit: false, missingSteps: [`Account change status is ${pendingChange.status}`] };
      }

      const missingSteps: string[] = [];

      for (const step of pendingChange.requiredSteps) {
        const stepData = pendingChange.stepData[step.key];
        const uploadedDoc = pendingChange.uploadedDocs[step.key];

        // Check form fields only (file uploads are optional)
        if (step.fields) {
          for (const field of step.fields) {
            if (field.required) {
              const value = stepData?.formData?.[field.key];
              if (!value || value.toString().trim() === '') {
                missingSteps.push(`${step.label}: ${field.label}`);
              }
            }
          }
        }

        // File uploads are optional - no check needed

        // Validate step (only form fields, file errors are ignored)
        const validation = validateStep(step, stepData?.formData || {}, uploadedDoc);
        if (!validation.isValid) {
          Object.keys(validation.errors).forEach(key => {
            // Skip file validation errors
            if (key !== 'file') {
              missingSteps.push(`${step.label}: ${validation.errors[key]}`);
            }
          });
        }
      }

      return {
        canSubmit: missingSteps.length === 0,
        missingSteps,
      };
    } catch (error: any) {
      console.error('❌ Error checking submit status:', error);
      return {
        canSubmit: false,
        missingSteps: ['Unable to verify submission status. Please try again.']
      };
    }
  }, [validateStep]);

  /**
   * Submit account change - creates upgrade_requests document
   */
  const submitAccountChange = useCallback(async (
    uid: string,
    requestId: string
  ): Promise<void> => {
    try {
      setLoading(true);

      // Check if can submit (file uploads are optional, only form fields are checked)
      const { canSubmit: can, missingSteps } = await canSubmit(uid);
      if (!can) {
        // Only show errors for form fields, not file uploads
        const formFieldErrors = missingSteps.filter(step => !step.includes('Document upload'));
        if (formFieldErrors.length > 0) {
          Alert.alert(
            'Incomplete Verification',
            `Please complete all required fields:\n\n${formFieldErrors.join('\n')}`
          );
          throw new Error('Cannot submit: incomplete verification');
        }
      }

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Alert.alert('Error', 'Your account was not found. Please try logging in again.');
        throw new Error('User document not found');
      }

      const userData = userSnap.data();
      if (!userData) {
        Alert.alert('Error', 'Unable to load your account information.');
        throw new Error('User data not found');
      }

      // Safely check for pendingAccountChange
      const pendingChange = userData.pendingAccountChange as PendingAccountChange | undefined;

      if (!pendingChange) {
        Alert.alert(
          'Error',
          'No active account change found. Please start a new account change from your profile.',
          [{ text: 'OK' }]
        );
        throw new Error('No active pending account change');
      }

      if (pendingChange.requestId !== requestId) {
        Alert.alert(
          'Error',
          'Account change request mismatch. Please start a new account change.',
          [{ text: 'OK' }]
        );
        throw new Error('Invalid pending account change request ID');
      }

      const currentRole = (userData.accountType || 'Traveler') as AccountType;

      // Create upgrade_requests document
      const upgradeRequest: UpgradeRequest = {
        requestId,
        uid,
        fromRole: currentRole,
        toRole: pendingChange.toRole,
        requiredSteps: pendingChange.requiredSteps,
        uploadedDocs: pendingChange.uploadedDocs,
        stepData: pendingChange.stepData,
        status: 'pending',
        createdAt: serverTimestamp(),
        submittedAt: serverTimestamp(),
      };

      const requestsRef = collection(db, 'upgrade_requests');
      await addDoc(requestsRef, upgradeRequest);

      // Update pending status to submitted
      await updateDoc(userRef, {
        'pendingAccountChange.status': 'submitted',
        'pendingAccountChange.submittedAt': serverTimestamp(),
        updatedAt: Date.now(),
      });

      console.log('✅ Account change submitted:', requestId);
      Alert.alert(
        'Submitted',
        'Your account change request has been submitted. An admin will review it shortly.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Error submitting account change:', error);

      let errorMessage = 'Failed to submit account change. Please try again.';

      if (error.message?.includes('incomplete')) {
        errorMessage = error.message; // Use the validation message
      } else if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to submit this request. Please contact support.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service is temporarily unavailable. Please check your connection and try again.';
      } else if (error.message && (
        error.message.includes('network') ||
        error.message.includes('connection') ||
        error.message.includes('offline')
      )) {
        errorMessage = 'Please check your internet connection and try again.';
      }

      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [canSubmit]);

  /**
   * Abort pending change
   */
  const abortPendingChange = useCallback(async (uid: string): Promise<void> => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', uid);

      await updateDoc(userRef, {
        'pendingAccountChange.status': 'incomplete',
        updatedAt: Date.now(),
      });

      console.log('✅ Pending change aborted');
      Alert.alert('Cancelled', 'Account change has been cancelled');
    } catch (error: any) {
      console.error('❌ Error aborting change:', error);
      Alert.alert('Error', error.message || 'Failed to cancel account change');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Listen to request status changes
   */
  const listenToRequestStatus = useCallback((
    requestId: string,
    callback: (status: PendingStatus) => void
  ): Unsubscribe => {
    const requestRef = doc(db, 'upgrade_requests', requestId);

    return onSnapshot(requestRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const status = data.status as 'pending' | 'approved' | 'rejected';

        // Map upgrade_requests status to pending status
        const pendingStatus: PendingStatus =
          status === 'approved' ? 'approved' :
            status === 'rejected' ? 'rejected' :
              'submitted';

        callback(pendingStatus);
      }
    });
  }, []);

  /**
   * Get pending change
   */
  const getPendingChange = useCallback(async (
    uid: string
  ): Promise<PendingAccountChange | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        return null;
      }

      const userData = userSnap.data();
      if (!userData) {
        return null;
      }

      // Safely return pendingAccountChange or null
      const pendingChange = userData.pendingAccountChange;
      return pendingChange as PendingAccountChange || null;
    } catch (error: any) {
      console.error('❌ Error getting pending change:', error);
      return null;
    }
  }, []);

  /**
   * Check if user has pending change
   */
  const hasPendingChange = useCallback(async (uid: string): Promise<boolean> => {
    const pending = await getPendingChange(uid);
    return pending !== null &&
      (pending.status === 'in_progress' ||
        pending.status === 'submitted' ||
        pending.status === 'incomplete');
  }, [getPendingChange]);

  return {
    requiresVerification,
    getRequiredStepsForRole: getRequiredStepsForRoleFunc,
    startPendingAccountChange,
    updatePendingStep,
    uploadDoc,
    submitAccountChange,
    abortPendingChange,
    listenToRequestStatus,
    validateStep,
    canSubmit,
    getPendingChange,
    hasPendingChange,
  };
}
