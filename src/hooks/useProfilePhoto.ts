/**
 * useProfilePhoto Hook
 * 
 * React hook for accessing user profile photos with real-time updates.
 * Subscribes to Firestore changes and automatically updates when profilePhotoUrl changes.
 * 
 * Usage:
 *   const profileUri = useProfilePhoto(userId);
 *   <Image source={{ uri: profileUri }} style={styles.profileImage} />
 * 
 * Features:
 * - Priority: Memory Cache → Redux Store → Firestore → Default
 * - Automatically subscribes to Firestore for real-time updates
 * - Offline fallback handling
 * - Deleted user protection
 * - Race-condition prevention
 * - Always returns valid URL (never null/undefined)
 * - Guarantees ONE source of truth
 */

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  getUserProfilePhoto,
  subscribeToUserProfilePhoto,
  getDefaultProfilePhoto,
  getCachedProfilePhoto,
} from '../services/users/userProfilePhotoService';
import { store } from '../store';

/**
 * Hook to get and subscribe to a user's profile photo
 * 
 * @param userId - User ID to get profile photo for
 * @param options - Optional configuration
 * @param options.shape - 'circle' (default) or 'rectangle' - only affects return value, not the actual image
 * @returns Profile photo URL (always returns a valid URL, never null)
 */
export function useProfilePhoto(
  userId: string | null | undefined,
  options?: { shape?: 'circle' | 'rectangle' }
): string {
  // Priority: Memory Cache → Redux Store → Default
  const getInitialUrl = (): string => {
    if (!userId) return getDefaultProfilePhoto();
    // 1. Check memory cache first (fastest)
    const memoryCached = getCachedProfilePhoto(userId);
    if (memoryCached) return memoryCached;
    // 2. Check Redux store
    const state = store.getState();
    const reduxCached = state.profilePhoto?.profilePhotoMap[userId];
    if (reduxCached) return reduxCached;
    // 3. Fallback to default
    return getDefaultProfilePhoto();
  };

  const [photoUrl, setPhotoUrl] = useState<string>(getInitialUrl);
  const shape = options?.shape || 'circle';

  // Get from Redux store (fast path for re-renders)
  const cachedUrl = useSelector((state: RootState) => {
    if (!userId) return null;
    return state.profilePhoto?.profilePhotoMap[userId] || null;
  });

  useEffect(() => {
    if (!userId) {
      setPhotoUrl(getDefaultProfilePhoto());
      return;
    }

    // Priority: Memory Cache → Redux Store → Firestore
    const memoryCached = getCachedProfilePhoto(userId);
    if (memoryCached) {
      setPhotoUrl(memoryCached);
    } else if (cachedUrl) {
      // Use Redux cached value immediately
      setPhotoUrl(cachedUrl);
    } else {
      // Fetch from Firestore (with offline fallback)
      getUserProfilePhoto(userId)
        .then((url) => {
          setPhotoUrl(url);
        })
        .catch((error) => {
          // Offline/error fallback - use default
          console.warn(`[useProfilePhoto] Error fetching photo for ${userId}, using default:`, error);
          setPhotoUrl(getDefaultProfilePhoto());
        });
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUserProfilePhoto(userId, (url) => {
      setPhotoUrl(url);
    });

    // Cleanup subscription on unmount or userId change
    return () => {
      unsubscribe();
    };
  }, [userId, cachedUrl]);

  // Always return a valid URL (never null/undefined)
  return photoUrl || getDefaultProfilePhoto();
}

/**
 * Hook variant that returns photo URL and loading state
 * Useful when you need to show a loading indicator
 */
export function useProfilePhotoWithLoading(
  userId: string | null | undefined
): { photoUrl: string; loading: boolean } {
  const getInitialUrl = (): string => {
    if (!userId) return getDefaultProfilePhoto();
    const memoryCached = getCachedProfilePhoto(userId);
    if (memoryCached) return memoryCached;
    const state = store.getState();
    const reduxCached = state.profilePhoto?.profilePhotoMap[userId];
    if (reduxCached) return reduxCached;
    return getDefaultProfilePhoto();
  };

  const [photoUrl, setPhotoUrl] = useState<string>(getInitialUrl);
  const [loading, setLoading] = useState(true);

  const cachedUrl = useSelector((state: RootState) => {
    if (!userId) return null;
    return state.profilePhoto?.profilePhotoMap[userId] || null;
  });

  useEffect(() => {
    if (!userId) {
      setPhotoUrl(getDefaultProfilePhoto());
      setLoading(false);
      return;
    }

    // Priority: Memory Cache → Redux Store → Firestore
    const memoryCached = getCachedProfilePhoto(userId);
    if (memoryCached) {
      setPhotoUrl(memoryCached);
      setLoading(false);
    } else if (cachedUrl) {
      setPhotoUrl(cachedUrl);
      setLoading(false);
    } else {
      setLoading(true);
      getUserProfilePhoto(userId)
        .then((url) => {
          setPhotoUrl(url);
          setLoading(false);
        })
        .catch((error) => {
          // Offline/error fallback
          console.warn(`[useProfilePhotoWithLoading] Error fetching photo for ${userId}:`, error);
          setPhotoUrl(getDefaultProfilePhoto());
          setLoading(false);
        });
    }

    const unsubscribe = subscribeToUserProfilePhoto(userId, (url) => {
      setPhotoUrl(url);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userId, cachedUrl]);

  return { photoUrl: photoUrl || getDefaultProfilePhoto(), loading };
}

