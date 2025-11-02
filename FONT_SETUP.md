# Poppins Font Setup Guide

This guide will help you manually link Poppins fonts for React Native CLI.

## Step 1: Download Poppins Font Files

Download the following font files from [Google Fonts](https://fonts.google.com/specimen/Poppins) or use the direct download links:

- Poppins-Regular.ttf
- Poppins-Medium.ttf
- Poppins-SemiBold.ttf
- Poppins-Bold.ttf

## Step 2: Place Font Files

1. Copy all 4 `.ttf` files to `assets/fonts/` directory (already created)

## Step 3: Link Fonts for Android

1. Copy the font files to Android assets:
   - Copy all `.ttf` files from `assets/fonts/` to `android/app/src/main/assets/fonts/`

2. The fonts are now linked for Android. Rebuild your app:
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

## Step 4: Link Fonts for iOS

### Option A: Using Xcode (Recommended)

1. Open `ios/Sanchari.xcworkspace` in Xcode
2. Right-click on the `Sanchari` folder in the project navigator
3. Select "Add Files to Sanchari..."
4. Navigate to `assets/fonts/` and select all 4 `.ttf` files
5. Make sure "Copy items if needed" is checked
6. Make sure "Create groups" is selected
7. Click "Add"

### Option B: Using Info.plist

1. Open `ios/Sanchari/Info.plist`
2. Add the following key under the root `<dict>` tag:
   ```xml
   <key>UIAppFonts</key>
   <array>
     <string>Poppins-Regular.ttf</string>
     <string>Poppins-Medium.ttf</string>
     <string>Poppins-SemiBold.ttf</string>
     <string>Poppins-Bold.ttf</string>
   </array>
   ```

3. Copy font files to iOS project:
   - Copy all `.ttf` files from `assets/fonts/` to `ios/Sanchari/` directory

## Step 5: Rebuild the App

After linking fonts:

**For Android:**
```bash
npm run android
```

**For iOS:**
```bash
cd ios && pod install && cd ..
npm run ios
```

## Step 6: Verify Fonts Are Working

Run the app and check if Poppins fonts are applied. You should see no font warnings in the console.

## Troubleshooting

- If fonts don't appear, make sure the font file names exactly match what's in `GlobalStyles.ts`:
  - Poppins-Regular
  - Poppins-Medium
  - Poppins-SemiBold
  - Poppins-Bold

- Clear build cache:
  - Android: `cd android && ./gradlew clean && cd ..`
  - iOS: Clean build folder in Xcode (Product > Clean Build Folder)

- Make sure the font files are actual `.ttf` files, not `.otf` or other formats.

