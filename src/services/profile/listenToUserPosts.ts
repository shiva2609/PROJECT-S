/**
 * Listen to User Posts
 * 
 * Real-time listener for user's posts
 * Query: where("createdBy", "==", userId) orderBy("createdAt", "desc")
 * Returns normalized Post array
 */

import { collection, query, where, orderBy, onSnapshot, Unsubscribe, QuerySnapshot } from 'firebase/firestore';
import { db } from '../auth/authService';
import { Post } from '../../types/firestore';
import { normalizePost } from '../../utils/normalize/normalizePost';

/**
 * Listen to posts for a user (profile feed)
 * @param userId - User ID to get posts for
 * @param callback - Callback with array of normalized Post objects
 * @param onError - Optional error callback
 * @returns Unsubscribe function
 */
export function listenToUserPosts(
  userId: string,
  callback: (posts: Post[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.warn('[listenToUserPosts] Invalid userId');
    if (onError) onError(new Error('Invalid userId'));
    callback([]);
    return () => {};
  }

  const postsCol = collection(db, 'posts');
  
  // Build query with orderBy - if this fails, we'll catch it
  let q;
  try {
    q = query(
      postsCol,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
  } catch (queryErr: any) {
    // If query building fails (e.g., missing index), fallback without orderBy
    console.warn('[listenToUserPosts] Query build failed, using fallback:', queryErr?.message);
    q = query(postsCol, where('createdBy', '==', userId));
  }

  try {
    return onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        try {
          const posts: Post[] = [];
          snapshot.forEach((docSnap) => {
            try {
              const raw = { id: docSnap.id, ...docSnap.data() };
              const normalized = normalizePost(raw);
              if (normalized && normalized.id && normalized.createdBy) {
                posts.push(normalized);
              }
            } catch (docErr: any) {
              console.warn('[listenToUserPosts] Error normalizing post:', docSnap.id, docErr);
            }
          });

          // If we used fallback query (no orderBy), sort client-side
          if (!q.toString().includes('orderBy')) {
            posts.sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
              const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
              return bTime - aTime; // Descending
            });
          }

          callback(posts);
        } catch (err: any) {
          console.error('[listenToUserPosts] Error processing snapshot:', err);
          if (onError) onError(err);
          callback([]);
        }
      },
      (error: any) => {
        // If orderBy fails, try fallback query without orderBy
        if (error?.code === 'failed-precondition' || 
            error?.message?.includes('INTERNAL ASSERTION FAILED') ||
            error?.message?.includes('index')) {
          console.warn('[listenToUserPosts] orderBy failed, using fallback query:', error.message?.substring(0, 100));
          
          // Retry with fallback query
          const fallbackQ = query(postsCol, where('createdBy', '==', userId));
          return onSnapshot(
            fallbackQ,
            (snapshot: QuerySnapshot) => {
              const posts: Post[] = [];
              snapshot.forEach((docSnap) => {
                try {
                  const raw = { id: docSnap.id, ...docSnap.data() };
                  const normalized = normalizePost(raw);
                  if (normalized && normalized.id && normalized.createdBy) {
                    posts.push(normalized);
                  }
                } catch (docErr: any) {
                  console.warn('[listenToUserPosts] Error normalizing post:', docSnap.id, docErr);
                }
              });

              // Sort client-side
              posts.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
                const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
                return bTime - aTime; // Descending
              });

              callback(posts);
            },
            (fallbackError: any) => {
              console.error('[listenToUserPosts] Fallback query also failed:', fallbackError);
              if (onError) onError(fallbackError);
              callback([]);
            }
          );
        }

        console.error('[listenToUserPosts] Listener error:', error);
        if (onError) onError(error);
        callback([]);
      }
    );
  } catch (setupErr: any) {
    console.error('[listenToUserPosts] Setup error:', setupErr);
    if (onError) onError(setupErr);
    callback([]);
    return () => {};
  }
}

