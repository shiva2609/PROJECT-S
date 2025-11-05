# GoogleService-Info.plist Setup Instructions

## ⚠️ IMPORTANT: Manual Step Required

You need to download and add the `GoogleService-Info.plist` file for iOS to complete Firebase setup.

## 📋 Quick Steps:

### 1. Add iOS App to Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **sanchari-truetraveller**
3. Click gear icon ⚙️ → **Project settings**
4. Scroll to "Your apps" → Click **"Add app"** → Select **iOS**
5. **Bundle ID**: Enter `com.sanchari`
6. Click **"Register app"**

### 2. Download GoogleService-Info.plist
1. Click the download button for `GoogleService-Info.plist`
2. Save the file to your Downloads folder

### 3. Add to Xcode Project (CRITICAL STEP)
**⚠️ The file MUST be added to the Xcode project, not just copied to the folder!**

1. **Copy the file** to: `/Users/chikky/Desktop/Sanchari/ios/Sanchari/GoogleService-Info.plist`
2. **Open Xcode**: 
   ```bash
   cd ios && open Sanchari.xcworkspace
   ```
   ⚠️ Use `.xcworkspace`, NOT `.xcodeproj`!
3. In Xcode Project Navigator (left sidebar):
   - Right-click on the **"Sanchari"** folder (blue icon)
   - Select **"Add Files to Sanchari..."**
4. Navigate to and select `GoogleService-Info.plist`
5. **IMPORTANT**: Check these options:
   - ✅ **"Copy items if needed"** 
   - ✅ **"Add to targets: Sanchari"** (MUST be checked!)
6. Click **"Add"**

### 4. Verify
- The file should appear in Project Navigator with a **blue icon** (not red/gray)
- If it's red, it's not added to the target - right-click → "Add Files to Sanchari..." again

## Bundle Identifier
The iOS bundle identifier has been updated to **`com.sanchari`** to match Android. Use this exact bundle ID when creating the iOS app in Firebase Console.

You can verify the bundle identifier in Xcode:
- Select the project in Project Navigator
- Select the "Sanchari" target
- Go to "Signing & Capabilities" tab
- Check the "Bundle Identifier" field (should be `com.sanchari`)

## 📖 See `IOS_FIREBASE_SETUP_COMPLETE.md` for detailed instructions

