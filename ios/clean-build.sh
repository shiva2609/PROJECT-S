#!/bin/bash
echo "🧹 Cleaning iOS build..."
cd "$(dirname "$0")"

# Kill Xcode
killall Xcode 2>/dev/null || true

# Remove build folder
rm -rf build

# Remove derived data for this project
rm -rf ~/Library/Developer/Xcode/DerivedData/Sanchari-*

# Reinstall pods to regenerate codegen files
echo "📦 Reinstalling pods..."
pod install

# Verify generated files
if [ -f "build/generated/ios/RCTAppDependencyProvider.h" ]; then
    echo "✅ RCTAppDependencyProvider.h exists"
else
    echo "❌ RCTAppDependencyProvider.h NOT found"
    exit 1
fi

echo "✅ Clean complete! Now open Xcode and build."
echo "   Run: open Sanchari.xcworkspace"
