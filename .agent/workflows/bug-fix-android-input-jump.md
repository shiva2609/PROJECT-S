# Bug Fix - Android Input Box Jump

## Issue
Input box jumps upward or feels unstable after sending a message on Android.

## Root Cause
Conflict between React Native's `KeyboardAvoidingView` with `behavior="height"` and Android's native `windowSoftInputMode="adjustResize"`.
Both were trying to resize the view when the keyboard appeared/disappeared, causing a visual "jump" or double-adjustment.

## Fix
Updated `ItineraryBuilderScreen.tsx` to disable `KeyboardAvoidingView` behavior on Android, allowing the native `adjustResize` to handle layout changes smoothly.

**Before:**
```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
>
```

**After:**
```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={0}
>
```

## Verification
- Confirmed `windowSoftInputMode="adjustResize"` in `AndroidManifest.xml`.
- Removed manual height behavior and offsets for Android.

## Status
**FIXED** ✅
