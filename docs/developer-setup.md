---
title: Sanchari Developer Setup
author: Pranitha Reddy
version: 1.0.0
lastUpdated: 2025-11-05
description: Step-by-step setup guide for Sanchari (React Native, Firebase, iOS & Android).
keywords: Developer Setup, React Native, Firebase, iOS, Android, Pods
---

# Developer Setup

## Prerequisites
- Node.js >= 20
- Xcode (macOS) for iOS
- Android Studio for Android
- CocoaPods: `gem install cocoapods`

## Install Dependencies
```bash
yarn install
# or
npm install
```

## Firebase Configuration
- iOS: place `ios/Sanchari/GoogleService-Info.plist` (see `docs/GOOGLESERVICE-INFO-SETUP.md`)
- Android: place `android/app/google-services.json`

## iOS Setup
```bash
cd ios
pod install
cd ..
```

## Android Setup
- Open Android Studio to ensure SDKs are installed
- Ensure an emulator or device is connected

## Run the App
```bash
yarn start          # start Metro
yarn android        # run on Android
yarn ios            # run on iOS simulator
```

If caching issues occur:
```bash
yarn start:clean
```

## Environment Variables (example)
- API base URL
- Feature flags
- Firebase environment (if needed)

## Troubleshooting
- iOS pods: `cd ios && pod install --repo-update`
- Android build: `cd android && ./gradlew clean`
- Vector icons linking: ensure `react-native-vector-icons` is properly autolinked


