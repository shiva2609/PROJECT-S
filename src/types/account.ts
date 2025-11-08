/**
 * Account Types and User Management Types
 * 
 * Defines all user account types, verification status, and related structures
 * for the Sanchari social travel platform.
 */

export type AccountType =
  | 'Traveler'
  | 'Host'
  | 'Agency'
  | 'AdventurePro'
  | 'Creator'
  | 'StayHost'
  | 'RideCreator'
  | 'EventOrganizer'
  | 'superAdmin';

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'none';

export interface KYCData {
  fullName: string;
  idType: 'passport' | 'aadhaar' | 'driver_license' | 'pan' | 'business_registration';
  idNumber: string;
  idDocumentUrl?: string;
  address?: string;
  phone?: string;
  businessName?: string; // For Agency/StayHost/RideCreator
  registrationNumber?: string; // For Agency
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string; // Admin UID
}

export interface SafetyAgreement {
  accepted: boolean;
  acceptedAt?: number;
  version: string;
}

export interface VerificationDocs {
  idProof?: string;
  businessLicense?: string;
  propertyProof?: string;
  socialLink?: string;
  pan?: string;
  license?: string;
  vehicleDocuments?: string;
  commercialLicense?: string;
  eventPermit?: string;
  activityLicense?: string;
  legalForm?: string;
}

export interface PreviousKYC {
  type: AccountType;
  verifiedAt?: any; // Timestamp
  kycStatus: 'not_required' | 'pending' | 'verified' | 'rejected';
}

export interface UserAccountData {
  uid: string;
  email: string;
  username: string;
  usernameLower: string;
  accountType: AccountType;
  verificationStatus: VerificationStatus;
  kycStatus?: 'not_required' | 'pending' | 'approved' | 'denied' | 'verified' | 'rejected';
  verification?: Partial<Record<
    | 'kyc'
    | 'license'
    | 'businessRegistration'
    | 'propertyProof'
    | 'vehicleDocuments'
    | 'eventPermit'
    | 'pan'
    | 'commercialLicense'
    | 'activityLicense'
    | 'socialVerification',
    'pending' | 'approved' | 'denied'
  >>;
  verificationDocs?: VerificationDocs;
  previousTypes?: AccountType[];
  previousKYC?: PreviousKYC;
  kycData?: KYCData;
  safetyAgreement?: SafetyAgreement;
  verifiedAt?: any; // Timestamp
  createdAt: any; // Timestamp
  updatedAt?: number;
  // Legacy support
  role?: 'traveler' | 'host'; // Keep for backward compatibility
}

export interface AccountUpgradeRequest {
  uid: string;
  requestedAccountType: AccountType;
  kycData: KYCData;
  safetyAgreement: SafetyAgreement;
  status: VerificationStatus;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string; // Admin UID
  rejectionReason?: string;
}

// Account type display metadata
export interface AccountTypeMetadata {
  tag: string;
  color: string;
  displayName: string;
  description: string;
  createOptions: CreateOption[];
}

export type CreateOption =
  | 'Post'
  | 'Reel'
  | 'Package'
  | 'Stay'
  | 'Ride'
  | 'Event'
  | 'Course'
  | 'Local Tour'
  | 'Affiliate Link'
  | 'Itinerary'
  | 'Add Team';

export const ACCOUNT_TYPE_METADATA: Record<AccountType, AccountTypeMetadata> = {
  Traveler: {
    tag: 'TRAVELER',
    color: '#5D9A94',
    displayName: 'Traveler',
    description: 'Default account - can view, follow, like, comment, and book trips',
    createOptions: ['Post', 'Reel'],
  },
  Host: {
    tag: 'HOST',
    color: '#E87A5D',
    displayName: 'Trip Host',
    description: 'Verified individual organizing complete trips',
    createOptions: ['Post', 'Reel', 'Package'],
  },
  Agency: {
    tag: 'AGENCY',
    color: '#F3B72E',
    displayName: 'Travel Agency',
    description: 'Registered travel company or agency',
    createOptions: ['Post', 'Reel', 'Package', 'Add Team'],
  },
  AdventurePro: {
    tag: 'ADVENTURE PRO',
    color: '#F44336',
    displayName: 'Adventure Pro',
    description: 'Adventure experiences and courses provider',
    createOptions: ['Post', 'Reel', 'Course'],
  },
  Creator: {
    tag: 'CREATOR',
    color: '#F9CBAF',
    displayName: 'Content Creator',
    description: 'Content-driven traveler promoting destinations',
    createOptions: ['Post', 'Reel', 'Affiliate Link', 'Itinerary'],
  },
  StayHost: {
    tag: 'STAY HOST',
    color: '#5D9A94',
    displayName: 'Stay Host',
    description: 'Accommodation provider (rooms, homes, villas)',
    createOptions: ['Post', 'Reel', 'Stay'],
  },
  RideCreator: {
    tag: 'RIDE PARTNER',
    color: '#E87A5D',
    displayName: 'Ride Partner',
    description: 'Transport / mobility service provider',
    createOptions: ['Post', 'Reel', 'Ride'],
  },
  EventOrganizer: {
    tag: 'EVENT ORGANIZER',
    color: '#1E88E5', // Accent Blue (Info)
    displayName: 'Event Organizer',
    description: 'Festival / event manager',
    createOptions: ['Post', 'Reel', 'Event'],
  },
  superAdmin: {
    tag: 'ADMIN',
    color: '#3C3C3B',
    displayName: 'Sanchari Admin',
    description: 'System administrator with full permissions',
    createOptions: ['Post', 'Reel'],
  },
};

// Helper to check if account type can create specific content
export function canCreate(accountType: AccountType, createOption: CreateOption): boolean {
  const metadata = ACCOUNT_TYPE_METADATA[accountType];
  return metadata?.createOptions.includes(createOption) ?? false;
}

// Helper to get account type metadata
export function getAccountTypeMetadata(accountType: AccountType): AccountTypeMetadata {
  return ACCOUNT_TYPE_METADATA[accountType] ?? ACCOUNT_TYPE_METADATA.Traveler;
}




