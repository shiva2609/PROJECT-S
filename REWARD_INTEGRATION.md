# Welcome Reward Pop Card - Integration Guide

This guide explains how to integrate the Welcome Reward Pop Card feature into your React Native app.

## Overview

The Welcome Reward Pop Card appears when a newly-registered user first lands on the Home screen and grants **150 Explorer Points**. The feature consists of:

- **Component**: `RewardPopCard.tsx` - Animated pop card UI
- **Hook**: `useRewardOnboarding.ts` - Firestore logic and state management
- **Integration**: Added to `HomeScreen.tsx`

## Files Created

1. `src/components/RewardPopCard.tsx` - The animated pop card component
2. `src/hooks/useRewardOnboarding.ts` - Hook managing reward logic
3. `src/__tests__/RewardPopCard.test.tsx` - Component test outline
4. `src/__tests__/useRewardOnboarding.test.ts` - Hook test outline

## Firestore Schema

The feature uses the following Firestore document structure:

```
users/{uid} {
  name: string,
  email: string,
  explorerPoints: number,   // default 0
  rewardClaimed: boolean    // default false
}
```

### Field Descriptions

- **explorerPoints** (number): Current Explorer Points balance. Defaults to `0` if not present.
- **rewardClaimed** (boolean): Flag indicating if the welcome reward has been claimed. Defaults to `false` if not present.

## Integration Steps

### 1. Already Integrated in HomeScreen

The reward card has been integrated into `HomeScreen.tsx`. The integration includes:

```typescript
import { useRewardOnboarding } from '../hooks/useRewardOnboarding';
import RewardPopCard from '../components/RewardPopCard';

// In component:
const {
  visible: rewardVisible,
  claimed,
  points,
  grantReward,
  dismiss: dismissReward,
} = useRewardOnboarding(user?.uid);

// Auto-grant reward when card becomes visible
useEffect(() => {
  if (rewardVisible && !claimed && user) {
    grantReward();
  }
}, [rewardVisible, claimed, user, grantReward]);

// Render card
<RewardPopCard
  visible={rewardVisible}
  onClose={dismissReward}
  onViewWallet={() => navigation.navigate('Explorer Wallet')}
  points={150}
/>
```

### 2. Integration in Other Screens (Optional)

If you want to show the reward card on a different screen, follow this pattern:

```typescript
import { useRewardOnboarding } from '../hooks/useRewardOnboarding';
import RewardPopCard from '../components/RewardPopCard';
import { useAuth } from '../contexts/AuthContext';

function YourScreen({ navigation }: any) {
  const { user } = useAuth();
  const {
    visible,
    claimed,
    grantReward,
    dismiss,
  } = useRewardOnboarding(user?.uid);

  // Auto-grant when visible
  useEffect(() => {
    if (visible && !claimed && user) {
      grantReward();
    }
  }, [visible, claimed, user, grantReward]);

  return (
    <View>
      {/* Your screen content */}
      
      <RewardPopCard
        visible={visible}
        onClose={dismiss}
        onViewWallet={() => navigation.navigate('Explorer Wallet')}
        points={150}
      />
    </View>
  );
}
```

## How It Works

### 1. Initial Check

When `useRewardOnboarding` is called with a user ID:
- It fetches the user document from Firestore
- Checks if `rewardClaimed` is `false`
- If not claimed, sets `visible` to `true`

### 2. Reward Granting

When the card becomes visible and reward is not claimed:
- The hook automatically calls `grantReward()`
- Uses Firestore `runTransaction` for atomic update:
  - Adds 150 to `explorerPoints`
  - Sets `rewardClaimed` to `true`
- Prevents race conditions with transaction isolation

### 3. User Interaction

- **Close Button**: Dismisses the card without claiming (if user closes before auto-grant)
- **Tap Outside**: Dismisses the card
- **View Wallet**: Navigates to Explorer Wallet screen and closes card

## Firestore Transaction Logic

The reward granting uses an atomic transaction to ensure data consistency:

```typescript
await runTransaction(db, async (transaction) => {
  const userDoc = await transaction.get(userDocRef);
  const userData = userDoc.data();
  
  // Check if already claimed (race condition protection)
  if (userData.rewardClaimed) {
    return; // Skip if already claimed
  }
  
  // Atomically update both fields
  transaction.update(userDocRef, {
    explorerPoints: (userData.explorerPoints ?? 0) + 150,
    rewardClaimed: true,
  });
});
```

## Testing

### Component Tests

Run component tests:
```bash
npm test -- RewardPopCard.test.tsx
```

Tests cover:
- Rendering states (visible/hidden)
- User interactions (close, view wallet)
- Accessibility labels
- Animation initialization

### Hook Tests

Run hook tests:
```bash
npm test -- useRewardOnboarding.test.ts
```

Tests cover:
- Initial state
- Reward status checking
- Transaction logic
- Error handling
- Race condition prevention

## Customization

### Change Reward Points

Update the constant in both files:
- `src/hooks/useRewardOnboarding.ts`: `const REWARD_POINTS = 150;`
- `src/components/RewardPopCard.tsx`: `const REWARD_POINTS = 150;`

### Customize Card Appearance

Edit styles in `src/components/RewardPopCard.tsx`:
- Colors: Use `Colors` from `../theme/colors`
- Fonts: Use `Fonts` from `../theme/fonts`
- Layout: Modify `styles` object

### Change Navigation Target

Update the `onViewWallet` prop in `HomeScreen.tsx`:
```typescript
onViewWallet={() => navigation.navigate('YourWalletScreen')}
```

## Error Handling

The hook includes error handling:
- Firestore connection errors are caught and logged
- Transaction failures revert optimistic updates
- Missing user documents are handled gracefully
- Network errors don't crash the app

## Accessibility

The component includes:
- `accessibilityRole` for buttons
- `accessibilityLabel` for screen readers
- `accessibilityHint` for user guidance
- Proper hit slop areas for touch targets

## Platform Support

- ✅ iOS
- ✅ Android
- Uses React Native's `Animated` API (no native dependencies)
- Safe area aware (works with notches/status bars)

## Troubleshooting

### Card doesn't appear

1. Check if user document exists in Firestore
2. Verify `rewardClaimed` is `false` or missing
3. Check console logs for errors
4. Ensure user is authenticated (`user?.uid` is not null)

### Points not updating

1. Check Firestore security rules allow updates to `users/{uid}`
2. Verify transaction is completing (check console logs)
3. Check network connectivity
4. Verify user has write permissions

### Card appears multiple times

1. Ensure `rewardClaimed` is being set to `true` in transaction
2. Check for race conditions (transaction should prevent this)
3. Verify hook is only called once per screen mount

## Security Rules

Ensure your Firestore security rules allow users to update their own document:

```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

## Notes

- The reward is granted automatically when the card becomes visible
- The card only shows once per user (tracked by `rewardClaimed`)
- Points update is atomic and resilient to race conditions
- UI updates optimistically and falls back to Firestore state on error

