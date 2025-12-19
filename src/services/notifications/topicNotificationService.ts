/**
 * Topic Notification Service
 * 
 * Handles creating and managing notifications related to topic claiming.
 * Creates Firestore notifications and triggers push notifications (FCM or local).
 */

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch
} from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import { incrementNotificationCount } from './notificationService';

// Notification types
export const NOTIFICATION_TYPE_TOPIC_REMINDER = 'topic_reminder';
export const NOTIFICATION_CATEGORY_PENDING_ACTIONS = 'pending_actions';

/**
 * Create a topic reminder notification in Firestore
 * 
 * @param userId - User ID to send notification to
 * @param title - Notification title
 * @param body - Notification body text
 * @returns Notification document ID
 */
export async function createTopicReminderNotification(
  userId: string,
  title: string = '🧩 Topic Available to Claim',
  body: string = 'You missed selecting your presentation topic. Tap to claim it before the slot closes!'
): Promise<string> {
  try {
    const notificationsRef = collection(db, 'notifications');

    const notificationData = {
      userId,
      type: NOTIFICATION_TYPE_TOPIC_REMINDER,
      category: NOTIFICATION_CATEGORY_PENDING_ACTIONS,
      title,
      body,
      read: false,
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
      actionUrl: 'TopicSelection', // Screen to navigate to
      metadata: {
        requiresAction: true,
        actionType: 'claim_topic',
      },
    };

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log('✅ Topic reminder notification created:', docRef.id);

    // Increment unread notification count
    await incrementNotificationCount(userId);

    // Trigger push notification (if available)
    await triggerTopicReminderPushNotification(userId, title, body);

    return docRef.id;
  } catch (error: any) {
    console.error('❌ Error creating topic reminder notification:', error);
    throw error;
  }
}

/**
 * Mark topic reminder notification as read or remove it
 * 
 * @param userId - User ID
 * @param notificationId - Optional specific notification ID, if not provided marks all topic reminders
 */
export async function markTopicReminderAsRead(
  userId: string,
  notificationId?: string
): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');

    if (notificationId) {
      // Mark specific notification
      const notificationRef = doc(notificationsRef, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    } else {
      // Mark all topic reminder notifications for this user
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('type', '==', NOTIFICATION_TYPE_TOPIC_REMINDER),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
        });
      });

      await batch.commit();
    }

    console.log('✅ Topic reminder notification(s) marked as read');
  } catch (error: any) {
    console.error('❌ Error marking topic reminder as read:', error);
    throw error;
  }
}

/**
 * Remove topic reminder notification when topic is claimed
 * 
 * @param userId - User ID
 */
export async function removeTopicReminderNotification(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', NOTIFICATION_TYPE_TOPIC_REMINDER)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('✅ Topic reminder notification(s) removed');
  } catch (error: any) {
    console.error('❌ Error removing topic reminder notification:', error);
    throw error;
  }
}

/**
 * Get pending action notifications (including topic reminders)
 * 
 * @param userId - User ID
 * @returns Array of pending action notifications
 */
export async function getPendingActionNotifications(userId: string): Promise<any[]> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('category', '==', NOTIFICATION_CATEGORY_PENDING_ACTIONS),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => {
      const timeA = a.timestamp || a.createdAt?.toMillis?.() || 0;
      const timeB = b.timestamp || b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    return notifications;
  } catch (error: any) {
    console.error('❌ Error getting pending action notifications:', error);
    return [];
  }
}

/**
 * Trigger push notification for topic reminder
 * Supports Firebase Cloud Messaging (FCM) with Expo fallback
 * 
 * @param userId - User ID
 * @param title - Notification title
 * @param body - Notification body
 */
async function triggerTopicReminderPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    // Try Firebase Cloud Messaging first
    try {
      // Check if @react-native-firebase/messaging is available
      const messaging = require('@react-native-firebase/messaging').default;

      // Get FCM token for user (you may need to store this in Firestore)
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        if (fcmToken) {
          // Send via FCM (requires backend or Cloud Functions)
          // For now, we'll use local notifications as fallback
          console.log('📱 FCM token found, but sending via local notification (backend required for FCM)');
        }
      }
    } catch (fcmError) {
      // FCM not available, use local notification
      console.log('📱 FCM not available, using local notification');
    }

    // Fallback: Use local notification (Expo Notifications or React Native's built-in)
    try {
      // Try Expo Notifications
      const Notifications = require('expo-notifications');

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: NOTIFICATION_TYPE_TOPIC_REMINDER,
            userId,
            actionUrl: 'TopicSelection',
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });

      console.log('✅ Local notification scheduled (Expo)');
    } catch (expoError) {
      // Expo Notifications not available, try React Native's Alert
      console.log('📱 Expo Notifications not available, using Alert fallback');
      // Note: Alert is synchronous and doesn't work as a background notification
      // In production, you should set up FCM properly
    }
  } catch (error: any) {
    console.error('❌ Error triggering push notification:', error);
    // Don't throw - notification creation in Firestore is the primary mechanism
  }
}

/**
 * Schedule a delayed reminder notification
 * 
 * @param userId - User ID
 * @param delayMinutes - Minutes to wait before showing notification
 */
export async function scheduleTopicReminderNotification(
  userId: string,
  delayMinutes: number = 30
): Promise<void> {
  try {
    // Store reminder request in Firestore
    const remindersRef = collection(db, 'topicReminders');
    await addDoc(remindersRef, {
      userId,
      scheduledFor: Timestamp.fromDate(new Date(Date.now() + delayMinutes * 60 * 1000)),
      createdAt: serverTimestamp(),
      sent: false,
    });

    console.log(`✅ Topic reminder scheduled for ${delayMinutes} minutes`);
  } catch (error: any) {
    console.error('❌ Error scheduling topic reminder:', error);
    throw error;
  }
}

