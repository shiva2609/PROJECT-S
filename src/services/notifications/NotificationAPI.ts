/**
 * Notification API
 * 
 * Handles sending and fetching notifications.
 * Notifications stored in user's notification subcollection.
 */

import {
  doc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  startAfter,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../auth/authService';
import { getUserById } from './UsersAPI';
import { normalizeNotification as normalizeNotificationGlobal } from '../../utils/normalize/normalizeNotification';

// ---------- Types ----------

export interface Notification {
  id: string;
  type: string;
  actorId?: string;
  postId?: string;
  message?: string;
  data?: any;
  createdAt: any;
  read: boolean;
}

interface NotificationPayload {
  type: string;
  actorId?: string;
  postId?: string;
  message?: string;
  data?: any;
}

interface PaginationOptions {
  limit?: number;
  lastDoc?: any;
}

interface PaginationResult {
  notifications: Notification[];
  nextCursor?: any;
}

// ---------- Helper Functions ----------

function normalizeNotification(docSnap: any): Notification {
  // Use global normalizer for safe defaults
  const normalized = normalizeNotificationGlobal(docSnap);
  if (!normalized) {
    // Fallback to basic structure if normalization fails
    const data = docSnap.data ? docSnap.data() : docSnap;
    return {
      id: docSnap.id || '',
      type: data.type || 'unknown',
      actorId: data.actorId || '',
      postId: data.postId || '',
      message: data.message || '',
      data: data.data || {},
      createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
      read: data.read === true,
    };
  }
  
  return {
    id: normalized.id,
    type: normalized.type,
    actorId: normalized.actorId || '',
    postId: normalized.postId || '',
    message: normalized.message || '',
    data: normalized.data || {},
    createdAt: normalized.createdAt?.toMillis?.() || normalized.timestamp?.toMillis?.() || normalized.createdAt || Date.now(),
    read: normalized.read,
  };
}

// ---------- Exported Functions ----------

/**
 * Send a notification to a user
 * Stores notification doc and optionally triggers push via server/cloud function
 * @param toUserId - Target user ID
 * @param payload - Notification payload
 */
export async function sendNotification(
  toUserId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const notificationsRef = collection(db, 'users', toUserId, 'notifications');
    const notificationData = {
      ...payload,
      createdAt: serverTimestamp(),
      read: false,
    };
    
    await addDoc(notificationsRef, notificationData);
    
    // Note: In production, trigger push notification via Cloud Function
    // Cloud Function should:
    // 1. Get user's push tokens from user document
    // 2. Send push notification via FCM/expo-notifications
    // 3. Handle delivery receipts
  } catch (error: any) {
    console.error('Error sending notification:', error);
    throw { code: 'send-notification-failed', message: 'Failed to send notification' };
  }
}

/**
 * Fetch notifications for a user
 * @param userId - User ID
 * @param options - Pagination options
 * @returns Paginated notifications
 */
export async function fetchNotifications(
  userId: string,
  options?: PaginationOptions
): Promise<PaginationResult> {
  try {
    const limit = options?.limit || 20;
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    
    let q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    if (options?.lastDoc) {
      q = query(q, startAfter(options.lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const notifications = querySnapshot.docs.map(normalizeNotification);
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return {
      notifications,
      nextCursor: querySnapshot.docs.length === limit ? lastDoc : undefined,
    };
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    throw { code: 'fetch-notifications-failed', message: 'Failed to fetch notifications' };
  }
}

/**
 * Mark a notification as read
 * @param notificationId - Notification ID
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    // Note: This requires userId - notificationId alone is not enough
    // In production, use full path: users/{userId}/notifications/{notificationId}
    // For now, this is a placeholder that would need userId
    throw { code: 'user-id-required', message: 'User ID is required to mark notification as read' };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    throw { code: 'mark-read-failed', message: 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read for a user
 * @param userId - User ID
 */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const unreadQuery = query(
      notificationsRef,
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(unreadQuery);
    const batch = writeBatch(db);
    
    querySnapshot.docs.forEach(docSnap => {
      const notificationRef = doc(db, 'users', userId, 'notifications', docSnap.id);
      batch.update(notificationRef, { read: true, readAt: serverTimestamp() });
    });
    
    await batch.commit();
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    throw { code: 'mark-all-read-failed', message: 'Failed to mark all notifications as read' };
  }
}

// Convenience functions for hooks
export async function getNotifications(userId: string): Promise<Notification[]> {
  const result = await fetchNotifications(userId);
  return result.notifications;
}

// Note: markAsRead needs userId - hook should pass it
// For now, provide a version that takes both
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    throw { code: 'mark-read-failed', message: 'Failed to mark notification as read' };
  }
}

