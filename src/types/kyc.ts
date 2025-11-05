/**
 * KYC Verification Types
 * 
 * Defines types for account change verification flow
 */

import { AccountType } from './account';

export type PendingStatus = 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'incomplete';

export type VerificationStepType = 'form' | 'file' | 'form+file';

export interface VerificationField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'pan' | 'aadhaar';
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    message?: string;
  };
  placeholder?: string;
}

export interface VerificationStep {
  key: string;
  type: VerificationStepType;
  label: string;
  description?: string;
  order: number;
  fields?: VerificationField[];
  fileRequired: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
}

export interface RoleMetadata {
  role: AccountType;
  requiredSteps: VerificationStep[];
}

export interface UploadedDoc {
  url: string;
  uploadedAt: any; // Timestamp
  fileName?: string;
  fileSize?: number;
}

export interface StepData {
  stepKey: string;
  formData?: Record<string, any>;
  uploadedDoc?: UploadedDoc;
  completed: boolean;
  completedAt?: any; // Timestamp
}

export interface PendingAccountChange {
  requestId: string | null;
  toRole: AccountType;
  startedAt: any; // Timestamp
  status: PendingStatus;
  currentStep: number; // 1-based
  requiredSteps: VerificationStep[];
  stepData: Record<string, StepData>;
  uploadedDocs: Record<string, UploadedDoc>;
}

export interface UpgradeRequest {
  requestId: string;
  uid: string;
  fromRole: AccountType;
  toRole: AccountType;
  requiredSteps: VerificationStep[];
  uploadedDocs: Record<string, UploadedDoc>;
  stepData: Record<string, StepData>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Timestamp
  submittedAt?: any; // Timestamp
  reviewedBy?: string; // Admin UID
  reviewedAt?: any; // Timestamp
  adminComment?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

