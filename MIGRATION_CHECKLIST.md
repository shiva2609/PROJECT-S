# Account Change & Verification Flow - Migration Checklist

## Pre-Deployment Tasks

### 1. Firestore Collections Setup

- [ ] **Create `roles_metadata` collection** (or use local config as fallback)
  - Each document ID should be the account type (e.g., `Host`, `Agency`, `StayHost`)
  - Document structure: `{ requiredSteps: [...] }`
  - You can seed this collection using the `ROLES_METADATA` config from `src/config/rolesMetadata.ts`

- [ ] **Verify `upgrade_requests` collection permissions**
  - Ensure Firestore rules are deployed (see `firestore.rules`)

### 2. Firebase Storage Setup

- [ ] **Deploy Storage rules** (see `storage.rules`)
  - Rules protect `verification_docs/{userId}/{requestId}/{fileName}` path
  - Max file size: 10MB
  - Allowed types: images and PDFs

### 3. Cloud Functions Deployment (Optional)

- [ ] **Install Firebase CLI**: `npm install -g firebase-tools`
- [ ] **Login**: `firebase login`
- [ ] **Initialize Functions** (if not done): `firebase init functions`
- [ ] **Install dependencies**: `cd functions && npm install`
- [ ] **Deploy functions**:
  ```bash
  cd functions
  npm run build
  firebase deploy --only functions
  ```

### 4. Client-Side Updates

- [ ] **Verify all dependencies are installed**:
  ```bash
  yarn install
  ```

- [ ] **Update navigation** (already done in `AppNavigator.tsx`)
  - `AccountChangeFlow` screen is registered

- [ ] **Test the flow**:
  1. Navigate to Profile → Change Account Type
  2. Select a role requiring verification
  3. Complete verification steps
  4. Submit request
  5. Verify `upgrade_requests` document is created

### 5. Admin Panel Updates

- [ ] **Update `AdminVerificationScreen.tsx`** to:
  - List pending `upgrade_requests`
  - Show request details (fromRole, toRole, uploadedDocs, stepData)
  - Allow Approve/Reject with comments
  - Update `upgrade_requests/{requestId}.status` to 'approved' or 'rejected'

### 6. Security Rules Deployment

- [ ] **Deploy Firestore rules**:
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] **Deploy Storage rules**:
  ```bash
  firebase deploy --only storage
  ```

### 7. Testing Checklist

#### Unit Tests
- [ ] Run `yarn test` to verify all tests pass
- [ ] Add integration tests for:
  - Starting account change
  - Saving progress
  - Resuming flow
  - Submitting request
  - Admin approval flow

#### Integration Tests
- [ ] **Test complete flow**:
  1. User selects new account type
  2. Verification flow starts
  3. User completes all steps
  4. User submits request
  5. Admin approves/rejects
  6. User's `accountType` updates (if approved)

- [ ] **Test edge cases**:
  - User abandons flow mid-way
  - User tries to change type while pending
  - User tries to submit incomplete verification
  - Admin rejects request
  - User tries to access role-specific features while pending

### 8. Data Migration (if needed)

- [ ] **Migrate existing users**:
  - If users have old `kycStatus`, migrate to new structure
  - Set `pendingAccountChange` to `null` for existing users

- [ ] **Backup existing data** before deployment

### 9. Documentation

- [ ] Update API documentation
- [ ] Document the new verification flow for users
- [ ] Document admin approval process

### 10. Monitoring

- [ ] Set up Firebase Analytics for:
  - Account change requests
  - Verification completion rates
  - Approval/rejection rates

- [ ] Set up error logging for:
  - Failed uploads
  - Validation errors
  - Cloud Function errors

## Post-Deployment Verification

- [ ] Verify Firestore rules are active
- [ ] Verify Storage rules are active
- [ ] Test end-to-end flow with a test account
- [ ] Monitor Cloud Function logs for errors
- [ ] Verify admin panel can approve/reject requests
- [ ] Test that `accountType` updates correctly after approval

## Rollback Plan

If issues occur:
1. Revert Firestore rules to previous version
2. Revert Storage rules to previous version
3. Disable Cloud Functions (if causing issues)
4. Revert client code to previous version

## Notes

- The system uses `pendingAccountChange` in `users/{uid}` to track in-progress changes
- Account type is ONLY updated after admin approval via Cloud Function
- Old verification data is preserved in `previousKYC` for audit purposes
- Users can resume incomplete flows from where they left off

