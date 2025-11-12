/**
 * useTopicClaimStatus Hook
 * 
 * Monitors whether a user has claimed their presentation topic before a deadline.
 * Checks Firestore for topic claim status and deadline, and triggers alerts/notifications
 * when the deadline passes without a claim.
 * 
 * Firestore Schema:
 * users/{uid} {
 *   topicClaimed: boolean,        // true if user has claimed a topic
 *   topicClaimDeadline: Timestamp, // Deadline for claiming topic
 *   selectedTopic: string?        // The topic ID/name if claimed
 * }
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../api/authService';

interface TopicClaimStatus {
  claimed: boolean;
  deadline: number | null; // Unix timestamp in milliseconds
  selectedTopic: string | null;
  hasPassedDeadline: boolean;
  loading: boolean;
  error: Error | null;
}

interface UseTopicClaimStatusReturn extends TopicClaimStatus {
  refresh: () => Promise<void>;
}

/**
 * Hook to monitor topic claim status and deadline
 * 
 * @param userId - Firebase Auth user UID
 * @param checkInterval - Optional interval in ms to check deadline (default: 60000 = 1 minute)
 * @returns Object with claim status, deadline info, and refresh function
 */
export function useTopicClaimStatus(
  userId: string | null | undefined,
  checkInterval: number = 60000 // Check every minute
): UseTopicClaimStatusReturn {
  const [status, setStatus] = useState<TopicClaimStatus>({
    claimed: false,
    deadline: null,
    selectedTopic: null,
    hasPassedDeadline: false,
    loading: true,
    error: null,
  });

  /**
   * Check topic claim status from Firestore
   */
  const checkStatus = useCallback(async () => {
    if (!userId) {
      setStatus((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setStatus((prev) => ({ ...prev, loading: true, error: null }));

      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log('⚠️ User document does not exist, topic claim check skipped');
        setStatus({
          claimed: false,
          deadline: null,
          selectedTopic: null,
          hasPassedDeadline: false,
          loading: false,
          error: null,
        });
        return;
      }

      const userData = userDoc.data();
      const claimed = userData.topicClaimed ?? false;
      const selectedTopic = userData.selectedTopic ?? null;

      // Get deadline timestamp
      let deadline: number | null = null;
      const deadlineField = userData.topicClaimDeadline;
      
      if (deadlineField) {
        // Handle Firestore Timestamp
        if (deadlineField.toMillis && typeof deadlineField.toMillis === 'function') {
          deadline = deadlineField.toMillis();
        } else if (typeof deadlineField === 'number') {
          deadline = deadlineField;
        } else if (deadlineField.seconds) {
          // Firestore Timestamp object
          deadline = deadlineField.seconds * 1000 + (deadlineField.nanoseconds || 0) / 1000000;
        }
      }

      // Check if deadline has passed
      const now = Date.now();
      const hasPassedDeadline = deadline !== null && !claimed && now >= deadline;

      setStatus({
        claimed,
        deadline,
        selectedTopic,
        hasPassedDeadline,
        loading: false,
        error: null,
      });

      console.log('✅ Topic claim status checked:', {
        userId,
        claimed,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        hasPassedDeadline,
      });
    } catch (err: any) {
      console.error('❌ Error checking topic claim status:', err);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to check topic claim status'),
      }));
    }
  }, [userId]);

  // Initial check and set up real-time listener
  useEffect(() => {
    if (!userId) {
      setStatus((prev) => ({ ...prev, loading: false }));
      return;
    }

    // Initial check
    checkStatus();

    // Set up real-time listener
    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      () => {
        // Re-check when document changes
        checkStatus();
      },
      (error) => {
        console.error('❌ Error listening to user document:', error);
        setStatus((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Failed to listen to user document'),
        }));
      }
    );

    // Also set up interval to check deadline periodically
    const intervalId = setInterval(() => {
      if (status.deadline && !status.claimed) {
        const now = Date.now();
        const hasPassed = now >= status.deadline;
        if (hasPassed !== status.hasPassedDeadline) {
          // Deadline status changed, refresh
          checkStatus();
        }
      }
    }, checkInterval);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [userId, checkStatus, checkInterval, status.deadline, status.claimed, status.hasPassedDeadline]);

  return {
    ...status,
    refresh: checkStatus,
  };
}

