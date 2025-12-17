# AUTH VERIFICATION LOGS - QUICK REFERENCE

## 🎯 What to Look For on Real Device

### ✅ SUCCESSFUL AUTH FLOW

When you press the Post button, you should see this sequence:

```
🔵 [AddDetailsScreen] POST button clicked - START

🔍 AUTH SNAPSHOT: {
  currentUser: FirebaseAuthTypes.User,
  uid: "abc123def456...",
  email: "user@example.com",
  lastSignInTime: "2025-12-17T...",
  authReady: true,
  userFromHook: "abc123def456..."
}

🔐 Verifying auth token before upload...
✅ Auth token verified. User UID: abc123def456...

🟢 [AddDetailsScreen] Step 1: Processing final crops...
➡️ BEFORE: processFinalCrops
✅ AFTER: processFinalCrops - Got 1 URIs

🟢 [AddDetailsScreen] Step 2: Uploading images associated with postId: post_...
🟢 [AddDetailsScreen] Uploading image 1/1...
➡️ BEFORE: uploadImage for image 1

[UPLOAD] 🔍 AUTH SNAPSHOT at upload time: {
  currentUser: "abc123def456...",
  userFromHook: "abc123def456...",
  authReady: true
}

[UPLOAD] Storage path: users/abc123def456.../posts/post_.../media_...jpg
[UPLOAD] Forcing token refresh before upload...
[UPLOAD] Token refreshed successfully. User: abc123def456...
[UPLOAD] Has Token: true
[UPLOAD] UPLOAD AUTH UID: abc123def456...
[UPLOAD] Starting putFile upload...
[UPLOAD] Progress: 25%
[UPLOAD] Progress: 50%
[UPLOAD] Progress: 75%
[UPLOAD] Progress: 100%
[UPLOAD] Upload complete, getting download URL...
[UPLOAD] Download URL obtained: https://firebasestorage...

✅ AFTER: uploadImage for image 1 - URL: https://firebasestorage...

🟢 [AddDetailsScreen] Step 3: Creating Firestore document with ID: post_...
➡️ BEFORE: setDoc to Firestore
✅ AFTER: setDoc to Firestore - Document created successfully
✅ [AddDetailsScreen] Post document created successfully
```

---

## ❌ FAILURE SCENARIOS

### Scenario 1: Auth Not Ready (Should NOT happen with our fix)

```
🔵 [AddDetailsScreen] POST button clicked - START

🔍 AUTH SNAPSHOT: {
  currentUser: null,  ⚠️ NULL!
  uid: undefined,
  email: undefined,
  lastSignInTime: undefined,
  authReady: false,  ⚠️ FALSE!
  userFromHook: undefined
}

❌ [AddDetailsScreen] Auth not ready, aborting
```

**Alert shown**: "Authentication is still initializing. Please wait."

---

### Scenario 2: Token Refresh Fails

```
🔐 Verifying auth token before upload...
[UPLOAD ERROR] Failed to refresh token: [Error details]
❌ [AddDetailsScreen] Error creating post: Failed to refresh auth token before upload
```

**Alert shown**: "Failed to refresh auth token before upload"

---

### Scenario 3: Upload Hangs (Deadlock)

```
➡️ BEFORE: uploadImage for image 1

[UPLOAD] 🔍 AUTH SNAPSHOT at upload time: { ... }
[UPLOAD] Storage path: users/.../posts/.../media_...jpg
[UPLOAD] Forcing token refresh before upload...
[UPLOAD] Token refreshed successfully. User: abc123...
[UPLOAD] UPLOAD AUTH UID: abc123...
[UPLOAD] Starting putFile upload...

(INFINITE LOADING - NEVER PRINTS ✅ AFTER)
```

**This means**: Firebase Storage upload is hanging (network/permissions issue)

---

### Scenario 4: Firestore Write Hangs

```
✅ AFTER: uploadImage for image 1 - URL: https://...

🟢 [AddDetailsScreen] Step 3: Creating Firestore document with ID: post_...
➡️ BEFORE: setDoc to Firestore

(INFINITE LOADING - NEVER PRINTS ✅ AFTER)
```

**This means**: Firestore write is hanging (network/permissions issue)

---

## 🔍 KEY INDICATORS

### Auth is Ready ✅
```
authReady: true
uid: "abc123..." (not null/undefined)
currentUser: FirebaseAuthTypes.User (not null)
```

### Auth is NOT Ready ❌
```
authReady: false
uid: undefined
currentUser: null
```

### Token is Valid ✅
```
[UPLOAD] Token refreshed successfully. User: abc123...
[UPLOAD] Has Token: true
```

### Upload is Working ✅
```
[UPLOAD] Progress: 25%
[UPLOAD] Progress: 50%
[UPLOAD] Progress: 75%
[UPLOAD] Progress: 100%
[UPLOAD] Upload complete, getting download URL...
```

---

## 🎯 WHAT TO REPORT

### If Upload Succeeds:
✅ "Upload successful! Auth verification working correctly."

### If Auth Not Ready:
❌ Share the `🔍 AUTH SNAPSHOT` log showing `authReady: false`

### If Token Refresh Fails:
❌ Share the `[UPLOAD ERROR] Failed to refresh token` log with error details

### If Upload Hangs:
❌ Note which `➡️ BEFORE` log appears but never gets a `✅ AFTER`

### If Firestore Write Hangs:
❌ Note that upload succeeded but Firestore write never completes

---

## 📱 TESTING STEPS

1. **Fresh Install** (uninstall → reinstall)
   - Open app
   - Navigate to Post screen
   - Wait for Post button to enable (gray spinner → "Post")
   - Press Post
   - **Watch console logs**

2. **Cold Start** (force quit → reopen)
   - Same as fresh install

3. **Warm Start** (app already open)
   - Navigate to Post screen
   - Post button should be immediately enabled
   - Press Post
   - **Watch console logs**

---

## 🚨 CRITICAL LOGS

These logs **MUST** appear for successful upload:

1. ✅ `🔍 AUTH SNAPSHOT: { authReady: true, uid: "..." }`
2. ✅ `✅ Auth token verified. User UID: ...`
3. ✅ `[UPLOAD] UPLOAD AUTH UID: ...`
4. ✅ `[UPLOAD] Token refreshed successfully`
5. ✅ `✅ AFTER: uploadImage for image 1`
6. ✅ `✅ AFTER: setDoc to Firestore`

If ANY of these are missing, report which one!
