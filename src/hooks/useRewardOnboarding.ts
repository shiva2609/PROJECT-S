/**
 * useRewardOnboarding Hook
 * 
 * Manages the welcome reward onboarding flow for newly-registered users.
 * Checks Firestore for reward claim status and grants 150 Explorer Points
 * using an atomic transaction to prevent race conditions.
 * 
 * Features:
 * - Atomic Firestore transaction for points update
 * - Optimistic UI updates with Firestore fallback
 * - One-time reward claim tracking
 * - Resilient error handling
 * 
 * Firestore Schema:
 * users/{uid} {
 *   explorerPoints: number,    // default 0
 *   rewardClaimed: boolean      // default false
 * }
 */

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../api/authService';
import {
  createRewardNotification,
  checkUnclaimedRewards,
  markRewardNotificationAsClaimed,
} from '../api/rewardNotificationService';

interface UseRewardOnboardingReturn {
  visible: boolean;
  claimed: boolean;
  points: number;
  loading: boolean;
  claiming: boolean; // Loading state during claim process
  error: Error | null;
  grantReward: () => Promise<void>;
  dismiss: () => void;
  showReward: () => void; // Manually trigger reward modal to show
}

const REWARD_POINTS = 150;

/**
 * Hook to manage welcome reward onboarding
 * 
 * @param userId - Firebase Auth user UID
 * @returns Object with visibility state, reward status, and control functions
 */
export function useRewardOnboarding(
  userId: string | null | undefined
): UseRewardOnboardingReturn {
  const [visible, setVisible] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false); // Track claim in progress
  const [error, setError] = useState<Error | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  /**
   * Check user's reward status from Firestore
   */
  const checkRewardStatus = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log('⚠️ User document does not exist, reward check skipped');
        setLoading(false);
        setHasChecked(true);
        return;
      }

      const userData = userDoc.data();
      const currentPoints = userData.explorerPoints ?? 0;
      const rewardClaimed = userData.rewardClaimed ?? false;

      setPoints(currentPoints);
      setClaimed(rewardClaimed);

      // Show card if reward hasn't been claimed yet
      if (!rewardClaimed) {
        setVisible(true);
        
        // Create notification for unclaimed reward
        // This ensures notification appears even if user dismisses the modal
        console.log('📝 Creating notification for unclaimed reward...');
        await checkUnclaimedRewards(userId, rewardClaimed);
      } else {
        // If reward is claimed, ensure notification is marked as claimed
        await checkUnclaimedRewards(userId, rewardClaimed);
      }

      console.log('✅ Reward status checked:', {
        userId,
        rewardClaimed,
        currentPoints,
      });
    } catch (err: any) {
      console.error('❌ Error checking reward status:', err);
      setError(err instanceof Error ? err : new Error('Failed to check reward status'));
    } finally {
      setLoading(false);
      setHasChecked(true);
    }
  }, [userId]);

  /**
   * Grant reward using atomic Firestore transaction
   * Prevents race conditions and ensures data consistency
   * Only updates state after successful claim - modal stays open until user claims
   */
  const grantReward = useCallback(async () => {
    if (!userId) {
      console.error('❌ Cannot grant reward: no user ID');
      setError(new Error('User not found'));
      return;
    }

    if (claimed) {
      console.log('⚠️ Reward already claimed, skipping');
      setVisible(false); // Hide if already claimed
      return;
    }

    if (claiming) {
      console.log('⚠️ Claim already in progress, skipping');
      return; // Prevent double-clicks
    }

    try {
      setError(null);
      setClaiming(true); // Set claiming state

      const userDocRef = doc(db, 'users', userId);

      // Use transaction to atomically update points and claim flag
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);

        if (!userDoc.exists()) {
          throw new Error('User document does not exist');
        }

        const userData = userDoc.data();
        const currentPoints = userData.explorerPoints ?? 0;
        const rewardClaimed = userData.rewardClaimed ?? false;

        // Double-check: don't grant if already claimed (race condition protection)
        if (rewardClaimed) {
          console.log('⚠️ Reward already claimed in Firestore, skipping transaction');
          setClaimed(true);
          setVisible(false);
          return;
        }

        // Calculate new points total
        const newPoints = currentPoints + REWARD_POINTS;

        // Update document atomically
        transaction.update(userDocRef, {
          explorerPoints: newPoints,
          rewardClaimed: true,
        });

        console.log('✅ Reward granted via transaction:', {
          userId,
          oldPoints: currentPoints,
          newPoints,
          rewardClaimed: true,
        });
      });

      // Only update state and close modal AFTER successful transaction
      // Reuse the existing userDocRef from above
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPoints(userData.explorerPoints ?? 0);
      }
      
      setClaimed(true);
      setVisible(false); // Close modal only after successful claim

      // Mark reward notification as claimed
      console.log('📝 Marking reward notification as claimed...');
      await markRewardNotificationAsClaimed(userId);

      console.log('✅ Reward claim completed successfully');
    } catch (err: any) {
      console.error('❌ Error granting reward:', err);

      // Revert optimistic update on error
      await checkRewardStatus();

      const errorMessage =
        err instanceof Error
          ? err
          : new Error('Failed to grant reward. Please try again.');
      setError(errorMessage);
      
      // Keep modal open on error so user can retry
      // Don't set visible to false
    } finally {
      setClaiming(false); // Reset claiming state
    }
  }, [userId, claimed, claiming, checkRewardStatus]);

  /**
   * Dismiss the reward card without claiming
   * This keeps rewardClaimed as false, so the card can appear again
   * Notification will remain in the notifications list
   */
  const dismiss = useCallback(async () => {
    setVisible(false);
    // Note: rewardClaimed remains false, so user can claim later
    // The card will show again on next check if still not claimed
    // Notification will remain in notifications list for user to claim later
    
    // Ensure notification exists when user dismisses
    if (userId && !claimed) {
      console.log('📝 Ensuring notification exists after dismiss...');
      await checkUnclaimedRewards(userId, false);
    }
  }, [userId, claimed]);

  /**
   * Manually show the reward modal
   * Useful when navigating from notifications
   */
  const showReward = useCallback(() => {
    if (!claimed && userId) {
      console.log('📝 Manually showing reward modal...');
      setVisible(true);
    }
  }, [claimed, userId]);

  // Check reward status on mount and when userId changes
  useEffect(() => {
    if (userId && !hasChecked) {
      checkRewardStatus();
    }
  }, [userId, hasChecked, checkRewardStatus]);

  // Background check: Ensure unclaimed rewards have notifications
  // Runs periodically to sync rewards with notifications
  useEffect(() => {
    if (!userId || loading) return;

    // Check every 30 seconds if reward is not claimed
    const intervalId = setInterval(async () => {
      if (!claimed) {
        console.log('🔄 Background check: Ensuring unclaimed reward has notification...');
        await checkUnclaimedRewards(userId, claimed);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [userId, claimed, loading]);

  return {
    visible,
    claimed,
    points,
    loading,
    claiming,
    error,
    grantReward,
    dismiss,
    showReward,
  };
}

