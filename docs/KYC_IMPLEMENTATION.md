# Dynamic KYC & Verification Flow Implementation

## Overview

This document describes the modular KYC (Know Your Customer) and verification system implemented for the Sanchari app. The system dynamically adapts verification requirements based on account types and handles account type changes with proper re-verification.

## Architecture

### Core Components

1. **`useKYCManager` Hook** (`src/hooks/useKYCManager.ts`)
   - Centralized KYC management logic
   - Handles verification requirements, status updates, and document uploads
   - Provides functions for account type changes and verification resets

2. **Verification Screens** (`src/screens/kyc/`)
   - `BaseVerificationScreen.tsx` - Reusable base component
   - `HostVerification.tsx` - Host account verification
   - `AgencyVerification.tsx` - Agency account verification
   - `StayHostVerification.tsx` - Stay Host account verification
   - `CreatorVerification.tsx` - Creator/Affiliate account verification

3. **Navigation Helper** (`src/utils/kycNavigation.ts`)
   - Routes users to appropriate verification screens based on account type

4. **Updated ProfileScreen** (`src/screens/ProfileScreen.tsx`)
   - Account type change functionality
   - Modal for selecting new account type
   - Integration with verification flow

## Data Model (Firestore)

### User Document Structure

```typescript
users/{uid}: {
  accountType: AccountType,
  kycStatus: "not_required" | "pending" | "verified" | "rejected",
  verificationStatus: "none" | "pending" | "verified" | "rejected",
  verification: {
    kyc?: "pending" | "approved" | "denied",
    license?: "pending" | "approved" | "denied",
    businessRegistration?: "pending" | "approved" | "denied",
    // ... other verification steps
  },
  verificationDocs: {
    idProof?: string,
    businessLicense?: string,
    propertyProof?: string,
    socialLink?: string,
    pan?: string,
    license?: string,
    // ... other document URLs
  },
  previousTypes?: AccountType[],
  previousKYC?: {
    type: AccountType,
    verifiedAt?: Timestamp,
    kycStatus: "not_required" | "pending" | "verified" | "rejected"
  },
  verifiedAt?: Timestamp,
  createdAt: Timestamp,
  updatedAt: number
}
```

## Account Type Verification Requirements

| Account Type | Required Verifications |
|-------------|----------------------|
| Traveler | None |
| Host | KYC + Legal Form |
| Agency | KYC + Business Registration + PAN + License |
| AdventurePro | KYC + Activity License |
| Creator | KYC + Social Verification |
| StayHost | KYC + Property Proof + License |
| RideCreator | KYC + Vehicle Documents + Commercial License |
| EventOrganizer | KYC + Event Permit + Legal Form |

## Key Features

### 1. Dynamic Verification Requirements

The system automatically determines which verification screens to show based on the selected account type:

```typescript
const requiredVerifications = getRequiredVerifications(accountType);
// Returns: ['kyc', 'legalForm'] for Host
// Returns: ['kyc', 'businessRegistration', 'pan', 'license'] for Agency
```

### 2. Account Type Change Flow

When a user changes their account type:

1. Confirmation modal appears warning about re-verification
2. Current verification is saved to `previousKYC`
3. Account type is updated
4. Verification status is reset to "pending"
5. User is redirected to appropriate verification screens

### 3. Verification Status Management

- **not_required**: Account type doesn't need verification (Traveler)
- **pending**: Verification submitted, awaiting admin review
- **verified**: Verification approved by admin
- **rejected**: Verification rejected (user can resubmit)

### 4. Document Upload

Documents are uploaded and stored in Firestore under `verificationDocs`:
- ID Proof (KYC)
- Business License
- Property Proof
- Social Media Links
- PAN Card
- Licenses
- etc.

## Usage Examples

### Starting Verification

```typescript
const { startVerification } = useKYCManager();

await startVerification(user.uid, 'Host');
// Sets kycStatus to 'pending' and initializes verification steps
```

### Changing Account Type

```typescript
const { resetVerificationForNewType } = useKYCManager();

const confirmed = await resetVerificationForNewType(
  user.uid,
  'Agency',
  'Host'
);

if (confirmed) {
  // Navigate to Agency verification screen
  navigation.navigate('AgencyVerification');
}
```

### Uploading Documents

```typescript
const { uploadVerificationDocs } = useKYCManager();

await uploadVerificationDocs(user.uid, {
  idProof: 'https://...',
  businessLicense: 'https://...',
  pan: 'https://...'
});
```

### Checking Verification Status

```typescript
const { checkVerificationStatus } = useKYCManager();

const { requiresVerification, isVerified } = await checkVerificationStatus(user.uid);

if (requiresVerification && !isVerified) {
  // Redirect to verification flow
  navigateToVerification(navigation, accountType);
}
```

## Integration Points

### 1. AuthContext Integration

Add auto-redirect logic in `AuthContext` or app startup:

```typescript
useEffect(() => {
  if (user && initialized) {
    checkVerificationStatus(user.uid).then(({ requiresVerification, isVerified }) => {
      if (requiresVerification && !isVerified) {
        const accountType = userData.accountType;
        navigateToVerification(navigation, accountType);
      }
    });
  }
}, [user, initialized]);
```

### 2. Navigation Setup

Add verification screens to your navigation stack:

```typescript
// In your navigation config
<Stack.Screen name="HostVerification" component={HostVerification} />
<Stack.Screen name="AgencyVerification" component={AgencyVerification} />
<Stack.Screen name="StayHostVerification" component={StayHostVerification} />
<Stack.Screen name="CreatorVerification" component={CreatorVerification} />
```

### 3. Access Control

Disable features until verification is complete:

```typescript
const { checkVerificationStatus } = useKYCManager();
const { isVerified } = await checkVerificationStatus(user.uid);

if (!isVerified) {
  Alert.alert('Verification Required', 'Please complete verification to access this feature');
  return;
}
```

## Future Enhancements

1. **Additional Verification Screens**: Create screens for AdventurePro, RideCreator, EventOrganizer
2. **Document Preview**: Add document preview before submission
3. **Progress Tracking**: Show verification progress indicator
4. **Email Notifications**: Notify users when verification is approved/rejected
5. **Admin Dashboard**: Enhanced admin interface for reviewing verifications

## Testing Checklist

- [ ] Traveler account requires no verification
- [ ] Host account requires KYC + Legal Form
- [ ] Agency account requires all 4 documents
- [ ] Changing from Host to Agency triggers re-verification
- [ ] Previous verification is saved correctly
- [ ] Document uploads work correctly
- [ ] Verification status updates properly
- [ ] Navigation to verification screens works
- [ ] Access control blocks unverified features

## Notes

- All verification documents are stored in Firestore
- Previous verifications are preserved for audit purposes
- Users can switch back to previously verified account types (if admin allows)
- The system is modular and easily extensible for new account types

