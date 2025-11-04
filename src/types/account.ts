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

export interface UserAccountData {
  uid: string;
  email: string;
  username: string;
  usernameLower: string;
  accountType: AccountType;
  verificationStatus: VerificationStatus;
  kycStatus?: 'none' | 'pending' | 'approved' | 'denied';
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
  previousTypes?: AccountType[];
  kycData?: KYCData;
  safetyAgreement?: SafetyAgreement;
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
    tag: 'Traveler',
    color: '#64748B',
    displayName: 'Traveler',
    description: 'Default account - can view, follow, like, comment, and book trips',
    createOptions: ['Post', 'Reel'],
  },
  Host: {
    tag: 'Host',
    color: '#E87A5D',
    displayName: 'Travel Host',
    description: 'Verified individual organizing complete trips',
    createOptions: ['Post', 'Reel', 'Package'],
  },
  Agency: {
    tag: 'Agency',
    color: '#5D9A94',
    displayName: 'Travel Agency',
    description: 'Registered travel company or agency',
    createOptions: ['Post', 'Reel', 'Package', 'Add Team'],
  },
  AdventurePro: {
    tag: 'Adventure Pro',
    color: '#F3B72E',
    displayName: 'Adventure Pro',
    description: 'Adventure experiences and courses provider',
    createOptions: ['Post', 'Reel', 'Course'],
  },
  Creator: {
    tag: 'Creator',
    color: '#3C3C3B',
    displayName: 'Creator/Influencer',
    description: 'Content-driven traveler promoting destinations',
    createOptions: ['Post', 'Reel', 'Affiliate Link', 'Itinerary'],
  },
  StayHost: {
    tag: 'Stay Host',
    color: '#F9CBAF',
    displayName: 'Stay Host',
    description: 'Accommodation provider (rooms, homes, villas)',
    createOptions: ['Post', 'Reel', 'Stay'],
  },
  RideCreator: {
    tag: 'Ride Creator',
    color: '#5D9A94',
    displayName: 'Ride Creator',
    description: 'Transport / mobility service provider',
    createOptions: ['Post', 'Reel', 'Ride'],
  },
  EventOrganizer: {
    tag: 'Event Organizer',
    color: '#8B5CF6',
    displayName: 'Event Organizer',
    description: 'Festival / event manager',
    createOptions: ['Post', 'Reel', 'Event'],
  },
  superAdmin: {
    tag: 'Admin',
    color: '#EF4444',
    displayName: 'Super Admin',
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




