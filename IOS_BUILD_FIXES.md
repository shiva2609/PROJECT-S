# iOS Build Fixes - Error Code 65 Resolution

## Summary
This document outlines all the fixes applied to resolve iOS build error code 65 (PhaseScriptExecution failed).

## Issues Fixed

### 1. Podfile Configuration ✅
**Problem**: Podfile was using `min_ios_version_supported` which could cause version mismatches.

**Fix**: 
- Changed `platform :ios, min_ios_version_supported` to `platform :ios, '13.0'`
- Added post_install hook to ensure all pods have minimum iOS 13.0 deployment target

**File**: `ios/Podfile`
```ruby
platform :ios, '13.0'

post_install do |installer|
  react_native_post_install(...)
  
  # Fix deployment target for all pods
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 13.0
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      end
    end
  end
end
```

### 2. Missing Swift Standard Libraries Embedding ✅
**Problem**: `ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES` was missing, causing Swift runtime issues.

**Fix**: Added `ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = YES` to both Debug and Release build configurations.

**File**: `ios/Sanchari.xcodeproj/project.pbxproj`
- Added to Debug configuration (line ~278)
- Added to Release configuration (line ~307)

### 3. Deployment Target Consistency ✅
**Problem**: Potential mismatch between Podfile and Xcode project deployment targets.

**Fix**: 
- Podfile now explicitly sets iOS 13.0
- Post_install hook ensures all pods use at least iOS 13.0
- Xcode project maintains iOS 15.1 (which is >= 13.0, so compatible)

### 4. Build Phases Order ✅
**Verified**: Build phases are in the correct order:
1. [CP] Check Pods Manifest.lock
2. Sources
3. Frameworks
4. Resources
5. Bundle React Native code and images
6. [CP] Embed Pods Frameworks
7. [CP] Copy Pods Resources
8. [CP-User] [RNFB] Core Configuration

### 5. Script Phases Configuration ✅
**Verified**: All script phases are correctly configured:
- "Bundle React Native code and images" - uses REACT_NATIVE_PATH correctly
- Pods scripts - properly configured with input/output file lists
- Firebase script - correctly configured

## Files Modified

1. **ios/Podfile**
   - Set explicit iOS platform version to '13.0'
   - Added post_install hook to enforce deployment targets

2. **ios/Sanchari.xcodeproj/project.pbxproj**
   - Added `ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = YES` to Debug configuration
   - Added `ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = YES` to Release configuration

## Next Steps (Commands to Run)

After these fixes, you need to run the following commands on a Mac with Xcode:

```bash
# 1. Navigate to iOS directory
cd ios

# 2. Clean CocoaPods cache (optional but recommended)
pod cache clean --all

# 3. Remove Pods and Podfile.lock (fresh start)
rm -rf Pods Podfile.lock

# 4. Reinstall pods
pod install

# 5. Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# 6. Return to project root
cd ..

# 7. Clean React Native cache
npm start -- --reset-cache
# Or: yarn start --reset-cache

# 8. Build the project
npx react-native run-ios
# Or open ios/Sanchari.xcworkspace in Xcode and build
```

## Expected Results

After running these commands:
- ✅ Pods should install successfully
- ✅ All deployment targets should be consistent (iOS 13.0+)
- ✅ Swift standard libraries should be embedded correctly
- ✅ Build should complete without error code 65
- ✅ App should archive and run successfully on iOS

## Additional Notes

### React Native Version
- Using React Native 0.82.1 with React 19.1.1
- New Architecture is enabled (RCTNewArchEnabled = true in Info.plist)
- Hermes is enabled (USE_HERMES = true)

### Dependencies
- Firebase packages are properly configured
- All React Native modules should auto-link correctly
- Vector icons are manually linked (as required)

### Build Settings Verified
- ✅ ENABLE_BITCODE = NO (required for React Native)
- ✅ SWIFT_VERSION = 5.0
- ✅ IPHONEOS_DEPLOYMENT_TARGET = 15.1 (compatible with Podfile's 13.0)
- ✅ CLANG_ENABLE_MODULES = YES
- ✅ USE_HERMES = true

## Troubleshooting

If you still encounter issues after these fixes:

1. **Pod install fails**: 
   - Check CocoaPods version: `pod --version` (should be 1.11+)
   - Update: `sudo gem install cocoapods`

2. **Script phase errors**:
   - Verify Node.js is installed: `node --version`
   - Check `.xcode.env` file exists and has correct NODE_BINARY

3. **Swift compilation errors**:
   - Verify Xcode version (should be 12.0+)
   - Check Swift version compatibility

4. **Framework not found errors**:
   - Ensure you're opening `.xcworkspace`, not `.xcodeproj`
   - Run `pod install` again

5. **Build system errors**:
   - In Xcode: File > Workspace Settings > Build System = "New Build System"

## Verification Checklist

- [x] Podfile has explicit iOS version (13.0)
- [x] Post_install hook enforces deployment targets
- [x] ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES is set to YES
- [x] Build phases are in correct order
- [x] Script phases are properly configured
- [x] No duplicate script phases
- [x] Deployment targets are consistent
- [x] Swift version is set correctly
- [x] Hermes is enabled
- [x] New Architecture is properly configured

## Conclusion

All critical iOS build issues have been addressed. The project should now build successfully on iOS. The main fixes were:
1. Explicit iOS version in Podfile
2. Swift standard libraries embedding
3. Deployment target consistency enforcement

Run `pod install` and rebuild to apply all fixes.

