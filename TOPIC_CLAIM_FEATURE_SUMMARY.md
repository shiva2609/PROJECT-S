# Topic Claim Reminder Feature - Summary

## ✅ Complete Feature Implementation

A React Native feature that automatically sends notifications when a user hasn't claimed their presentation topic before a deadline.

## 📁 Files Created

### Hooks
1. **`src/hooks/useTopicClaimStatus.ts`**
   - Monitors topic claim status and deadline from Firestore
   - Real-time listener for immediate updates
   - Periodic checks every minute

2. **`src/hooks/useTopicClaimReminder.ts`**
   - Main hook combining status check with alert/notification logic
   - Triggers alerts and notifications when deadline passes
   - Handles user interactions (claim now, remind later)

### Components
3. **`src/components/TopicClaimAlert.tsx`**
   - In-app alert modal with warning icon
   - Two buttons: "Claim Now" and "Remind Me Later"
   - Accessible with proper labels

### Services
4. **`src/api/topicNotificationService.ts`**
   - Creates Firestore notifications
   - Triggers push notifications (FCM/Expo fallback)
   - Manages notification read/unread status
   - Removes notifications when topic is claimed

### Screens
5. **`src/screens/NotificationsScreen.tsx`**
   - Displays all notifications
   - Special "Pending Actions" section for topic reminders
   - Real-time updates
   - Tap to mark as read and navigate

### Integration
6. **`src/navigation/AppNavigator.tsx`** (updated)
   - Added Notifications screen route

7. **`src/screens/HomeScreen.tsx`** (updated)
   - Integrated topic claim reminder hook
   - Renders TopicClaimAlert component

## 🎯 Features Implemented

### ✅ In-App Alert
- Shows when deadline passes without topic claim
- Title: "⚠️ Topic Not Claimed Yet!"
- Message: "You haven't selected your presentation topic. Please claim your topic before others take it."
- Buttons:
  - **"Claim Now"** → Navigates to TopicSelection screen
  - **"Remind Me Later"** → Dismisses and schedules reminder

### ✅ Push Notifications
- **Title**: "🧩 Topic Available to Claim"
- **Body**: "You missed selecting your presentation topic. Tap to claim it before the slot closes!"
- Supports Firebase Cloud Messaging (FCM)
- Fallback to Expo Notifications
- Local notification fallback

### ✅ Notification Screen
- "Pending Actions" section for unread topic reminders
- Shows timestamp and unread status
- Tap to mark as read and navigate
- Real-time updates from Firestore

### ✅ Automatic Monitoring
- Checks deadline status every minute
- Real-time listener for immediate updates
- Automatically triggers notifications when deadline passes
- Removes notifications when topic is claimed

## 🔧 Firestore Schema

```typescript
users/{uid} {
  topicClaimed: boolean,           // true if claimed
  topicClaimDeadline: Timestamp,   // Deadline (Firestore Timestamp)
  selectedTopic: string?            // Topic ID/name if claimed
}

notifications/{id} {
  userId: string,
  type: 'topic_reminder',
  category: 'pending_actions',
  title: string,
  body: string,
  read: boolean,
  createdAt: Timestamp,
  timestamp: number,
  actionUrl: 'TopicSelection',
  metadata: {
    requiresAction: true,
    actionType: 'claim_topic'
  }
}
```

## 🚀 Usage

### Basic Integration (Already Done in HomeScreen)

```typescript
import { useTopicClaimReminder } from '../hooks/useTopicClaimReminder';
import TopicClaimAlert from '../components/TopicClaimAlert';

const { showAlert, onClaimNow, onRemindLater } = useTopicClaimReminder(user?.uid, navigation);

<TopicClaimAlert
  visible={showAlert}
  onClaimNow={onClaimNow}
  onRemindLater={onRemindLater}
/>
```

### Set a Deadline

```typescript
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './api/authService';

const deadline = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days

await updateDoc(doc(db, 'users', userId), {
  topicClaimDeadline: deadline,
  topicClaimed: false,
});
```

### Mark Topic as Claimed

```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { removeTopicReminderNotification } from './api/topicNotificationService';

await updateDoc(doc(db, 'users', userId), {
  topicClaimed: true,
  selectedTopic: topicId,
});

await removeTopicReminderNotification(userId);
```

## 📱 Push Notification Setup

### Option 1: Firebase Cloud Messaging (Recommended)

1. Install:
```bash
npm install @react-native-firebase/messaging
```

2. Store FCM token:
```typescript
import messaging from '@react-native-firebase/messaging';
const token = await messaging().getToken();
await updateDoc(doc(db, 'users', userId), { fcmToken: token });
```

3. Set up Cloud Functions or backend to send FCM messages

### Option 2: Expo Notifications

1. Install:
```bash
npx expo install expo-notifications
```

2. Request permissions:
```typescript
import * as Notifications from 'expo-notifications';
const { status } = await Notifications.requestPermissionsAsync();
```

The service already includes Expo fallback.

## 🧪 Testing

1. Set a deadline 1 minute in the future
2. Wait for deadline to pass
3. Verify:
   - Alert appears
   - Notification created in Firestore
   - Notification appears in Notifications screen
   - Push notification received (if configured)

## 📝 Notes

- All code is TypeScript with proper types
- Real-time Firestore listeners for immediate updates
- Handles edge cases (missing documents, errors, etc.)
- Accessible with proper labels and hints
- Modular design for easy customization
- No external date library dependencies (uses native Date)

## 🔗 Related Documentation

- See `TOPIC_CLAIM_INTEGRATION.md` for detailed integration guide
- See individual file comments for API documentation

