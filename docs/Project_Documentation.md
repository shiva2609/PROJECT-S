---
title: Sanchari App Documentation
author: Pranitha Reddy
version: 1.0.0
lastUpdated: 2025-11-05
description: Complete documentation for the Sanchari React Native travel app, covering setup, features, and architecture.
keywords: Sanchari, React Native, Firebase, iOS, Android, Travel App
---

# Sanchari – Project Documentation

## Overview
Sanchari is a React Native application built with React 19 and React Native 0.82, using Redux Toolkit for state management and React Navigation for app navigation. The app integrates Firebase (Auth, Firestore, Storage) and includes KYC-related flows, role upgrades, and content creation screens.

## Tech Stack
- React 19 / React Native 0.82
- TypeScript
- Redux Toolkit and React Redux
- React Navigation (bottom tabs, native stack)
- Firebase via `@react-native-firebase/*`
- Additional libs: Axios, Day.js, Lodash, Reanimated, Gesture Handler, Vector Icons, SVG, Linear Gradient, Image Picker, Video

## Repository Structure
```
Sanchari/
  index.js                 // Entry: registers `src/App`
  app.json                 // App name/id
  android/                 // Android native project
  ios/                     // iOS native project
  src/                     // Application source code
    api/                   // API clients and Firebase services
    components/            // Reusable UI components
    config/                // App configuration (roles metadata)
    constants/             // Constants like verification templates
    contexts/              // React context providers (e.g., Auth)
    hooks/                 // Custom hooks (e.g., KYC manager)
    navigation/            // React Navigation navigators
    screens/               // Screen components (Auth, KYC, Dashboard, etc.)
    services/              // Business logic helpers (e.g., role requirements)
    store/                 // Redux store setup
    theme/                 // Colors, fonts
    types/                 // Shared TypeScript types
    utils/                 // Utility functions and helpers
  docs/                    // Project documentation (this file and others)
```

## Key Files
- `index.js`: Registers the root component from `src/App`.
- `src/App.tsx`: Wraps the app with Redux `Provider` and `AuthProvider` and renders `AppNavigator`.
- `src/navigation/AppNavigator.tsx`: Root navigation setup (stacks/tabs).
- `src/store/index.ts`: Redux store configuration.
- `src/api/*`: API clients and Firebase service wrappers.
- `src/contexts/AuthContext.tsx`: Authentication context provider.

## Setup and Installation
### Prerequisites
- Node.js >= 20
- Xcode (for iOS), Android Studio (for Android)
- CocoaPods installed (`gem install cocoapods`)

### Install Dependencies
```bash
# From repo root
yarn install
# or npm install
```

### iOS Setup
- Ensure `ios/GoogleService-Info.plist` is present (Firebase). See `docs/GOOGLESERVICE-INFO-SETUP.md` and iOS Firebase docs in `docs/`.
- Install pods:
```bash
cd ios && pod install && cd ..
```

### Android Setup
- Ensure `android/app/google-services.json` is present (Firebase).
- Android SDK/NDK configured via Android Studio.

## Running the App
```bash
# Start Metro
yarn start
# Run Android
yarn android
# Run iOS (iPhone Simulator)
yarn ios
```

If you encounter caching issues:
```bash
yarn start:clean
```

## Build for Release
### Android (Release APK/AAB)
- Configure signing configs in `android/app/build.gradle`.
- Build:
```bash
cd android && ./gradlew assembleRelease
# or bundle:
./gradlew bundleRelease
cd ..
```

### iOS (Release)
- Open `ios/Sanchari.xcworkspace` in Xcode.
- Select a Generic iOS Device and Product > Archive.

## Firebase Integration Notes
- Uses `@react-native-firebase/app`, `auth`, `firestore`, `storage`.
- iOS requires `GoogleService-Info.plist` in `ios/Sanchari/` and URL schemes set in Info.
- Android requires `google-services.json` in `android/app/` and `com.google.gms.google-services` plugin applied.
- App Check/Recaptcha may be configured per docs in `docs/`.

## Permissions
- Camera / Photo Library: for image/video upload (via `react-native-image-picker`).
- Network: for API and Firebase.
- iOS: Update Info.plist with usage descriptions if adding new features.

## Dependency Summary (from package.json)
- Core: React 19.1.1, React Native 0.82.1, TypeScript 5.x
- Navigation: `@react-navigation/*`, gesture-handler, reanimated, screens, safe-area-context
- State: `@reduxjs/toolkit`, `react-redux`
- Firebase: `@react-native-firebase/app|auth|firestore|storage`
- UI/Media: `react-native-vector-icons`, `react-native-svg`, `react-native-linear-gradient`, `react-native-video`, `moti`
- Utilities: Axios, Day.js, Lodash, Async Storage

## Folder Details
- `src/screens/`: App screens (Auth flow, Dashboard, KYC, Admin verification, Profile, Create, Explore, Trips, etc.). Assets under `src/screens/assets/`.
- `src/utils/`: Helpers for formatting, validation, Firebase utilities, etc.
- `src/services/roleRequirements.ts`: Encodes role upgrade requirements.
- `src/constants/verificationTemplates.ts`: Predefined templates for verification.
- `src/theme/colors.ts` and `src/theme/fonts.ts`: Design tokens.

## Testing
- Jest is configured. Tests live under `__tests__` folders.
- Run tests:
```bash
yarn test
```

## Troubleshooting
- Metro cache issues: `yarn start:clean`
- iOS pods issues: `cd ios && pod install --repo-update`
- Android build issues: `cd android && ./gradlew clean`

## Changelog and Additional Docs
See `docs/README.md` for all setup guides, implementation summaries, and checklists.
