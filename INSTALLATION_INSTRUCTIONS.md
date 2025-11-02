# Installation Instructions

## Required Dependencies

### 1. Install @react-native-community/blur

```bash
npm install @react-native-community/blur --save
```

### 2. iOS Setup (CocoaPods)

After installing the blur package, you need to install iOS pods:

```bash
cd ios
pod install
cd ..
```

### 3. Font Files Setup

Follow the instructions in `FONT_SETUP.md` to download and link Poppins fonts manually.

**Quick Steps:**
1. Download Poppins font files (Regular, Medium, SemiBold, Bold) from Google Fonts
2. Place them in `assets/fonts/` directory
3. Copy to `android/app/src/main/assets/fonts/`
4. For iOS, add fonts to Xcode project (see `FONT_SETUP.md` for details)

### 4. Rebuild Your App

After installing dependencies and fonts:

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## Verification Checklist

- [ ] `@react-native-community/blur` is installed
- [ ] iOS pods are installed (`cd ios && pod install`)
- [ ] Font files are in `assets/fonts/` directory
- [ ] Font files are copied to `android/app/src/main/assets/fonts/`
- [ ] Fonts are added to iOS project (Info.plist updated)
- [ ] App rebuilds successfully
- [ ] Blur effect appears on onboarding screens
- [ ] Custom back button with arrow icon appears
- [ ] Poppins font is applied throughout the app
- [ ] No font warnings in console

## Troubleshooting

### Blur not showing:
- Make sure you ran `pod install` for iOS
- Rebuild the app completely (clean build)

### Fonts not appearing:
- Verify font file names match exactly: `Poppins-Regular.ttf`, `Poppins-Medium.ttf`, `Poppins-SemiBold.ttf`, `Poppins-Bold.ttf`
- Clear build cache and rebuild
- Check that fonts are properly linked in both Android and iOS

### Build errors:
- For Android: `cd android && ./gradlew clean && cd ..`
- For iOS: Clean build folder in Xcode (Product > Clean Build Folder)

