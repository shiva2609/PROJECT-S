/**
 * useTopicClaimReminder Hook
 * 
 * Main hook that monitors topic claim status and triggers alerts/notifications
 * when the deadline passes. Combines status checking with notification logic.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTopicClaimStatus } from './useTopicClaimStatus';
import {
  createTopicReminderNotification,
  scheduleTopicReminderNotification,
  removeTopicReminderNotification,
} from '../api/topicNotificationService';

interface UseTopicClaimReminderReturn {
  showAlert: boolean;
  hasPassedDeadline: boolean;
  claimed: boolean;
  loading: boolean;
  error: Error | null;
  onClaimNow: () => void;
  onRemindLater: () => void;
  dismissAlert: () => void;
}

/**
 * Hook to manage topic claim reminders and alerts
 * 
 * @param userId - Firebase Auth user UID
 * @param navigation - Navigation object for navigating to TopicSelection screen
 * @param autoShowAlert - Whether to automatically show alert when deadline passes (default: true)
 * @returns Object with alert state and control functions
 */
export function useTopicClaimReminder(
  userId: string | null | undefined,
  navigation: any,
  autoShowAlert: boolean = true
): UseTopicClaimReminderReturn {
  const [showAlert, setShowAlert] = useState(false);
  const [hasTriggeredNotification, setHasTriggeredNotification] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const {
    claimed,
    hasPassedDeadline,
    loading,
    error,
    refresh,
  } = useTopicClaimStatus(userId);

  /**
   * Navigate to topic selection screen
   */
  const handleClaimNow = useCallback(() => {
    setShowAlert(false);
    setDismissed(false);
    
    // Navigate to TopicSelection screen
    // Adjust route name based on your navigation structure
    if (navigation) {
      navigation.navigate('TopicSelection');
    } else {
      console.warn('⚠️ Navigation not available for topic claim');
    }
  }, [navigation]);

  /**
   * Dismiss alert and schedule reminder notification
   */
  const handleRemindLater = useCallback(async () => {
    setShowAlert(false);
    setDismissed(true);

    if (!userId) {
      console.warn('⚠️ Cannot schedule reminder: no user ID');
      return;
    }

    try {
      // Schedule reminder notification for 30 minutes later
      await scheduleTopicReminderNotification(userId, 30);
      console.log('✅ Reminder notification scheduled');
    } catch (error: any) {
      console.error('❌ Error scheduling reminder:', error);
    }
  }, [userId]);

  /**
   * Dismiss alert without scheduling reminder
   */
  const dismissAlert = useCallback(() => {
    setShowAlert(false);
    setDismissed(true);
  }, []);

  // Monitor deadline and trigger alerts/notifications
  useEffect(() => {
    if (loading || !userId || claimed) {
      return;
    }

    // If deadline has passed and we haven't triggered notification yet
    if (hasPassedDeadline && !hasTriggeredNotification && !dismissed) {
      console.log('⏰ Topic claim deadline passed, triggering notification...');

      // Create notification in Firestore
      createTopicReminderNotification(userId)
        .then(() => {
          console.log('✅ Topic reminder notification created');
          setHasTriggeredNotification(true);
        })
        .catch((error) => {
          console.error('❌ Error creating notification:', error);
        });

      // Show alert if auto-show is enabled
      if (autoShowAlert) {
        setShowAlert(true);
      }
    }

    // If user claims topic, remove notifications
    if (claimed && hasTriggeredNotification) {
      removeTopicReminderNotification(userId)
        .then(() => {
          console.log('✅ Topic reminder notifications removed');
          setHasTriggeredNotification(false);
          setShowAlert(false);
        })
        .catch((error) => {
          console.error('❌ Error removing notifications:', error);
        });
    }
  }, [
    hasPassedDeadline,
    hasTriggeredNotification,
    claimed,
    loading,
    userId,
    dismissed,
    autoShowAlert,
  ]);

  // Reset dismissed state when deadline changes (new deadline set)
  useEffect(() => {
    if (!hasPassedDeadline) {
      setDismissed(false);
      setHasTriggeredNotification(false);
    }
  }, [hasPassedDeadline]);

  return {
    showAlert,
    hasPassedDeadline,
    claimed,
    loading,
    error,
    onClaimNow: handleClaimNow,
    onRemindLater: handleRemindLater,
    dismissAlert,
  };
}

