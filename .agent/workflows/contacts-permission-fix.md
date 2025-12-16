# Contacts Permission Fix - Android & iOS

## Status: FIXED ✅

### Overview
Added missing contacts permission declarations for both Android and iOS platforms.

---

## Android Fix

### Problem
`READ_CONTACTS` permission was missing from AndroidManifest.xml, causing all permission requests to be automatically denied.

### Solution
Added to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- V1 FIX: Contacts permission required for find friends feature -->
<uses-permission android:name="android.permission.READ_CONTACTS" />
```

### Location
File: `android/app/src/main/AndroidManifest.xml`  
Lines: 7-8

### Rebuild Required
```bash
# Android requires full rebuild for manifest changes
yarn android
```

---

## iOS Status

### Already Configured ✅
iOS contacts permission was already properly declared in Info.plist:

```xml
<key>NSContactsUsageDescription</key>
<string>We need access to your contacts to help you find friends.</string>
```

### Location
File: `ios/Sanchari/Info.plist`  
Lines: 83-84

### No Action Needed
iOS is ready to go - no rebuild required for iOS.

---

## Platform Differences

### Android
- **Manifest Declaration**: `<uses-permission android:name="android.permission.READ_CONTACTS" />`
- **Runtime Request**: `PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS)`
- **Rebuild Required**: YES

### iOS
- **Info.plist Key**: `NSContactsUsageDescription`
- **Runtime Request**: `Contacts.requestPermissionsAsync()` (expo-contacts) or `Contacts.requestPermission()` (react-native-contacts)
- **Rebuild Required**: Only if Info.plist changed (already configured)

---

## How Permissions Work

### Two-Step Process (Both Platforms)

#### Step 1: Declare Permission
- **Android**: AndroidManifest.xml
- **iOS**: Info.plist

Without this, the OS will auto-deny any runtime request.

#### Step 2: Request at Runtime
- **Android**: `PermissionsAndroid.request()`
- **iOS**: `Contacts.requestPermissionsAsync()`

This shows the permission dialog to the user.

---

## Testing After Fix

### Android
1. **Rebuild app**: `yarn android`
2. **Uninstall old app** (optional but recommended)
3. **Tap "Find Friends"** button
4. **Tap "Allow"** in modal
5. **System permission dialog** should appear
6. **Grant permission**
7. **Contacts should be fetched**

### iOS
1. **Tap "Find Friends"** button
2. **Tap "Allow"** in modal
3. **System permission dialog** should appear
4. **Grant permission**
5. **Contacts should be fetched**

---

## Verification Checklist

### Android
✅ READ_CONTACTS permission in AndroidManifest.xml  
✅ Runtime request code implemented  
✅ Permission re-check after grant  
⏳ Rebuild required (yarn android)  

### iOS
✅ NSContactsUsageDescription in Info.plist  
✅ Runtime request code implemented  
✅ Permission re-check after grant  
✅ No rebuild needed (already configured)  

---

## Common Issues

### "Permission Denied" on Android
- **Cause**: Manifest permission missing OR app not rebuilt
- **Fix**: Add permission to manifest AND rebuild app

### "Permission Denied" on iOS
- **Cause**: Info.plist description missing
- **Fix**: Add NSContactsUsageDescription (already done)

### Permission Dialog Not Showing
- **Cause**: Permission already denied in system settings
- **Fix**: Go to Settings → Apps → Sanchari → Permissions → Enable Contacts

---

## Files Modified

| Platform | File | Change |
|----------|------|--------|
| Android | `android/app/src/main/AndroidManifest.xml` | Added READ_CONTACTS permission |
| iOS | `ios/Sanchari/Info.plist` | Already configured ✅ |

---

## Next Steps

1. **Rebuild Android app**: `yarn android`
2. **Test on Android device**
3. **Test on iOS device** (should already work)
4. **Verify contacts are fetched successfully**

The iOS side is already configured correctly. Only Android needs a rebuild.
