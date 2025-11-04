/**
 * Verification Templates
 *
 * Central source of truth for per-account-type verification requirements.
 * Can be mirrored in Firestore (collection: verificationTemplates) with the same keys.
 */

export type VerificationKey =
  | 'kyc'
  | 'legalForm'
  | 'businessRegistration'
  | 'pan'
  | 'license'
  | 'propertyProof'
  | 'vehicleDocuments'
  | 'commercialLicense'
  | 'eventPermit'
  | 'activityLicense'
  | 'socialVerification';

export type VerificationTemplateMap = Record<string, VerificationKey[]>;

export const VERIFICATION_TEMPLATES: VerificationTemplateMap = {
  Host: ['kyc', 'legalForm'],
  Agency: ['kyc', 'businessRegistration', 'pan', 'license'],
  AdventurePro: ['kyc', 'activityLicense'],
  Creator: ['kyc', 'socialVerification'],
  StayHost: ['kyc', 'propertyProof', 'license'],
  RideCreator: ['kyc', 'vehicleDocuments', 'commercialLicense'],
  EventOrganizer: ['kyc', 'eventPermit', 'legalForm'],
};

export const VERIFICATION_LABELS: Record<VerificationKey, string> = {
  kyc: 'KYC',
  legalForm: 'Legal Form',
  businessRegistration: 'Business Registration',
  pan: 'PAN',
  license: 'License',
  propertyProof: 'Property Proof',
  vehicleDocuments: 'Vehicle Documents (RC, Insurance)',
  commercialLicense: 'Commercial License',
  eventPermit: 'Event Permit',
  activityLicense: 'Activity License',
  socialVerification: 'Social Verification',
};


