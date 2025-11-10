# Firestore Security Rules Guide

## 📋 Overview

This document explains the comprehensive Firestore security rules for the Sanchari project. These rules ensure:
- ✅ All controls and fetchings work correctly
- ✅ Data is protected from unauthorized access
- ✅ **Data never gets deleted** (prevents 30-day auto-delete)
- ✅ Super admin access is properly configured
- ✅ Real-time listeners (onSnapshot) work seamlessly

## 🔐 Key Features

### 1. **Data Persistence (No Auto-Delete)**
- All collections have `allow delete: if false` or `preventDeletion()` function
- This ensures data is **never deleted** after 30 days or by accident
- Only super admins can delete specific content (posts, trips) but not user data

### 2. **Super Admin Access**
Super admins are identified by:
- Document in `adminUsers` collection (by UID, email prefix, or 'sanchariadmin')
- OR `accountType == 'superAdmin'` in `users` collection

### 3. **Real-Time Updates**
All rules support `onSnapshot` listeners:
- Users can listen to their own data
- Super admins can listen to all data
- Public content is readable by all authenticated users

## 📦 Collections Covered

### Core Collections

#### 1. **users** - User Profiles
- ✅ Read: All authenticated users
- ✅ Create: During signup (accountType must be 'Traveler')
- ✅ Update: Own profile (except accountType, suspended) OR super admin
- ❌ Delete: **Prevented** (data persists forever)

#### 2. **adminUsers** - Super Admin Registry
- ✅ Read: Only super admins
- ✅ Create/Update: Only super admins
- ❌ Delete: **Prevented**

#### 3. **verifications** - Verification Requests
- ✅ Read: Own verifications OR super admin
- ✅ Create: Users can create their own requests
- ✅ Update: Only super admins (approve/deny)
- ❌ Delete: **Prevented**

#### 4. **upgradeRequests** / **upgrade_requests** - Account Upgrades
- ✅ Read: Own requests OR super admin
- ✅ Create: Users can create requests
- ✅ Update: Only super admins
- ❌ Delete: **Prevented**

### Content Collections

#### 5. **posts** - Posts/Content
- ✅ Read: All authenticated users
- ✅ Create: Authenticated users
- ✅ Update: Own posts OR super admin
- ✅ Delete: Only super admin

#### 6. **trips** - Trip Data
- ✅ Read: All authenticated users
- ✅ Create: Authenticated users
- ✅ Update: Own trips OR super admin
- ✅ Delete: Only super admin

#### 7. **reports** - User Reports
- ✅ Read: Only super admins
- ✅ Create: Users can report issues
- ✅ Update: Only super admins
- ❌ Delete: **Prevented**

### Additional Content Collections

All follow the same pattern:
- **packages** - Travel packages
- **stays** - Accommodation listings
- **rides** - Transport listings
- **courses** - Adventure courses
- **localTours** - Local experience tours
- **affiliateLinks** - Affiliate promotions
- **itineraries** - Travel itineraries
- **teamMembers** - Agency team members
- **events** - Events
- **stories** - Stories

Rules:
- ✅ Read: All authenticated users
- ✅ Create: Authenticated users (must set `createdBy`)
- ✅ Update: Own content OR super admin
- ✅ Delete: Only super admin

### Utility Collections

#### 8. **usernames** - Username Reservations
- ✅ Read: All authenticated users (for availability checks)
- ✅ Create: During signup
- ❌ Update/Delete: **Prevented** (permanent reservations)

#### 9. **roleRequirements** - Role Configuration
- ✅ Read: All authenticated users
- ✅ Create/Update: Only super admins
- ❌ Delete: **Prevented**

## 🚀 Deployment Instructions

### Option 1: Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules`
5. Paste and click **Publish**

### Option 2: Firebase CLI
```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

### Option 3: Using firebase.json
If you have a `firebase.json` file:
```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

Then deploy:
```bash
firebase deploy --only firestore:rules
```

## ✅ Testing the Rules

### Test Super Admin Access
```javascript
// In your app, verify super admin can:
// 1. Read all users
const usersRef = collection(db, 'users');
const snapshot = await getDocs(usersRef); // Should work for super admin

// 2. Update any user
const userRef = doc(db, 'users', 'someUserId');
await updateDoc(userRef, { accountType: 'Host' }); // Should work for super admin

// 3. Read verifications
const verificationsRef = collection(db, 'verifications');
const verSnapshot = await getDocs(verificationsRef); // Should work for super admin
```

### Test User Access
```javascript
// Regular users should:
// 1. Read their own profile
const myUserRef = doc(db, 'users', currentUser.uid);
const myUser = await getDoc(myUserRef); // Should work

// 2. NOT update accountType directly
await updateDoc(myUserRef, { accountType: 'Host' }); // Should FAIL

// 3. Create upgrade requests
const requestsRef = collection(db, 'upgradeRequests');
await addDoc(requestsRef, { uid: currentUser.uid, ... }); // Should work
```

## 🔒 Security Best Practices

### 1. **Never Allow Client-Side Deletions**
All critical collections prevent deletion:
- `users` - Never deleted
- `adminUsers` - Never deleted
- `verifications` - Never deleted
- `reports` - Never deleted
- `usernames` - Never deleted

### 2. **Protect Sensitive Fields**
- `accountType` - Only super admins can change
- `suspended` - Only super admins can change
- `verified` - Only super admins can change

### 3. **Owner Verification**
All create/update operations verify:
- `createdBy == request.auth.uid` for content
- `uid == request.auth.uid` for user data

## 🐛 Troubleshooting

### Issue: "Missing or insufficient permissions"
**Solution**: Check if:
1. User is authenticated (`isAuthenticated()`)
2. User is the owner (for own data)
3. User is super admin (for admin operations)

### Issue: "Cannot delete document"
**Expected**: This is intentional! Data is protected from deletion.

### Issue: "Cannot update accountType"
**Expected**: Only super admins can update `accountType`. Regular users must use upgrade requests.

### Issue: Real-time listeners not working
**Solution**: Ensure:
1. User is authenticated
2. Rules allow read access
3. Collection path is correct

## 📝 Notes

1. **30-Day Auto-Delete Prevention**: The `preventDeletion()` function ensures data is never automatically deleted. This is critical for data persistence.

2. **Super Admin Detection**: The rules check multiple locations:
   - `adminUsers/{uid}`
   - `adminUsers/{emailPrefix}`
   - `adminUsers/sanchariadmin`
   - `users/{uid}.accountType == 'superAdmin'`

3. **Backward Compatibility**: Both `upgradeRequests` and `upgrade_requests` collections are supported.

4. **Default Deny**: Any collection not explicitly defined will be denied by default (security best practice).

## 🔄 Updating Rules

When adding new collections:
1. Add a new `match` block in `firestore.rules`
2. Define appropriate read/write/delete rules
3. Test thoroughly before deploying
4. Deploy using one of the methods above

## 📞 Support

If you encounter issues:
1. Check Firebase Console → Firestore → Rules for syntax errors
2. Review Firebase Console → Firestore → Usage for permission denials
3. Test rules using Firebase Console → Firestore → Rules → Rules Playground

---

**Last Updated**: Based on current codebase analysis
**Version**: 2.0
**Status**: Production Ready ✅

