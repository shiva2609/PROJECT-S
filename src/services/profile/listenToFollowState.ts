/**
 * Listen to Follow State
 * 
 * Real-time listener for follow state between current user and profile user
 * Query: where("followerId", "==", currentUserId) where("followingId", "==", profileUserId)
 * Returns FollowState object
 */

import { collection, query, where, onSnapshot, doc, Unsubscribe, QuerySnapshot, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../auth/authService';
import { FollowState } from '../../types/firestore';
import { normalizeFollow } from '../../utils/normalize/normalizeFollow';

/**
 * Listen to follow state between current user and profile user
 * @param currentUserId - Current user ID (follower)
 * @param profileUserId - Profile user ID (following)
 * @param callback - Callback with FollowState object
 * @param onError - Optional error callback
 * @returns Unsubscribe function
 */
export function listenToFollowState(
  currentUserId: string,
  profileUserId: string,
  callback: (state: FollowState) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (!currentUserId || !profileUserId || 
      typeof currentUserId !== 'string' || typeof profileUserId !== 'string' ||
      currentUserId.trim().length === 0 || profileUserId.trim().length === 0) {
    console.warn('[listenToFollowState] Invalid user IDs');
    callback({ isFollowing: false, followId: null });
    return () => {};
  }

  // If same user, not following
  if (currentUserId === profileUserId) {
    callback({ isFollowing: false, followId: null });
    return () => {};
  }

  const followsCol = collection(db, 'follows');
  
  // Try composite query first
  let q;
  try {
    q = query(
      followsCol,
      where('followerId', '==', currentUserId),
      where('followingId', '==', profileUserId)
    );
  } catch (queryErr: any) {
    console.warn('[listenToFollowState] Query build failed, using document ID pattern:', queryErr?.message);
    // Fallback: use document ID pattern
    const followDocId = `${currentUserId}_${profileUserId}`;
    const followRef = doc(db, 'follows', followDocId);
    
    return onSnapshot(
      followRef,
      (snapshot: DocumentSnapshot) => {
        callback({
          isFollowing: snapshot.exists(),
          followId: snapshot.exists() ? snapshot.id : null,
        });
      },
      (error: any) => {
        console.error('[listenToFollowState] Listener error:', error);
        if (onError) onError(error);
        callback({ isFollowing: false, followId: null });
      }
    );
  }

  try {
    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        try {
          if (snapshot.empty) {
            callback({ isFollowing: false, followId: null });
            return;
          }

          // Get first matching document
          const docSnap = snapshot.docs[0];
          const raw = { id: docSnap.id, ...docSnap.data() };
          const normalized = normalizeFollow(raw);

          callback({
            isFollowing: true,
            followId: normalized.id,
          });
        } catch (err: any) {
          console.error('[listenToFollowState] Error processing snapshot:', err);
          if (onError) onError(err);
          callback({ isFollowing: false, followId: null });
        }
      },
      (error: any) => {
        // Suppress INTERNAL ASSERTION FAILED errors
        if (error?.message?.includes('INTERNAL ASSERTION FAILED') || 
            error?.message?.includes('Unexpected state')) {
          console.warn('[listenToFollowState] Firestore internal error (non-fatal):', error.message?.substring(0, 100));
          callback({ isFollowing: false, followId: null });
          return;
        }

        // Fallback: try document ID pattern
        console.warn('[listenToFollowState] Query failed, trying document ID pattern:', error.message?.substring(0, 100));
        const followDocId = `${currentUserId}_${profileUserId}`;
        const followRef = doc(db, 'follows', followDocId);
        
        return onSnapshot(
          followRef,
          (snapshot: DocumentSnapshot) => {
            callback({
              isFollowing: snapshot.exists(),
              followId: snapshot.exists() ? snapshot.id : null,
            });
          },
          (fallbackError: any) => {
            console.error('[listenToFollowState] Fallback also failed:', fallbackError);
            if (onError) onError(fallbackError);
            callback({ isFollowing: false, followId: null });
          }
        );
      }
    );
  } catch (setupErr: any) {
    console.error('[listenToFollowState] Setup error:', setupErr);
    if (onError) onError(setupErr);
    callback({ isFollowing: false, followId: null });
    return () => {};
  }
}

