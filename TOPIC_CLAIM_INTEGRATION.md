# Topic Claim Reminder Feature - Integration Guide

This guide explains how to integrate the Topic Claim Reminder feature that automatically sends notifications when a user hasn't claimed their topic before a deadline.

## Overview

The feature consists of:
- **Hook**: `useTopicClaimReminder` - Monitors topic claim status and triggers alerts
- **Component**: `TopicClaimAlert` - In-app alert prompt
- **Service**: `topicNotificationService` - Handles Firestore notifications and push notifications
- **Screen**: `NotificationsScreen` - Displays notifications with "Pending Actions" section

## Files Created

1. `src/hooks/useTopicClaimStatus.ts` - Hook to check topic claim status and deadline
2. `src/hooks/useTopicClaimReminder.ts` - Main hook combining status check with alerts/notifications
3. `src/components/TopicClaimAlert.tsx` - In-app alert component
4. `src/api/topicNotificationService.ts` - Notification service functions
5. `src/screens/NotificationsScreen.tsx` - Notifications screen with Pending Actions

## Firestore Schema

The feature expects the following structure in `users/{uid}`:

```typescript
{
  topicClaimed: boolean,           // true if user has claimed a topic
  topicClaimDeadline: Timestamp,   // Deadline for claiming topic (Firestore Timestamp)
  selectedTopic: string?           // The topic ID/name if claimed
}
```

### Setting a Deadline

To set a deadline for a user, update their document:

```typescript
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './api/authService';

// Set deadline to 7 days from now
const deadline = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

await updateDoc(doc(db, 'users', userId), {
  topicClaimDeadline: deadline,
  topicClaimed: false,
});
```

## Integration Steps

### 1. Add to HomeScreen (or any screen where you want to check)

```typescript
import { useTopicClaimReminder } from '../hooks/useTopicClaimReminder';
import TopicClaimAlert from '../components/TopicClaimAlert';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  
  // Add topic claim reminder hook
  const {
    showAlert,
    hasPassedDeadline,
    claimed,
    onClaimNow,
    onRemindLater,
    dismissAlert,
  } = useTopicClaimReminder(user?.uid, navigation);

  return (
    <SafeAreaView>
      {/* Your existing content */}
      
      {/* Topic Claim Alert */}
      <TopicClaimAlert
        visible={showAlert}
        onClaimNow={onClaimNow}
        onRemindLater={onRemindLater}
      />
    </SafeAreaView>
  );
}
```

### 2. Add Notifications Screen to Navigation

The Notifications screen has been added to `AppNavigator.tsx`. Make sure your navigation structure includes it.

### 3. Create TopicSelection Screen (if not exists)

The alert navigates to `'TopicSelection'`. Make sure this route exists in your navigation:

```typescript
// In AppNavigator.tsx or your navigation file
<Stack.Screen 
  name="TopicSelection" 
  component={TopicSelectionScreen}
  options={{ 
    headerShown: false,
    gestureEnabled: true,
  }}
/>
```

### 4. Mark Topic as Claimed

When a user selects a topic, update their Firestore document:

```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './api/authService';
import { removeTopicReminderNotification } from './api/topicNotificationService';

// When user claims a topic
await updateDoc(doc(db, 'users', userId), {
  topicClaimed: true,
  selectedTopic: topicId, // or topic name
});

// Remove reminder notifications
await removeTopicReminderNotification(userId);
```

## How It Works

### 1. Status Monitoring

- `useTopicClaimStatus` checks Firestore every minute for deadline status
- Uses real-time listener to detect changes immediately
- Calculates if deadline has passed

### 2. Alert Triggering

- When deadline passes and topic not claimed:
  - Creates Firestore notification
  - Triggers push notification (FCM or local)
  - Shows in-app alert (if `autoShowAlert` is true)

### 3. Notification Display

- Notifications appear in `NotificationsScreen`
- "Pending Actions" section shows unread topic reminders
- Tapping notification marks as read and navigates to TopicSelection

### 4. Topic Claimed

- When user claims topic:
  - Removes all topic reminder notifications
  - Hides alert
  - Updates status

## Push Notifications

### Firebase Cloud Messaging (FCM)

To enable FCM push notifications:

1. Install `@react-native-firebase/messaging`:
```bash
npm install @react-native-firebase/messaging
```

2. Store FCM token in user document:
```typescript
import messaging from '@react-native-firebase/messaging';

const token = await messaging().getToken();
await updateDoc(doc(db, 'users', userId), {
  fcmToken: token,
});
```

3. Update `topicNotificationService.ts` to use FCM backend (Cloud Functions recommended)

### Expo Notifications (Alternative)

If using Expo:

1. Install:
```bash
npx expo install expo-notifications
```

2. Request permissions:
```typescript
import * as Notifications from 'expo-notifications';

const { status } = await Notifications.requestPermissionsAsync();
```

The service already includes Expo Notifications fallback.

## Customization

### Change Alert Message

Edit `src/components/TopicClaimAlert.tsx`:
```typescript
<Text style={styles.title}>⚠️ Topic Not Claimed Yet!</Text>
<Text style={styles.message}>Your custom message here</Text>
```

### Change Notification Text

Edit `src/api/topicNotificationService.ts`:
```typescript
export async function createTopicReminderNotification(
  userId: string,
  title: string = '🧩 Your Custom Title',
  body: string = 'Your custom body text'
)
```

### Change Check Interval

In `useTopicClaimReminder`:
```typescript
const { ... } = useTopicClaimStatus(userId, 30000); // Check every 30 seconds
```

### Disable Auto-Show Alert

```typescript
const { ... } = useTopicClaimReminder(userId, navigation, false);
```

## Testing

### Manual Testing

1. Set a deadline in Firestore:
```typescript
const deadline = Timestamp.fromDate(new Date(Date.now() + 60000)); // 1 minute from now
await updateDoc(doc(db, 'users', userId), {
  topicClaimDeadline: deadline,
  topicClaimed: false,
});
```

2. Wait for deadline to pass
3. Verify:
   - Alert appears
   - Notification created in Firestore
   - Notification appears in Notifications screen
   - Push notification received (if configured)

### Test Notification Display

1. Navigate to Notifications screen
2. Verify "Pending Actions" section appears
3. Tap notification to mark as read
4. Verify navigation to TopicSelection

## Firestore Security Rules

Ensure your rules allow users to read their own notifications:

```javascript
match /notifications/{notificationId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow write: if request.auth != null && request.auth.uid == request.resource.data.userId;
}
```

## Troubleshooting

### Alert doesn't appear

1. Check if deadline has passed: `hasPassedDeadline` should be `true`
2. Check if topic is already claimed: `claimed` should be `false`
3. Check console logs for errors
4. Verify `autoShowAlert` is `true` (default)

### Notifications not showing

1. Check Firestore `notifications` collection
2. Verify `userId` matches current user
3. Check `category` is `'pending_actions'`
4. Verify `read` is `false`

### Push notifications not working

1. Check if FCM/Expo Notifications is properly configured
2. Verify permissions are granted
3. Check device token is stored in Firestore
4. For FCM, ensure backend/Cloud Functions are set up

### Deadline not detected

1. Verify `topicClaimDeadline` is a Firestore Timestamp
2. Check timestamp is in the future when setting
3. Verify real-time listener is active
4. Check console logs for status updates

## Example: Complete Integration

```typescript
// HomeScreen.tsx
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTopicClaimReminder } from '../hooks/useTopicClaimReminder';
import TopicClaimAlert from '../components/TopicClaimAlert';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  
  const {
    showAlert,
    onClaimNow,
    onRemindLater,
  } = useTopicClaimReminder(user?.uid, navigation);

  return (
    <SafeAreaView>
      {/* Your content */}
      
      <TopicClaimAlert
        visible={showAlert}
        onClaimNow={onClaimNow}
        onRemindLater={onRemindLater}
      />
    </SafeAreaView>
  );
}
```

## Notes

- The feature automatically checks every minute for deadline status
- Real-time listener updates immediately when Firestore changes
- Notifications persist until user claims topic or marks as read
- Push notifications require additional setup (FCM or Expo)
- All notifications are stored in Firestore for offline access

