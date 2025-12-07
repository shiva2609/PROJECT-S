# Deploy Storage Rules - Profile Photo Upload Fix

## ⚠️ IMPORTANT: Storage rules need to be deployed!

The profile photo upload is failing because the storage rules haven't been deployed yet.

## Quick Deploy Options:

### Option 1: Firebase Console (Easiest - Recommended)
1. Go to https://console.firebase.google.com/
2. Select your project: **sanchari-truetraveller**
3. Navigate to: **Storage** → **Rules** tab
4. Click **Edit rules**
5. Copy the entire contents of `storage.rules` file
6. Paste into the editor
7. Click **Publish**

### Option 2: Firebase CLI (Now Available)
Since `firebase.json` has been created, you can now use:

```bash
# Make sure you're in the project root directory
cd D:\Sanchari

# Login to Firebase (if not already logged in)
firebase login

# Deploy only the storage rules
firebase deploy --only storage
```

## What Was Fixed:

✅ Added rule for `/profilePhotos/{userId}.jpg` path
✅ Added rule for `/posts/{userId}/{fileName}` path  
✅ Allows authenticated users to upload their own profile photos
✅ Size limit: 5MB for profile photos, 20MB for posts
✅ Content type validation: images/videos only

## After Deployment:

1. **Wait 10-30 seconds** for rules to propagate
2. **Try uploading profile photo again** - should work now!
3. **Check the logs** - authorization errors should be gone

## Verify Rules Are Deployed:

1. Go to Firebase Console → Storage → Rules
2. Check the "Last published" timestamp
3. It should show the current date/time
4. Look for the `/profilePhotos/{userId}.jpg` rule

---

**Current Status**: Storage rules file is ready, needs deployment to Firebase.

