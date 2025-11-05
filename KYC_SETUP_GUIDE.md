# KYC System Setup Guide

## Quick Start

### 1. Add Verification Screens to Navigation

Add the verification screens to your navigation stack (typically in `AppNavigator.tsx` or similar):

```typescript
import HostVerification from './src/screens/kyc/HostVerification';
import AgencyVerification from './src/screens/kyc/AgencyVerification';
import StayHostVerification from './src/screens/kyc/StayHostVerification';
import CreatorVerification from './src/screens/kyc/CreatorVerification';

// In your Stack.Navigator:
<Stack.Screen 
  name="HostVerification" 
  component={HostVerification} 
  options={{ title: 'Host Verification' }}
/>
<Stack.Screen 
  name="AgencyVerification" 
  component={AgencyVerification} 
  options={{ title: 'Agency Verification' }}
/>
<Stack.Screen 
  name="StayHostVerification" 
  component={StayHostVerification} 
  options={{ title: 'Stay Host Verification' }}
/>
<Stack.Screen 
  name="CreatorVerification" 
  component={CreatorVerification} 
  options={{ title: 'Creator Verification' }}
/>
```

### 2. Add Auto-Redirect on App Start

Add this to your main app component or navigation component:

```typescript
import { useKYCRedirect } from './src/utils/kycAuthRedirect';
import { useAuth } from './src/contexts/AuthContext';

function AppNavigator() {
  const { user, initialized } = useAuth();
  
  // Auto-redirect to verification if needed
  useKYCRedirect(user?.uid || null, initialized);
  
  // ... rest of your navigation setup
}
```

### 3. Update Firestore Security Rules

Ensure your Firestore rules allow users to update their own verification data:

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
  
  // Allow users to update their own verification fields
  allow update: if request.auth != null 
    && request.auth.uid == userId
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['verificationDocs', 'kycStatus', 'verificationStatus', 'accountType', 'previousTypes', 'previousKYC', 'updatedAt']);
}
```

### 4. Test the Flow

1. **Sign up as a Traveler** - Should not require verification
2. **Change to Host account type** - Should show confirmation modal
3. **Confirm change** - Should redirect to HostVerification screen
4. **Complete verification** - Should update status to pending
5. **Check ProfileScreen** - Should show "Change Account Type" button

## Features Implemented

✅ **useKYCManager Hook** - Complete KYC management
✅ **Dynamic Verification Screens** - Host, Agency, StayHost, Creator
✅ **Account Type Change** - With confirmation and re-verification
✅ **Previous KYC Storage** - Audit trail for account type changes
✅ **Navigation Helper** - Auto-routing to correct verification screen
✅ **Firestore Integration** - Complete data model updates
✅ **ProfileScreen Updates** - Account type change modal

## File Structure

```
src/
├── hooks/
│   └── useKYCManager.ts          # Core KYC management hook
├── screens/
│   ├── kyc/
│   │   ├── BaseVerificationScreen.tsx
│   │   ├── HostVerification.tsx
│   │   ├── AgencyVerification.tsx
│   │   ├── StayHostVerification.tsx
│   │   └── CreatorVerification.tsx
│   └── ProfileScreen.tsx         # Updated with account type change
├── utils/
│   ├── kycNavigation.ts          # Navigation helpers
│   └── kycAuthRedirect.ts        # Auto-redirect logic
└── types/
    └── account.ts                # Updated with new interfaces
```

## Next Steps

1. **Create Remaining Verification Screens** (if needed):
   - `AdventureProVerification.tsx`
   - `RideCreatorVerification.tsx`
   - `EventOrganizerVerification.tsx`

2. **Add Document Upload to Storage**:
   - Currently verification screens use local URIs
   - Implement upload to Firebase Storage
   - Update `uploadVerificationDocs` to handle Storage URLs

3. **Admin Verification Interface**:
   - Update `AdminVerificationScreen` to use new data model
   - Add ability to approve/reject individual verification steps

4. **Access Control**:
   - Add checks in protected screens/features
   - Block unverified users from accessing type-specific features

## Troubleshooting

### Navigation not working
- Ensure verification screens are added to navigation stack
- Check that route names match exactly (case-sensitive)

### Verification status not updating
- Check Firestore security rules
- Verify user document exists
- Check console for errors

### Account type change not working
- Ensure user is logged in
- Check that `resetVerificationForNewType` is called correctly
- Verify Firestore permissions

## Support

For issues or questions, refer to:
- `KYC_IMPLEMENTATION.md` - Detailed architecture documentation
- `src/hooks/useKYCManager.ts` - Hook implementation with comments
- `src/utils/kycNavigation.ts` - Navigation helper functions

