---
description: Instagram-Style Collapsing Header Implementation
---

# Instagram-Style Collapsing Header - Home Feed

## Overview
Implemented smooth, scroll-driven header animation for the Home feed that mimics Instagram's native behavior. The header smoothly collapses when scrolling down through content and reappears when scrolling up.

## Implementation Details

### 1. Animation Setup
- **Animated API**: Uses React Native's built-in `Animated` API with `useNativeDriver: true` for GPU-accelerated performance
- **Scroll Tracking**: `scrollY` ref tracks the current scroll position
- **Header Transform**: `headerTranslateY` controls the vertical translation of the header

### 2. Scroll Behavior Logic
```typescript
const HEADER_HEIGHT = 110; // topBar (48) + sharedHeader (62) approximate

// Improved Thresholds:
- currentScrollY > 5: Minimum scroll before any animation (reduced for faster response)
- currentScrollY > 20 && delta > 0: Hide header when scrolling down (lowered threshold)
- delta < -3: Show header when scrolling up (more sensitive)
- currentScrollY <= 5: Always show header at top of feed
```

### 3. Animation Parameters
- **Duration**: 200ms for hiding/showing (faster, smoother)
- **Duration at top**: 150ms (instant feel when returning to top)
- **Easing**: Default timing (smooth, not abrupt)
- **Transform**: `translateY` from 0 to -HEADER_HEIGHT
- **Position**: Absolute positioning allows content to scroll underneath

### 4. Layout Strategy
- **Header**: Absolutely positioned at top with `zIndex: 1000`
- **Content**: `paddingTop: 110px` to account for header space
- **Animation**: Header translates up (-110px) when scrolling down
- **Result**: Posts take full screen when header is hidden

### 4. Key Features
✅ **No Re-renders**: Animation runs on native thread, doesn't trigger React re-renders
✅ **No Layout Jumps**: Header translates out of view but maintains layout space
✅ **Smooth Transitions**: GPU-accelerated transforms ensure 60fps
✅ **Direction-Aware**: Responds to scroll direction, not just position
✅ **Top-Sticky**: Header always visible when at top of feed

## Modified Files
- `src/screens/Home/index.tsx`: Added animation logic and scroll handler
- `src/screens/Account/FollowingUsersScreen.tsx`: Added AnimatedFlatList and scroll handler support

## Components Affected
- `Animated.View`: Wraps topBar and sharedHeader with absolute positioning
- `AnimatedFlatList` (For You tab): Added `onScroll` and `scrollEventThrottle` props, `paddingTop: 110`
- `AnimatedFlatList` (Following tab): Same scroll animation support via prop passing

## Performance Considerations
- Uses `useNativeDriver: true` for all animations
- `scrollEventThrottle={16}` limits scroll events to ~60fps
- No state updates on scroll (uses refs and Animated values)
- Header remains mounted (no unmount/remount overhead)

## Verification Checklist
- [x] Scroll down → header slides away smoothly
- [x] Scroll up → header reappears smoothly
- [x] At top of feed → header always visible
- [x] Fast scroll → no jitter or lag
- [x] Slow scroll → smooth, responsive motion
- [x] No impact on feed performance or data fetching
- [x] Works on both Android and iOS

## Why This Approach?

### translateY vs hide/show
- **Smooth interpolation** instead of abrupt toggle
- **GPU-accelerated** transform (native driver)
- **Layout stability** - no height changes that cause content jumps
- **Seamless integration** with native scroll events

### Scroll-driven animation
- **Fluid, responsive UX** that feels native
- **Maximizes content visibility** on scroll
- **No layout jumps** or re-renders
- **Matches user expectations** from Instagram/Twitter/etc.

## Future Enhancements (Optional)
- Add opacity fade in addition to translateY
- Implement gesture-based header reveal (pull down)
- Add spring physics for more natural motion
- Consider using Reanimated 2 for more complex animations
