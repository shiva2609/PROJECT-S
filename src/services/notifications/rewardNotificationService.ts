/**
 * Reward Notification Service
 * 
 * Handles creating and managing notifications for unclaimed rewards.
 * Creates Firestore notifications when rewards are eligible but not claimed.
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
} from 'firebase/firestore';
import { db } from '../auth/authService';
import { incrementNotificationCount } from './notificationService';

// Notification types
export const NOTIFICATION_TYPE_REWARD = 'reward';
export const NOTIFICATION_CATEGORY_PENDING_ACTIONS = 'pending_actions';

/**
 * Create a reward notification in Firestore for unclaimed rewards
 * 
 * @param userId - User ID to send notification to
 * @param points - Number of points in the reward
 * @returns Notification document ID
 */
export async function createRewardNotification(
  userId: string,
  points: number = 150
): Promise<string | null> {
  try {
    // Check if notification already exists for this user
    const existingNotification = await getExistingRewardNotification(userId);
    if (existingNotification) {
      console.log('✅ Reward notification already exists, skipping creation');
      return existingNotification.id;
    }

    const notificationsRef = collection(db, 'notifications');
    
    const notificationData = {
      userId,
      type: NOTIFICATION_TYPE_REWARD,
      category: NOTIFICATION_CATEGORY_PENDING_ACTIONS,
      title: '🎁 Unclaimed Reward',
      body: `You have an unclaimed reward of ${points} Explorer Points waiting! Tap to claim it now.`,
      read: false,
      isClaimed: false, // Track if reward is claimed
      points, // Store points amount
      createdAt: serverTimestamp(),
      timestamp: Date.now(),
      actionUrl: 'Home', // Screen to navigate to (where reward modal is)
      metadata: {
        requiresAction: true,
        actionType: 'claim_reward',
        rewardPoints: points,
      },
    };

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log('✅ Reward notification created:', docRef.id);

    // Increment unread notification count
    await incrementNotificationCount(userId);

    return docRef.id;
  } catch (error: any) {
    console.error('❌ Error creating reward notification:', error);
    return null;
  }
}

/**
 * Get existing reward notification for a user
 * 
 * @param userId - User ID
 * @returns Existing notification document or null
 */
export async function getExistingRewardNotification(userId: string): Promise<any | null> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', NOTIFICATION_TYPE_REWARD),
      where('isClaimed', '==', false)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    
    // Return the first unclaimed reward notification
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error: any) {
    console.error('❌ Error getting existing reward notification:', error);
    return null;
  }
}

/**
 * Mark reward notification as claimed and read
 * 
 * @param userId - User ID
 * @param notificationId - Optional specific notification ID
 */
export async function markRewardNotificationAsClaimed(
  userId: string,
  notificationId?: string
): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');
    
    if (notificationId) {
      // Mark specific notification
      const notificationRef = doc(notificationsRef, notificationId);
      await updateDoc(notificationRef, {
        isClaimed: true,
        read: true,
        readAt: serverTimestamp(),
        claimedAt: serverTimestamp(),
      });
    } else {
      // Mark all unclaimed reward notifications for this user
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('type', '==', NOTIFICATION_TYPE_REWARD),
        where('isClaimed', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = await import('firebase/firestore').then(m => m.writeBatch(db));
      
      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          isClaimed: true,
          read: true,
          readAt: serverTimestamp(),
          claimedAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
    }

    console.log('✅ Reward notification(s) marked as claimed');
  } catch (error: any) {
    console.error('❌ Error marking reward notification as claimed:', error);
    throw error;
  }
}

/**
 * Remove reward notification when reward is claimed
 * 
 * @param userId - User ID
 */
export async function removeRewardNotification(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', NOTIFICATION_TYPE_REWARD),
      where('isClaimed', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = await import('firebase/firestore').then(m => m.writeBatch(db));
    
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isClaimed: true,
        read: true,
        readAt: serverTimestamp(),
      });
    });
    
    await batch.commit();
    console.log('✅ Reward notification(s) marked as claimed and read');
  } catch (error: any) {
    console.error('❌ Error removing reward notification:', error);
    throw error;
  }
}

/**
 * Check for unclaimed rewards and ensure they have notifications
 * Background check function to sync rewards with notifications
 * 
 * @param userId - User ID
 * @param rewardClaimed - Whether the reward has been claimed
 */
export async function checkUnclaimedRewards(
  userId: string,
  rewardClaimed: boolean
): Promise<void> {
  try {
    console.log('🔍 Checking for unclaimed rewards...', { userId, rewardClaimed });

    // If reward is already claimed, ensure notification is marked as claimed
    if (rewardClaimed) {
      await markRewardNotificationAsClaimed(userId);
      return;
    }

    // If reward is not claimed, ensure notification exists
    const existingNotification = await getExistingRewardNotification(userId);
    if (!existingNotification) {
      console.log('📝 Creating notification for unclaimed reward');
      await createRewardNotification(userId, 150);
    } else {
      console.log('✅ Reward notification already exists');
    }
  } catch (error: any) {
    console.error('❌ Error checking unclaimed rewards:', error);
  }
}

/**
 * Get all unclaimed reward notifications for a user
 * 
 * @param userId - User ID
 * @returns Array of unclaimed reward notifications
 */
export async function getUnclaimedRewardNotifications(userId: string): Promise<any[]> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', NOTIFICATION_TYPE_REWARD),
      where('isClaimed', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return notifications;
  } catch (error: any) {
    console.error('❌ Error getting unclaimed reward notifications:', error);
    return [];
  }
}

