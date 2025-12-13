/**
 * Global Post Interactions Service
 * 
 * SINGLE SOURCE OF TRUTH for all post interactions (likes, comments, saves, reports).
 * Uses Firestore subcollections for persistent, real-time state.
 * 
 * data Model:
 * - posts/{postId}/likes/{userId} → { userId, createdAt } (Primary)
 * - likes/{userId}_{postId} → { userId, postId, createdAt } (Legacy Sync)
 * - posts/{postId}/comments/{commentId} → { userId, username, text, createdAt }
 * - posts/{postId}/reports/{reportId} → { reporterId, reason, createdAt, status: 'pending' }
 * - users/{userId}/savedPosts/{postId} → { postId, savedAt }
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
  runTransaction,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../../../services/auth/authService';
import { getUsersPublicInfo } from '../user/user.service';

/**
 * Toggle like on a post
 * Creates or deletes posts/{postId}/likes/{userId}
 * AND syncs with legacy root 'likes' collection for backward compatibility
 */
export async function toggleLike(postId: string, userId: string): Promise<void> {
  if (!postId || !userId) {
    throw new Error('Post ID and User ID are required');
  }

  const likeRef = doc(db, 'posts', postId, 'likes', userId);
  const legacyLikeRef = doc(db, 'likes', `${userId}_${postId}`);
  const postRef = doc(db, 'posts', postId);

  try {
    await runTransaction(db, async (transaction) => {
      const likeSnap = await transaction.get(likeRef);
      const exists = likeSnap.exists();

      if (exists) {
        // Unlike: delete the document and legacy doc
        transaction.delete(likeRef);
        transaction.delete(legacyLikeRef);

        // Decrement like count
        transaction.update(postRef, {
          likeCount: increment(-1)
        });

      } else {
        // Like: create the document and legacy doc
        const timestamp = serverTimestamp();

        transaction.set(likeRef, {
          userId,
          createdAt: timestamp,
        });

        transaction.set(legacyLikeRef, {
          userId,
          postId,
          createdAt: timestamp,
        });

        // Increment like count
        transaction.update(postRef, {
          likeCount: increment(1)
        });
      }
    });
  } catch (error) {
    console.error('[toggleLike] Transaction failed:', error);
    throw error;
  }
}

/**
 * Listen to post like state for a specific user
 * Returns real-time boolean isLiked
 */
export function listenToPostLikeState(
  postId: string,
  userId: string,
  callback: (isLiked: boolean) => void
): Unsubscribe {
  if (!postId || !userId) {
    callback(false);
    return () => { };
  }

  const likeRef = doc(db, 'posts', postId, 'likes', userId);

  return onSnapshot(
    likeRef,
    (snapshot) => {
      callback(snapshot.exists());
    },
    (error) => {
      console.error('[listenToPostLikeState] Error:', error);
      callback(false);
    }
  );
}

/**
 * Listen to post like count
 * Returns real-time count of likes
 */
export function listenToPostLikeCount(
  postId: string,
  callback: (count: number) => void
): Unsubscribe {
  if (!postId) {
    callback(0);
    return () => { };
  }

  // Listen to the post document itself for accurate likeCount
  const postRef = doc(db, 'posts', postId);

  return onSnapshot(
    postRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback(data.likeCount || 0);
      } else {
        callback(0);
      }
    },
    (error) => {
      console.error('[listenToPostLikeCount] Error:', error);
      callback(0);
    }
  );
}

/**
 * Add comment to a post
 * Stores comment under posts/{postId}/comments/{commentId}
 */
export async function addComment(
  postId: string,
  userId: string,
  username: string,
  photoURL: string | null,
  text: string
): Promise<string> {
  if (!postId || !userId || !text.trim()) {
    throw new Error('Post ID, User ID, and text are required');
  }

  const commentsRef = collection(db, 'posts', postId, 'comments');
  const postRef = doc(db, 'posts', postId);

  // Create ref beforehand to get ID
  const commentRef = doc(commentsRef);

  const batch = writeBatch(db);

  batch.set(commentRef, {
    userId,
    username,
    photoURL: photoURL || null,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });

  // Atomic increment of comment count
  batch.update(postRef, {
    commentCount: increment(1)
  });

  await batch.commit();

  return commentRef.id;
}

/**
 * Listen to post comments
 * Returns ordered list by createdAt asc
 * Enriches comments with current user profile data if missing
 */
export function listenToPostComments(
  postId: string,
  callback: (comments: Array<{
    id: string;
    userId: string;
    username: string;
    photoURL: string | null;
    text: string;
    createdAt: Timestamp | null;
  }>) => void
): Unsubscribe {
  if (!postId) {
    callback([]);
    return () => { };
  }

  const commentsRef = collection(db, 'posts', postId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      const rawComments = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || '',
          username: data.username || '',
          photoURL: data.photoURL || null,
          text: data.text || '',
          createdAt: data.createdAt || null,
        };
      });

      // Identify comments that need profile enrichment
      const needsEnrichment = rawComments.filter(
        (comment) => !comment.username || !comment.photoURL || comment.username === 'Unknown'
      );

      if (needsEnrichment.length === 0) {
        // All comments have complete data
        callback(rawComments);
        return;
      }

      // Batch fetch user profiles for comments missing data
      const userIdsToFetch = [...new Set(needsEnrichment.map((c) => c.userId).filter(Boolean))];

      try {
        const userProfiles = await getUsersPublicInfo(userIdsToFetch);
        const userMap = new Map(userProfiles.map((u) => [u.uid, u]));

        // Enrich comments with current user profile data
        const enrichedComments = rawComments.map((comment) => {
          // If comment already has username and photoURL, use them
          if (comment.username && comment.photoURL && comment.username !== 'Unknown') {
            return comment;
          }

          // Otherwise, fetch from user profile
          const userProfile = userMap.get(comment.userId);
          if (userProfile) {
            return {
              ...comment,
              username: comment.username || userProfile.username || 'Unknown',
              photoURL: comment.photoURL || userProfile.photoURL || null,
            };
          }

          // Fallback if user profile not found
          return {
            ...comment,
            username: comment.username || 'Unknown',
            photoURL: comment.photoURL || null,
          };
        });

        callback(enrichedComments);
      } catch (error) {
        console.error('[listenToPostComments] Error enriching comments:', error);
        // Return comments as-is if enrichment fails
        callback(rawComments);
      }
    },
    (error) => {
      console.error('[listenToPostComments] Error:', error);
      callback([]);
    }
  );
}

/**
 * Toggle save post
 * Save → users/{userId}/savedPosts/{postId}
 * Unsave → delete doc
 */
export async function toggleSavePost(postId: string, userId: string): Promise<void> {
  if (!postId || !userId) {
    throw new Error('Post ID and User ID are required');
  }

  const savedPostRef = doc(db, 'users', userId, 'savedPosts', postId);
  const postRef = doc(db, 'posts', postId);

  const savedPostSnap = await getDoc(savedPostRef);

  const batch = writeBatch(db);

  if (savedPostSnap.exists()) {
    // Unsave: delete the document
    batch.delete(savedPostRef);
    // Optional: decrement savedCount on post if tracked
    batch.update(postRef, { savedCount: increment(-1) });
  } else {
    // Save: create the document
    batch.set(savedPostRef, {
      postId,
      savedAt: serverTimestamp(),
    });
    // Optional: increment savedCount on post if tracked
    batch.update(postRef, { savedCount: increment(1) });
  }

  await batch.commit();
}

/**
 * Listen to saved state for a post
 * Returns real-time boolean saved/not saved
 */
export function listenToSavedState(
  postId: string,
  userId: string,
  callback: (isSaved: boolean) => void
): Unsubscribe {
  if (!postId || !userId) {
    callback(false);
    return () => { };
  }

  const savedPostRef = doc(db, 'users', userId, 'savedPosts', postId);

  return onSnapshot(
    savedPostRef,
    (snapshot) => {
      callback(snapshot.exists());
    },
    (error) => {
      console.error('[listenToSavedState] Error:', error);
      callback(false);
    }
  );
}

/**
 * Report a post
 * Stores report under posts/{postId}/reports/{reportId}
 */
export async function reportPost(
  postId: string,
  reporterId: string,
  reason: string
): Promise<string> {
  if (!postId || !reporterId || !reason.trim()) {
    throw new Error('Post ID, Reporter ID, and reason are required');
  }

  const reportsRef = collection(db, 'posts', postId, 'reports');
  const reportRef = doc(reportsRef);

  await setDoc(reportRef, {
    reporterId,
    reason: reason.trim(),
    createdAt: serverTimestamp(),
    status: 'pending',
  });

  return reportRef.id;
}

/**
 * Get saved posts for a user
 * Fetches all documents from users/{userId}/savedPosts
 */
export async function getSavedPosts(userId: string): Promise<Array<{
  postId: string;
  savedAt: Timestamp | null;
}>> {
  if (!userId) {
    return [];
  }

  try {
    const savedPostsRef = collection(db, 'users', userId, 'savedPosts');
    const snapshot = await getDocs(savedPostsRef);

    return snapshot.docs.map((docSnap) => ({
      postId: docSnap.id,
      savedAt: docSnap.data().savedAt || null,
    }));
  } catch (error: any) {
    console.error('[getSavedPosts] Error:', error);
    return [];
  }
}

/**
 * Listen to saved posts for a user
 * Returns real-time list of saved post IDs
 */
export function listenToSavedPosts(
  userId: string,
  callback: (savedPostIds: string[]) => void
): Unsubscribe {
  if (!userId) {
    callback([]);
    return () => { };
  }

  const savedPostsRef = collection(db, 'users', userId, 'savedPosts');

  return onSnapshot(
    savedPostsRef,
    (snapshot) => {
      const postIds = snapshot.docs.map((docSnap) => docSnap.id);
      callback(postIds);
    },
    (error) => {
      console.error('[listenToSavedPosts] Error:', error);
      callback([]);
    }
  );
}
