# GoogleService-Info.plist Setup Instructions

## IMPORTANT: Manual Step Required

You need to download and add the `GoogleService-Info.plist` file for iOS to complete Firebase setup.

## Steps:

1. **Download GoogleService-Info.plist from Firebase Console:**
   - Go to https://console.firebase.google.com/
   - Select your project: **sanchari-truetraveller** (Project ID: 893206677174)
   - Click on the iOS app (or create one if it doesn't exist)
   - Download the `GoogleService-Info.plist` file

2. **Place the file:**
   - Copy the downloaded `GoogleService-Info.plist` file to:
   - **Location:** `/Users/chikky/Desktop/Sanchari/ios/Sanchari/GoogleService-Info.plist`
   - Make sure it's in the `ios/Sanchari/` folder, alongside `Info.plist` and `AppDelegate.swift`

3. **Add to Xcode Project:**
   - Open `ios/Sanchari.xcworkspace` in Xcode (NOT the .xcodeproj file)
   - In Xcode, right-click on the `Sanchari` folder in the Project Navigator
   - Select "Add Files to Sanchari..."
   - Navigate to and select `GoogleService-Info.plist`
   - Make sure "Copy items if needed" is checked
   - Make sure "Add to targets: Sanchari" is checked
   - Click "Add"

4. **Verify the file is added:**
   - The file should appear in the Project Navigator under the `Sanchari` folder
   - It should have a blue icon (not red/gray)

## Bundle Identifier Note:
The iOS bundle identifier appears to be set to `org.reactjs.native.example.Sanchari`. When creating the iOS app in Firebase Console, make sure to use this bundle identifier, or update the bundle identifier in Xcode to match what you use in Firebase.

You can find/change the bundle identifier in Xcode:
- Select the project in Project Navigator
- Select the "Sanchari" target
- Go to "Signing & Capabilities" tab
- Check the "Bundle Identifier" field

