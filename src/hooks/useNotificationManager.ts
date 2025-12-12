import { useState, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';
import * as NotificationAPI from '../services/notifications/NotificationAPI';

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention' | string;
  targetUserId?: string;
  sourceUserId?: string;
  sourceUsername?: string;
  sourceAvatarUri?: string;
  actorId?: string;
  postId?: string;
  metadata?: {
    postId?: string;
    commentId?: string;
    conversationId?: string;
    text?: string;
    [key: string]: any;
  };
  timestamp?: number;
  createdAt?: any;
  read: boolean;
  message?: string;
  data?: any;
}

interface UseNotificationManagerReturn {
  notifications: Notification[];
  fetchNotifications: () => Promise<void>;
  sendNotification: (
    type: Notification['type'],
    targetUserId: string,
    metadata?: Notification['metadata']
  ) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  unreadCount: number;
}

/**
 * Global hook for managing notifications
 * Handles fetching and sending notifications for like/comment/follow/message events
 */
export function useNotificationManager(): UseNotificationManagerReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;

    try {
      const result = await NotificationAPI.fetchNotifications(user.uid);
      // Normalize notifications
      const normalized = result.notifications.map((notif: any) => ({
        id: notif.id,
        type: notif.type,
        actorId: notif.actorId,
        postId: notif.postId,
        message: notif.message,
        data: notif.data,
        timestamp: notif.createdAt?.toMillis?.() || notif.createdAt || notif.timestamp || Date.now(),
        createdAt: notif.createdAt,
        read: notif.read || false,
        sourceUserId: notif.actorId,
        metadata: notif.data || {},
      }));
      setNotifications(normalized);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }, [user?.uid]);

  const sendNotification = useCallback(async (
    type: Notification['type'],
    targetUserId: string,
    metadata?: Notification['metadata']
  ): Promise<void> => {
    try {
      await NotificationAPI.sendNotification(targetUserId, {
        type,
        actorId: user?.uid,
        postId: metadata?.postId,
        message: metadata?.text,
        data: metadata,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }, [user?.uid]);

  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    if (!user?.uid) return;

    // Optimistic update
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );

    try {
      await NotificationAPI.markNotificationAsRead(user.uid, notificationId);
    } catch (error) {
      // Rollback on error
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: false } : notif
        )
      );
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }, [user?.uid]);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;

    // Optimistic update
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));

    try {
      await NotificationAPI.markAllAsRead(user.uid);
    } catch (error) {
      // Rollback on error
      setNotifications(prev => prev.map(notif => ({ ...notif, read: false })));
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }, [user?.uid]);

  return {
    notifications,
    fetchNotifications,
    sendNotification,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };
}

