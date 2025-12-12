/**
 * Listen to User Profile
 * 
 * Real-time listener for user document
 * Returns normalized User object
 */

import { doc, onSnapshot, Unsubscribe, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../auth/authService';
import { User } from '../../types/firestore';
import { normalizeUser } from '../../utils/normalize/normalizeUser';

/**
 * Listen to user profile document
 * @param userId - User ID to listen to
 * @param callback - Callback with normalized User object or null if not found
 * @param onError - Optional error callback
 * @returns Unsubscribe function
 */
export function listenToUserProfile(
  userId: string,
  callback: (user: User | null) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.warn('[listenToUserProfile] Invalid userId');
    if (onError) onError(new Error('Invalid userId'));
    callback(null);
    return () => {};
  }

  const userRef = doc(db, 'users', userId);

  try {
    return onSnapshot(
      userRef,
      (snapshot: DocumentSnapshot) => {
        try {
          if (!snapshot.exists()) {
            callback(null);
            return;
          }

          const raw = { id: snapshot.id, ...snapshot.data() };
          const normalized = normalizeUser(raw);
          callback(normalized);
        } catch (err: any) {
          console.error('[listenToUserProfile] Error processing snapshot:', err);
          if (onError) onError(err);
          callback(null);
        }
      },
      (error: any) => {
        // Suppress INTERNAL ASSERTION FAILED errors
        if (error?.message?.includes('INTERNAL ASSERTION FAILED') || 
            error?.message?.includes('Unexpected state')) {
          console.warn('[listenToUserProfile] Firestore internal error (non-fatal):', error.message?.substring(0, 100));
          callback(null);
          return;
        }
        console.error('[listenToUserProfile] Listener error:', error);
        if (onError) onError(error);
        callback(null);
      }
    );
  } catch (setupErr: any) {
    console.error('[listenToUserProfile] Setup error:', setupErr);
    if (onError) onError(setupErr);
    callback(null);
    return () => {};
  }
}

