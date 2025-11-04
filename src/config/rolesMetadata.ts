/**
 * Roles Metadata Configuration
 * 
 * Defines required verification steps for each account type.
 * This can be synced with Firestore collection: roles_metadata/{role}
 */

import { RoleMetadata, VerificationStep } from '../types/kyc';
import { AccountType } from '../types/account';

export const ROLES_METADATA: Record<AccountType, RoleMetadata> = {
  Traveler: {
    role: 'Traveler',
    requiredSteps: [],
  },
  Host: {
    role: 'Host',
    requiredSteps: [
      {
        key: 'kyc',
        type: 'form+file',
        label: 'KYC Verification',
        description: 'Upload your ID document and complete KYC details',
        order: 1,
        fields: [
          {
            key: 'fullName',
            label: 'Full Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 100,
              message: 'Full name must be between 2 and 100 characters',
            },
            placeholder: 'Enter your full name',
          },
          {
            key: 'dob',
            label: 'Date of Birth',
            type: 'date',
            required: true,
            placeholder: 'Select date of birth',
          },
          {
            key: 'idType',
            label: 'ID Type',
            type: 'text',
            required: true,
            placeholder: 'Select ID type',
          },
          {
            key: 'idNumber',
            label: 'ID Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 8,
              message: 'ID number is required',
            },
            placeholder: 'Enter ID number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 10,
      },
      {
        key: 'legalForm',
        type: 'file',
        label: 'Legal Agreement',
        description: 'Upload signed legal agreement form',
        order: 2,
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
    ],
  },
  Agency: {
    role: 'Agency',
    requiredSteps: [
      {
        key: 'kyc',
        type: 'form+file',
        label: 'Director KYC',
        description: 'Upload company director ID document',
        order: 1,
        fields: [
          {
            key: 'fullName',
            label: 'Director Full Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 100,
            },
            placeholder: 'Enter director full name',
          },
          {
            key: 'dob',
            label: 'Date of Birth',
            type: 'date',
            required: true,
            placeholder: 'Select date of birth',
          },
          {
            key: 'idNumber',
            label: 'ID Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 8,
            },
            placeholder: 'Enter ID number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 10,
      },
      {
        key: 'businessRegistration',
        type: 'form+file',
        label: 'Business Registration',
        description: 'Upload business registration certificate',
        order: 2,
        fields: [
          {
            key: 'businessName',
            label: 'Business Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 200,
            },
            placeholder: 'Enter business name',
          },
          {
            key: 'registrationNumber',
            label: 'Registration Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 5,
            },
            placeholder: 'Enter registration number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
      {
        key: 'pan',
        type: 'form+file',
        label: 'PAN Card',
        description: 'Upload PAN card document',
        order: 3,
        fields: [
          {
            key: 'panNumber',
            label: 'PAN Number',
            type: 'pan',
            required: true,
            validation: {
              pattern: '^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
              message: 'Invalid PAN format (e.g., ABCDE1234F)',
            },
            placeholder: 'ABCDE1234F',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 10,
      },
      {
        key: 'license',
        type: 'file',
        label: 'Travel Agency License',
        description: 'Upload travel agency license document',
        order: 4,
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
    ],
  },
  StayHost: {
    role: 'StayHost',
    requiredSteps: [
      {
        key: 'kyc',
        type: 'form+file',
        label: 'KYC Verification',
        description: 'Upload your ID document',
        order: 1,
        fields: [
          {
            key: 'fullName',
            label: 'Full Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 100,
            },
            placeholder: 'Enter your full name',
          },
          {
            key: 'idNumber',
            label: 'ID Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 8,
            },
            placeholder: 'Enter ID number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 10,
      },
      {
        key: 'propertyProof',
        type: 'form+file',
        label: 'Property Proof',
        description: 'Upload property ownership or rental agreement',
        order: 2,
        fields: [
          {
            key: 'propertyAddress',
            label: 'Property Address',
            type: 'text',
            required: true,
            validation: {
              minLength: 10,
            },
            placeholder: 'Enter property address',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
      {
        key: 'license',
        type: 'file',
        label: 'Hospitality License',
        description: 'Upload hospitality license (if applicable)',
        order: 3,
        fileRequired: false,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
    ],
  },
  Creator: {
    role: 'Creator',
    requiredSteps: [
      {
        key: 'kyc',
        type: 'form+file',
        label: 'KYC Verification',
        description: 'Upload your ID document',
        order: 1,
        fields: [
          {
            key: 'fullName',
            label: 'Full Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 100,
            },
            placeholder: 'Enter your full name',
          },
          {
            key: 'idNumber',
            label: 'ID Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 8,
            },
            placeholder: 'Enter ID number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 10,
      },
      {
        key: 'socialVerification',
        type: 'form',
        label: 'Social Media Verification',
        description: 'Provide your social media profile links',
        order: 2,
        fields: [
          {
            key: 'instagram',
            label: 'Instagram Profile',
            type: 'text',
            required: false,
            validation: {
              pattern: '^(https?:\\/\\/)?(www\\.)?instagram\\.com\\/.+',
              message: 'Please enter a valid Instagram URL',
            },
            placeholder: 'https://instagram.com/username',
          },
          {
            key: 'youtube',
            label: 'YouTube Channel',
            type: 'text',
            required: false,
            validation: {
              pattern: '^(https?:\\/\\/)?(www\\.)?(youtube\\.com|youtu\\.be)\\/.+',
              message: 'Please enter a valid YouTube URL',
            },
            placeholder: 'https://youtube.com/@username',
          },
          {
            key: 'tiktok',
            label: 'TikTok Profile',
            type: 'text',
            required: false,
            validation: {
              pattern: '^(https?:\\/\\/)?(www\\.)?tiktok\\.com\\/@.+',
              message: 'Please enter a valid TikTok URL',
            },
            placeholder: 'https://tiktok.com/@username',
          },
        ],
        fileRequired: false,
      },
    ],
  },
  AdventurePro: {
    role: 'AdventurePro',
    requiredSteps: [
      {
        key: 'kyc',
        type: 'form+file',
        label: 'KYC Verification',
        description: 'Upload your ID document',
        order: 1,
        fields: [
          {
            key: 'fullName',
            label: 'Full Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 100,
            },
            placeholder: 'Enter your full name',
          },
          {
            key: 'idNumber',
            label: 'ID Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 8,
            },
            placeholder: 'Enter ID number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 10,
      },
      {
        key: 'activityLicense',
        type: 'file',
        label: 'Activity License',
        description: 'Upload activity/adventure license',
        order: 2,
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
    ],
  },
  RideCreator: {
    role: 'RideCreator',
    requiredSteps: [
      {
        key: 'kyc',
        type: 'form+file',
        label: 'KYC Verification',
        description: 'Upload your ID document',
        order: 1,
        fields: [
          {
            key: 'fullName',
            label: 'Full Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 100,
            },
            placeholder: 'Enter your full name',
          },
          {
            key: 'idNumber',
            label: 'ID Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 8,
            },
            placeholder: 'Enter ID number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 10,
      },
      {
        key: 'vehicleDocuments',
        type: 'form+file',
        label: 'Vehicle Documents',
        description: 'Upload vehicle RC and insurance',
        order: 2,
        fields: [
          {
            key: 'vehicleNumber',
            label: 'Vehicle Registration Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 5,
            },
            placeholder: 'Enter vehicle number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
      {
        key: 'commercialLicense',
        type: 'file',
        label: 'Commercial License',
        description: 'Upload commercial driving license',
        order: 3,
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
    ],
  },
  EventOrganizer: {
    role: 'EventOrganizer',
    requiredSteps: [
      {
        key: 'kyc',
        type: 'form+file',
        label: 'KYC Verification',
        description: 'Upload your ID document',
        order: 1,
        fields: [
          {
            key: 'fullName',
            label: 'Full Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 2,
              maxLength: 100,
            },
            placeholder: 'Enter your full name',
          },
          {
            key: 'idNumber',
            label: 'ID Number',
            type: 'text',
            required: true,
            validation: {
              minLength: 8,
            },
            placeholder: 'Enter ID number',
          },
        ],
        fileRequired: true,
        acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxFileSize: 10,
      },
      {
        key: 'eventPermit',
        type: 'file',
        label: 'Event Permit',
        description: 'Upload event permit document',
        order: 2,
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
      {
        key: 'legalForm',
        type: 'file',
        label: 'Legal Agreement',
        description: 'Upload signed legal agreement',
        order: 3,
        fileRequired: true,
        acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxFileSize: 10,
      },
    ],
  },
  superAdmin: {
    role: 'superAdmin',
    requiredSteps: [],
  },
};

/**
 * Get required steps for a role
 */
export function getRequiredStepsForRole(role: AccountType): VerificationStep[] {
  return ROLES_METADATA[role]?.requiredSteps || [];
}

/**
 * Validate field value
 */
export function validateField(
  value: any,
  field: VerificationField
): { isValid: boolean; error?: string } {
  if (field.required && (!value || value.toString().trim() === '')) {
    return { isValid: false, error: `${field.label} is required` };
  }

  if (!value && !field.required) {
    return { isValid: true };
  }

  const strValue = value.toString().trim();

  // Length validation
  if (field.validation?.minLength && strValue.length < field.validation.minLength) {
    return {
      isValid: false,
      error: field.validation.message || `${field.label} must be at least ${field.validation.minLength} characters`,
    };
  }

  if (field.validation?.maxLength && strValue.length > field.validation.maxLength) {
    return {
      isValid: false,
      error: `${field.label} must be at most ${field.validation.maxLength} characters`,
    };
  }

  // Pattern validation
  if (field.validation?.pattern) {
    const regex = new RegExp(field.validation.pattern);
    if (!regex.test(strValue)) {
      return {
        isValid: false,
        error: field.validation.message || `${field.label} format is invalid`,
      };
    }
  }

  // Type-specific validation
  if (field.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strValue)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
  }

  if (field.type === 'phone') {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(strValue)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }
  }

  return { isValid: true };
}

