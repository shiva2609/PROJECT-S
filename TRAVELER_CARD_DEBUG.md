# Traveler Card Debugging Guide

## ✅ Functions Deployed Successfully

Both Cloud Functions are now live:
- ✅ `onUserCreated` - Triggers on new user signup
- ✅ `createTravelerCardIfMissing` - Callable function for existing users

## 🔧 How to Fix "Card Unavailable" for Existing Users

### Option 1: Reload the App (Recommended)
1. **Close the app completely** (swipe away from recent apps)
2. **Reopen the app**
3. **Wait 2-3 seconds** for AuthProvider to run
4. **Check console logs** for:
   ```
   [AuthProvider] 🎫 Ensuring Traveller Card exists for user: <uid>
   [AuthProvider] ✅ Traveller Card check complete
   ```
5. **Navigate to Traveler Card screen**

### Option 2: Log Out and Log Back In
1. **Log out** from the app
2. **Log back in** with your credentials
3. **Wait 2-3 seconds** for AuthProvider to run
4. **Navigate to Traveler Card screen**

### Option 3: Manual Function Call (Debug)
If the above doesn't work, you can manually call the function from the console:

```javascript
// In your app's debug console or React Native debugger
import functions from '@react-native-firebase/functions';

async function createCard() {
  try {
    const createFn = functions().httpsCallable('createTravelerCardIfMissing');
    const result = await createFn();
    console.log('Card creation result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

createCard();
```

## 🔍 Verification Steps

### 1. Check Firebase Console
1. Go to: https://console.firebase.google.com/project/sanchari-truetraveller/firestore
2. Navigate to `traveller_cards` collection
3. Look for document with your user ID
4. Verify fields:
   - `travelerId`: 16-char alphanumeric (e.g., `K3M9PQWX2LRST7Y4`)
   - `since`: "MMM YYYY" format
   - `trustTier`: "UNPROVEN"
   - `verificationState`: "COMING_SOON"
   - `displayName`: Your display name
   - `createdAt`: Timestamp
   - `updatedAt`: Timestamp

### 2. Check Console Logs
Look for these logs in your Metro bundler terminal:

**On App Launch/Login:**
```
[AuthProvider] 🎫 Ensuring Traveller Card exists for user: <uid>
[AuthProvider] ✅ Traveller Card check complete
```

**On Traveler Card Screen:**
```
[TravelerCardScreen] Fetching card for user: <uid>
```

**If Card Missing:**
```
[TravelerCardScreen] ⚠️ Traveller Card not found for user: <uid>
```

### 3. Check for Errors
If you see errors like:
- `permission-denied` → Firestore rules issue (should be fixed)
- `not-found` → Function not deployed (should be fixed)
- `unauthenticated` → User not logged in

## 🐛 Common Issues

### Issue: "Card Unavailable" after reload
**Cause:** AuthProvider hasn't run yet or function failed
**Fix:** 
1. Check console logs for errors
2. Wait 5 seconds and navigate to card screen again
3. Check Firebase Console to see if card was created

### Issue: Permission Denied
**Cause:** Firestore rules not deployed
**Fix:** Already deployed, but verify in Firebase Console → Firestore → Rules

### Issue: Function Not Found
**Cause:** Functions not deployed
**Fix:** Already deployed, verified above

## 📊 Expected Behavior

### For Existing Users (You):
1. Open app → AuthProvider runs
2. AuthProvider calls `createTravelerCardIfMissing`
3. Function creates card in Firestore
4. Navigate to Traveler Card screen
5. Screen fetches card and displays it

### For New Users:
1. Sign up → `onUserCreated` trigger fires
2. Function creates card immediately
3. AuthProvider also runs (redundant check)
4. Card already exists (idempotent)
5. Navigate to Traveler Card screen
6. Card displays correctly

## 🎯 Next Steps

1. **Close and reopen your app**
2. **Wait 3 seconds**
3. **Navigate to Traveler Card screen**
4. **If still unavailable:**
   - Check Metro bundler console for errors
   - Check Firebase Console for the card document
   - Share the console logs with me

## 📝 Logs to Share (If Issue Persists)

Please share:
1. Metro bundler console output (last 50 lines)
2. Your user ID (from Firebase Auth)
3. Screenshot of Firestore Console showing `traveller_cards` collection
4. Any error messages from the app
