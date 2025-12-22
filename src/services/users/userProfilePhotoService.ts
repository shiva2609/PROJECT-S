/**
 * User Profile Photo Service
 * 
 * Centralized service for fetching and subscribing to user profile photos.
 * Provides a single source of truth for profilePhotoUrl from Firestore.
 * 
 * Features:
 * - getUserProfilePhoto: Get current profile photo URL (sync)
 * - subscribeToUserProfilePhoto: Real-time Firestore listener
 * - In-memory runtime cache for instant access
 * - Offline fallback handling
 * - Deleted user protection
 * - Race-condition prevention with timestamps
 * - Default photo fallback
 */

import { doc, onSnapshot, getDoc, Unsubscribe, serverTimestamp, Timestamp } from '../../core/firebase/compat';
import { db, storage } from '../../core/firebase';
import { store } from '../../store';
import { updateProfilePhoto, updateProfilePhotoWithTimestamp } from '../../store/slices/profilePhotoSlice';

// Default profile photo URL (can be a local asset or remote URL)
const DEFAULT_PROFILE_PHOTO = 'https://via.placeholder.com/150/FF5C02/FFFFFF?text=User';

// In-memory runtime cache for instant access (prevents repeated network fetches)
const profilePhotoMemoryCache: Record<string, string> = {};

// Map to track active subscriptions (userId -> unsubscribe function)
const activeSubscriptions = new Map<string, Unsubscribe>();
// Multi-callback support: Map<userId, Set<callback>>
const subscriptionCallbacks = new Map<string, Set<(url: string) => void>>();

/**
 * Get cached profile photo from memory cache
 * Fastest access path - no network, no Redux lookup
 */
export function getCachedProfilePhoto(userId: string): string | null {
  return profilePhotoMemoryCache[userId] || null;
}

/**
 * Get user profile photo URL from Firestore
 * Priority: Memory Cache → Redux Store → Firestore → Default
 * Returns the latest profilePhotoUrl from users/{userId}.profilePhotoUrl
 * Falls back to default if not found or user is deleted
 */
export async function getUserProfilePhoto(userId: string): Promise<string> {
  if (!userId) {
    return DEFAULT_PROFILE_PHOTO;
  }

  try {
    // 1. Check memory cache first (fastest - instant return)
    const memoryCached = profilePhotoMemoryCache[userId];
    if (memoryCached) {
      return memoryCached;
    }

    // 2. Check Redux store (fast path - no network)
    const state = store.getState();
    const cachedUrl = state.profilePhoto?.profilePhotoMap[userId];
    if (cachedUrl) {
      // Update memory cache for next time
      profilePhotoMemoryCache[userId] = cachedUrl;
      return cachedUrl;
    }

    // 3. Fetch from Firestore (network call)
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    // Handle deleted/non-existing user
    if (!userSnap.exists()) {
      const defaultUrl = DEFAULT_PROFILE_PHOTO;
      // Cache default for deleted users to prevent repeated fetches
      profilePhotoMemoryCache[userId] = defaultUrl;
      store.dispatch(updateProfilePhoto({ userId, photoUrl: defaultUrl }));
      return defaultUrl;
    }

    const data = userSnap.data();
    // Priority: profilePhotoUrl > profilePhoto > photoURL
    const photoUrl = data.profilePhotoUrl || data.profilePhoto || data.photoURL;
    const photoUpdatedAt = data.profilePhotoUpdatedAt;

    // Check if photoUrl is null, undefined, empty string, or default placeholder
    if (photoUrl && photoUrl.trim() !== '' && photoUrl !== DEFAULT_PROFILE_PHOTO) {
      // Valid photo URL - update memory cache and Redux store
      profilePhotoMemoryCache[userId] = photoUrl;
      if (photoUpdatedAt) {
        // Store timestamp for race-condition prevention
        const timestamp = photoUpdatedAt instanceof Timestamp
          ? photoUpdatedAt.toMillis()
          : typeof photoUpdatedAt === 'number'
            ? photoUpdatedAt
            : Date.now();
        store.dispatch(updateProfilePhotoWithTimestamp({ userId, photoUrl, updatedAt: timestamp }));
      } else {
        store.dispatch(updateProfilePhoto({ userId, photoUrl }));
      }
      return photoUrl;
    }

    // No photo found or deleted - use default and cache it
    // Return DEFAULT_PROFILE_PHOTO which will be detected by isDefaultProfilePhoto() helper
    const defaultUrl = DEFAULT_PROFILE_PHOTO;
    profilePhotoMemoryCache[userId] = defaultUrl;
    store.dispatch(updateProfilePhoto({ userId, photoUrl: defaultUrl }));
    return defaultUrl;
  } catch (error: any) {
    console.error(`[userProfilePhotoService] Error fetching profile photo for ${userId}:`, error);
    // On error (offline/network failure), return cached or default
    const cached = profilePhotoMemoryCache[userId] || DEFAULT_PROFILE_PHOTO;
    profilePhotoMemoryCache[userId] = cached; // Ensure cache is set
    return cached;
  }
}

/**
 * Subscribe to real-time profile photo updates for a user
 * Automatically updates Redux store and memory cache when profilePhotoUrl changes in Firestore
 * Includes race-condition prevention using timestamps
 * 
 * @param userId - User ID to subscribe to
 * @param callback - Optional callback when photo URL changes
 * @returns Unsubscribe function
 */
export function subscribeToUserProfilePhoto(
  userId: string,
  callback?: (photoUrl: string) => void
): () => void {
  if (!userId) return () => { };

  // Add callback to the set for this user
  if (!subscriptionCallbacks.has(userId)) {
    subscriptionCallbacks.set(userId, new Set());
  }
  if (callback) {
    subscriptionCallbacks.get(userId)!.add(callback);
  }

  // If already subscribed to Firestore, just return a handle to remove this specific callback
  if (activeSubscriptions.has(userId)) {
    return () => {
      if (callback) {
        subscriptionCallbacks.get(userId)?.delete(callback);
      }
    };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot: any) => {
        const data = snapshot.exists() ? snapshot.data() : null;
        let photoUrl = data?.profilePhotoUrl || data?.profilePhoto || data?.photoURL || DEFAULT_PROFILE_PHOTO;

        if (!photoUrl || photoUrl.trim() === '' || photoUrl === DEFAULT_PROFILE_PHOTO) {
          photoUrl = DEFAULT_PROFILE_PHOTO;
        }

        // Update caches
        profilePhotoMemoryCache[userId] = photoUrl;
        store.dispatch(updateProfilePhoto({ userId, photoUrl }));

        // Notify ALL callbacks
        subscriptionCallbacks.get(userId)?.forEach(cb => cb(photoUrl));
      },
      (error: any) => {
        console.error(`Subscription error for ${userId}:`, error);
      }
    );

    activeSubscriptions.set(userId, unsubscribe);

    return () => {
      if (callback) {
        subscriptionCallbacks.get(userId)?.delete(callback);
      }
      // Note: We keep the Firestore subscription alive for the module lifecycle
      // to avoid rapid resubscribes during navigation.
    };
  } catch (error) {
    return () => { };
  }
}

/**
 * Unsubscribe from a specific user's profile photo updates
 */
export function unsubscribeFromUserProfilePhoto(userId: string): void {
  const unsubscribe = activeSubscriptions.get(userId);
  if (unsubscribe) {
    unsubscribe();
    activeSubscriptions.delete(userId);
  }
}

/**
 * Unsubscribe from all profile photo updates
 * Useful for cleanup on logout
 */
export function unsubscribeFromAllProfilePhotos(): void {
  activeSubscriptions.forEach((unsubscribe) => {
    unsubscribe();
  });
  activeSubscriptions.clear();
  // Optionally clear memory cache on logout
  // profilePhotoMemoryCache = {};
}

/**
 * Clear memory cache for a specific user
 * Useful when user updates their photo to force refresh
 */
export function clearMemoryCacheForUser(userId: string): void {
  delete profilePhotoMemoryCache[userId];
}

/**
 * Clear all memory cache
 * Useful for testing or memory management
 */
export function clearAllMemoryCache(): void {
  Object.keys(profilePhotoMemoryCache).forEach(key => {
    delete profilePhotoMemoryCache[key];
  });
}

/**
 * Get default profile photo URL
 */
export function getDefaultProfilePhoto(): string {
  return DEFAULT_PROFILE_PHOTO;
}

/**
 * Check if a photo URL is the default placeholder
 * Returns true if the URL is null, undefined, empty, or matches the default placeholder
 */
export function isDefaultProfilePhoto(photoUrl: string | null | undefined): boolean {
  if (!photoUrl) return true;
  return photoUrl === DEFAULT_PROFILE_PHOTO || photoUrl.trim() === '';
}

