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
} from '../../../core/firebase/compat';
import { db } from '../../../core/firebase';
import { getUsersPublicInfo } from '../user/user.service';
import { sendNotification } from '../../../services/notifications/NotificationAPI';

/**
 * Toggle like on a post
 * Creates or deletes posts/{postId}/likes/{userId}
 * AND syncs with legacy root 'likes' collection for backward compatibility
 */
export async function toggleLike(postId: string, userId: string, shouldLike?: boolean): Promise<void> {
  if (!postId || !userId) {
    throw new Error('Post ID and User ID are required');
  }

  console.log("🔥 TOGGLE LIKE HIT", { postId, userId });

  const likeRef = doc(db, 'posts', postId, 'likes', userId);
  const legacyLikeRef = doc(db, 'likes', `${userId}_${postId}`);
  const postRef = doc(db, 'posts', postId);

  try {
    const action = await runTransaction(db, async (transaction) => {
      // First, verify the post exists
      const postSnap = await transaction.get(postRef);
      if (!postSnap.exists()) {
        console.error('[toggleLike] Post does not exist:', postId);
        throw new Error('Post not found');
      }

      const likeSnap = await transaction.get(likeRef);
      const exists = likeSnap.exists();
      const currentLikeCount = postSnap.data().likeCount || 0;

      // Determine action based on intent or toggle
      let action: 'like' | 'unlike' | 'none';

      if (shouldLike !== undefined) {
        if (shouldLike && !exists) action = 'like';
        else if (!shouldLike && exists) action = 'unlike';
        else action = 'none';
      } else {
        action = exists ? 'unlike' : 'like';
      }

      if (action === 'none') {
        return;
      }

      if (action === 'unlike') {
        // Unlike: delete the document and legacy doc
        console.log('[toggleLike] Unliking post:', postId, 'Current count:', currentLikeCount);
        transaction.delete(likeRef);
        transaction.delete(legacyLikeRef);

        // Decrement like count (ensure it doesn't go below 0)
        const newCount = Math.max(0, currentLikeCount - 1);
        transaction.update(postRef, {
          likeCount: newCount
        });
        console.log('[toggleLike] New count after unlike:', newCount);

      } else {
        // Like: create the document and legacy doc
        console.log("🔥 [toggleLike] Liking post:", postId, "Current count:", currentLikeCount);
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
        const newCount = currentLikeCount + 1;
        transaction.update(postRef, {
          likeCount: newCount
        });
        console.log("🔥 [toggleLike] New count after like:", newCount);
      }

      return action;
    });

    console.log('[toggleLike] Transaction completed successfully for post:', postId);
    console.log("🔥 [toggleLike] Transaction result:", action);

    // NOTIFICATION TRIGGER
    // action is returned from runTransaction
    if (shouldLike !== false && action !== 'unlike' && action !== 'none') {
      console.log("🔥 ABOUT TO TRIGGER LIKE NOTIFICATION");
      try {
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          const authorId = postData.authorId || postData.userId || postData.createdBy;

          if (authorId && authorId !== userId) {
            console.log("🔥 SENDING LIKE NOTIFICATION TO:", authorId);
            // Fetch liker details
            const { getUserById } = await import('../../../services/users/usersService');
            const liker = await getUserById(userId);

            await sendNotification(authorId, {
              type: 'like',
              actorId: userId,
              postId: postId,
              message: 'liked your post',
              data: {
                postId,
                postImage: postData.mediaUrl || postData.imageUrl || (postData.media && postData.media[0]),
                sourceUsername: liker?.username || 'Someone',
                sourceAvatarUri: liker?.photoUrl
              }
            });
            console.log("✅ LIKE NOTIFICATION WRITE SUCCESS");
          } else {
            console.log("⚠️ SKIPPED: Self-like or missing authorId");
          }
        }
      } catch (nErr) {
        console.error("❌ LIKE NOTIFICATION FAILED", nErr);
      }
    }
  } catch (error) {
    console.error('[toggleLike] Transaction failed:', {
      postId,
      userId,
      error,
      code: (error as any)?.code,
      message: (error as any)?.message,
    });
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

  // NOTIFICATION TRIGGER
  console.log("🔥 ABOUT TO TRIGGER COMMENT NOTIFICATION");
  try {
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const postData = postSnap.data();
      const authorId = postData.authorId || postData.userId || postData.createdBy;

      if (authorId && authorId !== userId) {
        console.log("🔥 SENDING COMMENT NOTIFICATION TO:", authorId);
        // Fetch commenter details
        const { getUserById } = await import('../../../services/users/usersService');
        const commenter = await getUserById(userId);

        await sendNotification(authorId, {
          type: 'comment',
          actorId: userId,
          postId: postId,
          message: `commented: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          data: {
            postId,
            commentId: commentRef.id,
            text: text,
            postImage: postData.mediaUrl || postData.imageUrl || (postData.media && postData.media[0]),
            sourceUsername: commenter?.username || 'Someone',
            sourceAvatarUri: commenter?.photoUrl
          }
        });
        console.log("✅ COMMENT NOTIFICATION WRITE SUCCESS");
      }
    }
  } catch (nErr) {
    console.error("❌ COMMENT NOTIFICATION FAILED", nErr);
  }

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
export async function toggleSavePost(postId: string, userId: string, shouldSave?: boolean): Promise<void> {
  if (!postId || !userId) {
    throw new Error('Post ID and User ID are required');
  }

  const savedPostRef = doc(db, 'users', userId, 'savedPosts', postId);
  const postRef = doc(db, 'posts', postId);

  const savedPostSnap = await getDoc(savedPostRef);
  const exists = savedPostSnap.exists();

  const batch = writeBatch(db);

  // Determine action based on intent or toggle
  let action: 'save' | 'unsave' | 'none';

  if (shouldSave !== undefined) {
    if (shouldSave && !exists) action = 'save';
    else if (!shouldSave && exists) action = 'unsave';
    else action = 'none';
  } else {
    action = exists ? 'unsave' : 'save';
  }

  if (action === 'none') {
    return;
  }

  if (action === 'unsave') {
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
 * V1 MODERATION: Stores report in two locations:
 * 1. posts/{postId}/reports/{reportId} - for post-specific reports
 * 2. reports/{reportId} - global collection for admin dashboard
 */
export async function reportPost(
  postId: string,
  reporterId: string,
  reason: string,
  reportedUserId?: string // V1: Added to track reported user
): Promise<string> {
  if (!postId || !reporterId || !reason.trim()) {
    throw new Error('Post ID, Reporter ID, and reason are required');
  }

  // Write to post subcollection (existing behavior)
  const reportsRef = collection(db, 'posts', postId, 'reports');
  const reportRef = doc(reportsRef);

  const reportData = {
    reporterId,
    reportedUserId: reportedUserId || null, // V1: Track who is being reported
    reason: reason.trim(),
    createdAt: serverTimestamp(),
    status: 'pending',
  };

  await setDoc(reportRef, reportData);

  // V1: Also write to global reports collection for admin dashboard
  const globalReportRef = doc(collection(db, 'reports'));
  await setDoc(globalReportRef, {
    ...reportData,
    postId, // Include postId in global collection
    reportId: reportRef.id,
  });

  console.log('✅ Report created in both post subcollection and global reports');
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
/**
 * Get interaction states (liked, saved) for a batch of posts
 * Efficiently fetches status for the current user
 */
export async function getPostInteractionStates(
  userId: string,
  postIds: string[]
): Promise<Record<string, { isLiked: boolean; isSaved: boolean }>> {
  if (!userId || !postIds || postIds.length === 0) {
    return {};
  }

  const results: Record<string, { isLiked: boolean; isSaved: boolean }> = {};
  const uniquePostIds = [...new Set(postIds)];

  // Create promises for Likes and Saves
  // 1. Check Likes: using legacy 'likes/{userId}_{postId}' collection for checking existence
  const likePromises = uniquePostIds.map(async (postId) => {
    try {
      const docRef = doc(db, 'likes', `${userId}_${postId}`);
      const snap = await getDoc(docRef);
      return { postId, isLiked: snap.exists() };
    } catch (e) {
      console.warn(`Error checking like for ${postId}`, e);
      return { postId, isLiked: false };
    }
  });

  // 2. Check Saves: using 'users/{userId}/savedPosts/{postId}'
  const savePromises = uniquePostIds.map(async (postId) => {
    try {
      const docRef = doc(db, 'users', userId, 'savedPosts', postId);
      const snap = await getDoc(docRef);
      return { postId, isSaved: snap.exists() };
    } catch (e) {
      console.warn(`Error checking save for ${postId}`, e);
      return { postId, isSaved: false };
    }
  });

  // Execute in parallel
  const [likes, saves] = await Promise.all([
    Promise.all(likePromises),
    Promise.all(savePromises)
  ]);

  // Combine results
  uniquePostIds.forEach(postId => {
    const likeStatus = likes.find(l => l.postId === postId)?.isLiked || false;
    const saveStatus = saves.find(s => s.postId === postId)?.isSaved || false;
    results[postId] = { isLiked: likeStatus, isSaved: saveStatus };
  });

  return results;
}
