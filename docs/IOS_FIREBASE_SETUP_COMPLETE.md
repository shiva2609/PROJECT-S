# iOS Firebase Setup - Complete Guide

## ✅ What Has Been Configured Automatically

1. **Bundle Identifier Updated**: Changed from `org.reactjs.native.example.Sanchari` to `com.sanchari` to match Android
2. **Firebase Pods**: Already installed via React Native Firebase packages
3. **AppDelegate**: Configured with Firebase initialization
4. **Podfile**: Properly configured for React Native Firebase auto-linking

## 📋 Manual Steps Required in Firebase Console

### Step 1: Add iOS App to Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **sanchari-truetraveller** (Project ID: `893206677174`)
3. Click the gear icon ⚙️ next to "Project Overview" → **Project settings**
4. Scroll down to the "Your apps" section
5. Click **"Add app"** → Select **iOS** (🍎 icon)

### Step 2: Configure iOS App in Firebase

1. **Bundle ID**: Enter `com.sanchari` (must match the bundle identifier in Xcode)
2. **App nickname** (optional): Enter "Sanchari iOS"
3. **App Store ID** (optional): Leave blank for now
4. Click **"Register app"**

### Step 3: Download GoogleService-Info.plist

1. After registering, you'll see a download button for `GoogleService-Info.plist`
2. **Download the file** to your computer
3. **DO NOT** click "Next" yet - we'll add the file first

### Step 4: Add GoogleService-Info.plist to Xcode Project

**Important**: The file must be added to the Xcode project, not just copied to the folder!

1. **Copy the downloaded file** to: `/Users/chikky/Desktop/Sanchari/ios/Sanchari/GoogleService-Info.plist`
2. Open Xcode: `cd ios && open Sanchari.xcworkspace` (⚠️ Use `.xcworkspace`, NOT `.xcodeproj`)
3. In Xcode Project Navigator (left sidebar):
   - Right-click on the **"Sanchari"** folder (blue icon)
   - Select **"Add Files to Sanchari..."**
4. Navigate to and select `GoogleService-Info.plist`
5. **IMPORTANT**: Check these options:
   - ✅ **"Copy items if needed"** (should be checked)
   - ✅ **"Add to targets: Sanchari"** (MUST be checked)
6. Click **"Add"**
7. **Verify**: The file should appear in Project Navigator with a **blue icon** (not red/gray)

### Step 5: Continue Firebase Setup (Optional)

1. Go back to Firebase Console (where you downloaded the plist)
2. Click **"Next"** to continue
3. You can skip the "Add Firebase SDK" step (React Native Firebase handles this)
4. Click **"Next"** again
5. Click **"Continue to console"**

## 🔧 Firebase Services Configuration

### Authentication
- **Already enabled** for Android, so it's automatically available for iOS
- No additional setup needed

### Cloud Firestore
- **Already enabled** for Android, so it's automatically available for iOS
- No additional setup needed

### Firebase Storage
- **Already enabled** for Android, so it's automatically available for iOS
- No additional setup needed

### Push Notifications (FCM) - Optional
If you plan to use push notifications on iOS:

1. In Firebase Console → Project Settings → Cloud Messaging
2. **iOS Configuration**:
   - Upload your APNs Authentication Key (`.p8` file) OR
   - Upload your APNs Certificates (`.p12` files)
3. **To get APNs Key**:
   - Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
   - Create a new key with "Apple Push Notifications service (APNs)" enabled
   - Download the `.p8` file (only downloadable once!)
   - Note the Key ID and Team ID
   - Upload to Firebase Console

**Note**: Push notifications require:
- Apple Developer account ($99/year)
- Proper provisioning profiles
- APNs certificate/key

### Crashlytics - Optional
If you want crash reporting:

1. In Firebase Console → Project Settings → Integrations
2. Enable **Crashlytics** if not already enabled
3. No additional iOS-specific setup needed (React Native Firebase handles it)

## ✅ Verification Steps

After completing the manual steps above:

1. **Build the app**:
   ```bash
   cd ios
   pod install
   cd ..
   npx react-native run-ios
   ```

2. **Check Firebase connection**:
   - The app should initialize Firebase automatically
   - Check the console logs for any Firebase errors
   - Test authentication/login functionality

3. **Common Issues**:
   - **"GoogleService-Info.plist not found"**: Make sure the file is added to the Xcode target (blue icon, not red)
   - **Build errors**: Run `cd ios && pod install` again
   - **Bundle ID mismatch**: Verify bundle ID in Xcode matches `com.sanchari`

## 📝 Summary of Changes Made

### Files Modified:
1. `ios/Sanchari.xcodeproj/project.pbxproj` - Updated bundle identifier to `com.sanchari`

### Files That Need Manual Action:
1. `ios/Sanchari/GoogleService-Info.plist` - **YOU MUST DOWNLOAD AND ADD THIS FILE**

### Commands Run:
- `pod install` (will be run after you add GoogleService-Info.plist)

## 🎯 Next Steps

1. ✅ Complete the Firebase Console steps above
2. ✅ Download and add `GoogleService-Info.plist` to Xcode
3. ✅ Run `cd ios && pod install` (if not already done)
4. ✅ Test the app: `npx react-native run-ios`
5. ✅ Verify Firebase services work (auth, firestore, etc.)

## 📞 Need Help?

If you encounter issues:
- Check that `GoogleService-Info.plist` is in the Xcode project (blue icon)
- Verify bundle ID matches: `com.sanchari`
- Ensure you're opening `.xcworkspace`, not `.xcodeproj`
- Run `cd ios && pod install` if build fails
- Check Xcode build logs for specific errors

