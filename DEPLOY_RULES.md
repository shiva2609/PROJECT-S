# Deploy Firestore Rules - IMPORTANT

## ⚠️ The rules file has been updated but needs to be deployed to Firebase!

The permission errors you're seeing are because the updated rules haven't been deployed yet.

## Quick Deploy Options:

### Option 1: Firebase Console (Easiest)
1. Go to https://console.firebase.google.com/
2. Select your project: **sanchari-truetraveller**
3. Navigate to: **Firestore Database** → **Rules** tab
4. Click **Edit rules**
5. Copy the entire contents of `firestore.rules` file
6. Paste into the editor
7. Click **Publish**

### Option 2: Firebase CLI
```bash
# Make sure you're in the project root directory
cd D:\Sanchari

# Login to Firebase (if not already logged in)
firebase login

# Deploy only the rules
firebase deploy --only firestore:rules
```

### Option 3: Check if firebase.json exists
If you have a `firebase.json` file, make sure it includes:
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

## After Deployment:

1. **Wait 10-30 seconds** for rules to propagate
2. **Reload your app** (or restart the development server)
3. **Check the logs** - permission errors should be gone

## Verify Rules Are Deployed:

1. Go to Firebase Console → Firestore → Rules
2. Check the "Last published" timestamp
3. It should show the current date/time

## If Errors Persist:

1. Check Firebase Console → Firestore → Usage tab for specific permission denials
2. Verify your user is authenticated
3. Check that `adminUsers` collection exists and has your admin user document

---

**Current Status**: Rules file is ready, but needs deployment to Firebase.

