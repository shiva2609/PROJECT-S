# Admin Account Setup

## Initializing SanchariAdmin

To create the superAdmin account for managing user verifications:

### Option 1: Run from code

Create a temporary script or add to your app initialization:

```typescript
import { initializeAdminAccount } from './src/utils/adminInit';

// Call this once to create the admin account
await initializeAdminAccount();
```

### Option 2: Manual Firebase Console Setup

1. Go to Firebase Authentication
2. Create a user with:
   - Email: `kaustubha000@gmail.com`
   - Password: `sanchari`

3. In Firestore, create/update document in `users/{uid}`:
```json
{
  "uid": "{auth-user-uid}",
  "email": "kaustubha000@gmail.com",
  "username": "sanchariadmin",
  "usernameLower": "sanchariadmin",
  "accountType": "superAdmin",
  "verificationStatus": "verified",
  "permissions": "all",
  "createdAt": "serverTimestamp()"
}
```

4. Also create in `adminUsers/sanchariadmin`:
```json
{
  "uid": "{auth-user-uid}",
  "username": "SanchariAdmin",
  "email": "kaustubha000@gmail.com",
  "role": "superAdmin"
}
```

## Admin Permissions

The SanchariAdmin account can:
- Approve/reject user KYC requests
- Convert or reset any user's account type
- Manage or delete any content
- Access admin verification panel from Profile screen

## Login Credentials

- **Username/Email:** `kaustubha000@gmail.com` or `SanchariAdmin`
- **Password:** `sanchari`
- **Role:** `superAdmin`

⚠️ **Note:** This account is not visible publicly in the app but has full system access.

