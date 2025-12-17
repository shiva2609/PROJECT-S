import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  Timestamp,
  setDoc,
  deleteDoc
} from '../../core/firebase/compat';
import { db } from '../../core/firebase';
import { normalizeNotification as normalizeNotificationGlobal } from '../../utils/normalize/normalizeNotification';

// ---------- Types ----------

export interface AppNotification {
  id: string;
  type: 'like' | 'comment' | 'follow';
  actorId: string;
  receiverId?: string; // Optional if implicit by collection
  postId?: string;
  message: string;
  read: boolean;
  createdAt: Timestamp | null;
  data?: any;
}

export interface Notification extends AppNotification { }

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
  if (normalized) {
    return normalized as unknown as Notification;
  }

  // Fallback
  const data = docSnap.data ? docSnap.data() : docSnap;
  return {
    id: docSnap.id,
    type: data.type,
    actorId: data.actorId,
    message: data.message,
    read: data.read,
    createdAt: data.createdAt,
    data: data.data,
    postId: data.postId
  } as Notification;
}


// ---------- Exported Functions ----------

/**
 * Send a notification to a user
 * Writes to: notifications/{userId}/items/{notificationId}
 */
export async function sendNotification(
  receiverId: string,
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): Promise<string> {
  console.log("🔥 [NotificationAPI] sendNotification CALLED", { receiverId, type: notification.type });
  try {
    const notificationsRef = collection(db, 'notifications', receiverId, 'items');

    // Check for duplicates (optional, skipped for now to ensure delivery)
    console.log("🔥 [NotificationAPI] Preparing to write doc to", `notifications/${receiverId}/items`);

    const docRef = await addDoc(notificationsRef, {
      ...notification,
      createdAt: serverTimestamp(),
      read: false,
    });

    console.log("🔥 [NotificationAPI] Write SUCCESS. Doc ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("🔥 [NotificationAPI] Write FAILED:", error);
    throw error;
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'notifications', userId, 'items', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    const notificationsRef = collection(db, 'notifications', userId, 'items');
    const q = query(notificationsRef, where('read', '==', false));

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
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
    const notificationsRef = collection(db, 'notifications', userId, 'items');

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

// Convenience functions for hooks
export async function getNotifications(userId: string): Promise<Notification[]> {
  const result = await fetchNotifications(userId);
  return result.notifications;
}

/**
 * ============================================================================
 * FOLLOW NOTIFICATION CONTRACT
 * ============================================================================
 * 
 * PROBLEM:
 * standard sendNotification() uses addDoc(), which creates a new document every time.
 * For Follow/Unfollow/Re-follow actions, this leads to duplicate notifications
 * and spammy behavior (e.g. User A follows -> unfollows -> follows = 2 notifications).
 * 
 * SOLUTION:
 * Follow notifications must be STATE-BASED and UNIQUE per (actor -> receiver) pair.
 * We use a deterministic document ID: {actorId}_follow
 * 
 * BEHAVIOR:
 * - FOLLOW: Create OR Update existing doc. Update timestamp. Mark unread.
 * - UNFOLLOW: Delete the notification.
 * - RE-FOLLOW: Re-create the document (or update if we chose soft-delete).
 * 
 * This ensures there is AT MOST ONE follow notification per user pair.
 */

/**
 * Send a deterministic follow notification.
 * Ensures uniqueness by using actorId in the document ID.
 */
export async function sendFollowNotification(
  receiverId: string,
  actorId: string,
  data?: any
): Promise<void> {
  console.log("🔥 [NotificationAPI] sendFollowNotification (Deterministic) CALLED", { receiverId, actorId });
  try {
    const notificationId = `${actorId}_follow`;
    const notificationRef = doc(db, 'notifications', receiverId, 'items', notificationId);

    // Create or Overwrite
    // We want to bring it to top, so update createdAt
    await setDoc(notificationRef, {
      id: notificationId,
      type: 'follow',
      actorId: actorId,
      message: 'started following you',
      read: false,
      createdAt: serverTimestamp(),
      data: data || {}
    });

    console.log("✅ [NotificationAPI] Follow Notification SET successfully:", notificationId);
  } catch (error) {
    console.error("❌ [NotificationAPI] Failed to set follow notification:", error);
    // Don't throw, just log. Notification failure shouldn't block the UI action.
  }
}

/**
 * Remove a follow notification.
 * Called when a user unfollows.
 */
export async function removeFollowNotification(
  receiverId: string,
  actorId: string
): Promise<void> {
  console.log("🔥 [NotificationAPI] removeFollowNotification CALLED", { receiverId, actorId });
  try {
    const notificationId = `${actorId}_follow`;
    const notificationRef = doc(db, 'notifications', receiverId, 'items', notificationId);

    await deleteDoc(notificationRef);
    console.log("✅ [NotificationAPI] Follow Notification DELETED successfully:", notificationId);
  } catch (error) {
    console.error("❌ [NotificationAPI] Failed to delete follow notification:", error);
  }
}

