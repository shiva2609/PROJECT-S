# Unclaimed Reward Notifications - Integration Guide

## Overview

This feature ensures that unclaimed rewards automatically appear in the Notifications screen, allowing users to claim them later even if they dismiss the initial popup.

## How It Works

### 1. Automatic Notification Creation

When a user becomes eligible for a reward (but hasn't claimed it):
- A notification is automatically created in Firestore
- The notification appears in the "Pending Actions" section
- The notification persists until the user claims the reward

### 2. Background Sync

- Periodic check (every 30 seconds) ensures unclaimed rewards have notifications
- If notification is missing, it's automatically created
- If reward is claimed, notification is marked as claimed

### 3. Claiming from Notification

- User taps reward notification
- Reward is automatically claimed
- Notification is marked as claimed and read
- User is navigated to Home screen

## Files Created/Updated

### New Files
1. **`src/api/rewardNotificationService.ts`**
   - Service for managing reward notifications
   - Functions: `createRewardNotification()`, `checkUnclaimedRewards()`, `markRewardNotificationAsClaimed()`

### Updated Files
2. **`src/hooks/useRewardOnboarding.ts`**
   - Creates notification when reward becomes eligible
   - Background check every 30 seconds
   - Marks notification as claimed when reward is claimed

3. **`src/screens/NotificationsScreen.tsx`**
   - Displays reward notifications with special styling
   - Handles reward claim from notification tap
   - Shows reward badge with points amount

## Firestore Schema

### Notification Document
```
notifications/{id} {
  userId: string,
  type: "reward",
  category: "pending_actions",
  title: "🎁 Unclaimed Reward",
  body: "You have an unclaimed reward of 150 Explorer Points waiting! Tap to claim it now.",
  read: boolean,
  isClaimed: boolean,
  points: number,
  createdAt: Timestamp,
  timestamp: number,
  actionUrl: "Home",
  metadata: {
    requiresAction: true,
    actionType: "claim_reward",
    rewardPoints: 150
  }
}
```

## Flow Diagram

```
User becomes eligible for reward
    ↓
Reward popup appears
    ↓
User dismisses popup (doesn't claim)
    ↓
Notification created in Firestore
    ↓
Notification appears in "Pending Actions"
    ↓
User taps notification
    ↓
Reward is claimed
    ↓
Notification marked as claimed
```

## Key Functions

### `checkUnclaimedRewards(userId, rewardClaimed)`
- Checks if reward is claimed
- If not claimed: ensures notification exists
- If claimed: marks notification as claimed

### `createRewardNotification(userId, points)`
- Creates notification in Firestore
- Prevents duplicates (checks for existing notification)
- Increments unread notification count

### `markRewardNotificationAsClaimed(userId, notificationId?)`
- Marks notification as claimed and read
- Can mark specific notification or all reward notifications for user

## UI Features

### Notification Display
- Special border color (brand primary) for reward notifications
- Reward badge showing points amount
- Appears in "Pending Actions" section
- Unread indicator (red dot)

### Claiming Flow
1. User taps reward notification
2. Notification marked as claimed
3. Reward granted via Firestore transaction
4. User navigated to Home screen
5. Success message shown

## Background Check

The hook includes a background check that runs every 30 seconds:
- Only runs if reward is not claimed
- Ensures notification exists
- Syncs reward status with notifications

## Console Logs

The implementation includes detailed console logs:
- `📝 Creating notification for unclaimed reward...`
- `🔄 Background check: Ensuring unclaimed reward has notification...`
- `🎁 Claiming reward from notification...`
- `✅ Reward notification(s) marked as claimed`

## Testing

### Test Scenario 1: Dismiss Popup
1. User becomes eligible for reward
2. Popup appears
3. User dismisses popup (closes without claiming)
4. **Expected**: Notification appears in Notifications screen

### Test Scenario 2: Claim from Notification
1. User has unclaimed reward notification
2. User opens Notifications screen
3. User taps reward notification
4. **Expected**: Reward is claimed, notification marked as claimed

### Test Scenario 3: Background Sync
1. User has unclaimed reward but no notification (edge case)
2. Wait 30 seconds
3. **Expected**: Notification is automatically created

## Offline Support

Currently uses Firestore (online). For offline support:
- Could add AsyncStorage fallback
- Store notifications locally when offline
- Sync when connection restored

## Notes

- Notifications are created automatically when reward becomes eligible
- Background check ensures sync even if initial creation fails
- Only one unclaimed reward notification per user (prevents duplicates)
- Notification persists until user claims the reward
- Claiming from notification works the same as claiming from popup

