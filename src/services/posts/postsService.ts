/**
 * Posts API
 * 
 * All post-related CRUD operations, feed fetching, comments, and media uploads.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  limit as firestoreLimit,
  orderBy,
  startAfter,
  increment,
  runTransaction,
  writeBatch,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../auth/authService';
import { retryWithBackoff } from '../../utils/retry';
import { isOfflineError, safeFirestoreRead } from '../../utils/offlineHandler';
import {
  validateUserId,
  normalizePostDocument,
  resolveMediaUrlIfNeeded,
  buildSafeQuery,
  sortByCreatedAtDesc,
  safeGetDocs,
} from '../../utils/safeFirestore';
import { normalizePost as normalizePostGlobal } from '../../utils/normalize/normalizePost';

function normalizeUserPost(docSnap: QueryDocumentSnapshot<DocumentData>) {
  // Use global normalizer for comprehensive field normalization
  const normalized = normalizePostGlobal(docSnap);
  if (!normalized) return null;
  
  // Also use safeFirestore normalizer for media URL extraction
  const safeNormalized = normalizePostDocument(docSnap);
  const mediaUrl = safeNormalized?.mediaUrl || normalized.mediaUrl || normalized.imageURL || '';
  
  return {
    id: normalized.id,
    authorId: normalized.createdBy || normalized.userId || normalized.ownerId || normalized.authorId || null,
    media: mediaUrl ? [mediaUrl] : (normalized.gallery || []),
    caption: normalized.caption || '',
    createdAt: normalized.createdAt,
    likeCount: normalized.likeCount || normalized.likesCount || 0,
    commentCount: normalized.commentCount || normalized.commentsCount || 0,
    savedCount: normalized.savedCount || 0,
    metadata: (normalized as any).metadata,
    aspectRatio: (typeof (normalized as any).aspectRatio === 'number') ? (normalized as any).aspectRatio : undefined,
    hashtags: (Array.isArray((normalized as any).hashtags) ? (normalized as any).hashtags : []) as string[],
  };
}

// ---------- Types ----------

export interface Post {
  id: string;
  authorId: string;
  media: string[];
  caption?: string;
  createdAt: any;
  likeCount: number;
  commentCount: number;
  savedCount?: number;
  metadata?: any;
  aspectRatio?: number;
  hashtags?: string[];
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatarUri?: string;
  text: string;
  timestamp: number;
  likeCount?: number;
  isLiked?: boolean;
}

interface PaginationOptions {
  limit?: number;
  lastDoc?: any;
}

interface PaginationResult<T> {
  posts: T[];
  nextCursor?: any;
  hasMore?: boolean;
}

interface MediaUploadResult {
  url: string;
  meta: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
  };
}

// ---------- Helper Functions ----------

/**
 * Normalize Firestore document to Post object (defensive)
 */
function normalizePost(docSnap: QueryDocumentSnapshot<DocumentData>): Post {
  const data = docSnap.data() || {};

  let createdAt: any = 0;
  if (data.createdAt?.toMillis) {
    createdAt = data.createdAt.toMillis();
  } else if (typeof data.createdAt?.seconds === 'number') {
    createdAt = data.createdAt.seconds * 1000;
  } else if (typeof data.createdAt === 'number') {
    createdAt = data.createdAt;
  }

  const mediaPath =
    data.mediaUrl ||
    data.imageUrl ||
    (Array.isArray(data.files) && data.files[0]?.url) ||
    (Array.isArray(data.mediaUrls) && data.mediaUrls[0]) ||
    data.photoUrl ||
    null;

  return {
    id: docSnap.id,
    authorId: data.authorId || data.userId || data.createdBy || data.ownerId || '',
    media: mediaPath ? [mediaPath] : [],
    caption: data.caption || '',
    createdAt,
    likeCount: Number(data.likeCount || 0),
    commentCount: Number(data.commentCount || 0),
    savedCount: Number(data.savedCount || 0),
    metadata: data.metadata,
    aspectRatio: data.aspectRatio,
    hashtags: data.hashtags || [],
  };
}

/**
 * Extract hashtags from caption
 */
function extractHashtags(caption: string): string[] {
  const hashtagRegex = /#[\w]+/g;
  const matches = caption.match(hashtagRegex);
  return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
}

// ---------- Media Upload ----------

/**
 * Upload media file to Firebase Storage
 * @param file - File object with uri and type
 * @param pathPrefix - Storage path prefix (e.g., 'posts', 'profile')
 * @returns Upload result with URL and metadata
 */
export async function uploadMedia(
  file: { uri: string; type: 'image' | 'video' },
  pathPrefix: string = 'posts'
): Promise<MediaUploadResult> {
  try {
    const timestamp = Date.now();
    const fileName = `${pathPrefix}/${timestamp}_${Math.random().toString(36).substring(7)}.${file.type === 'image' ? 'jpg' : 'mp4'}`;
    const storageRef = ref(storage, fileName);
    
    // For React Native, we need to convert URI to blob
    // This is a placeholder - actual implementation depends on react-native-fs or similar
    const response = await fetch(file.uri);
    const blob = await response.blob();
    
    const uploadTask = uploadBytesResumable(storageRef, blob);
    
    await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking can be added here
        },
        (error) => reject(error),
        () => resolve(uploadTask.snapshot)
      );
    });
    
    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
    
    return {
      url: downloadURL,
      meta: {
        // Metadata extraction would go here
        // For now, return placeholder
      },
    };
  } catch (error: any) {
    console.error('Error uploading media:', error);
    throw { code: 'upload-media-failed', message: 'Failed to upload media file' };
  }
}

// ---------- Post CRUD ----------

/**
 * Create a new post
 * @param authorId - Author user ID
 * @param payload - Post data
 * @param mediaFiles - Array of media files to upload
 * @returns Created post
 */
export async function createPost(
  authorId: string,
  payload: Partial<Post>,
  mediaFiles?: { uri: string; type: 'image' | 'video' }[]
): Promise<Post> {
  try {
    // Upload media files first
    const mediaUrls: string[] = [];
    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const uploadResult = await uploadMedia(file, 'posts');
        mediaUrls.push(uploadResult.url);
      }
    }
    
    // Extract hashtags from caption
    const hashtags = payload.caption ? extractHashtags(payload.caption) : [];
    
    const postData = {
      authorId,
      media: mediaUrls,
      caption: payload.caption || '',
      createdAt: serverTimestamp(),
      likeCount: 0,
      commentCount: 0,
      savedCount: 0,
      hashtags,
      ...payload.metadata,
    };
    
    const postsRef = collection(db, 'posts');
    const docRef = await addDoc(postsRef, postData);
    
    return {
      id: docRef.id,
      ...postData,
      createdAt: new Date(),
    } as Post;
  } catch (error: any) {
    console.error('Error creating post:', error);
    throw { code: 'create-post-failed', message: 'Failed to create post' };
  }
}

/**
 * Update post
 * @param postId - Post document ID
 * @param data - Partial post data to update
 */
export async function updatePost(postId: string, data: Partial<Post>): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId);
    const updateData: any = { ...data };
    
    // Extract hashtags if caption is updated
    if (updateData.caption) {
      updateData.hashtags = extractHashtags(updateData.caption);
    }
    
    delete updateData.id;
    await updateDoc(postRef, updateData);
  } catch (error: any) {
    console.error('Error updating post:', error);
    throw { code: 'update-post-failed', message: 'Failed to update post' };
  }
}

/**
 * Delete post
 * @param postId - Post document ID
 */
export async function deletePost(postId: string): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
    
    // Note: In production, you may want to delete associated comments and media files
  } catch (error: any) {
    console.error('Error deleting post:', error);
    throw { code: 'delete-post-failed', message: 'Failed to delete post' };
  }
}

/**
 * Fetch feed posts for a user
 * @param options - Pagination options and filters
 * @returns Paginated posts
 */
export async function fetchFeed(options?: {
  userId?: string;
  limit?: number;
  lastDoc?: any;
}): Promise<{ posts: Post[]; lastDoc?: any; hasMore: boolean }> {
  return safeFirestoreRead(
    async () => {
      return await retryWithBackoff(async () => {
        const limit = options?.limit || 10;
        const postsRef = collection(db, 'posts');
        
        let q = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          firestoreLimit(limit + 1) // Fetch one extra to check if there's more
        );
        
        if (options?.lastDoc) {
          q = query(q, startAfter(options.lastDoc));
        }
        
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs;
        const hasMore = docs.length > limit;
        const postsToReturn = hasMore ? docs.slice(0, limit) : docs;
        
        const posts = postsToReturn.map(normalizePost);
        const lastDoc = postsToReturn[postsToReturn.length - 1];
        
        return {
          posts,
          lastDoc,
          hasMore,
        };
      }, {
        maxRetries: 3,
        retryableErrors: ['unavailable', 'deadline-exceeded', 'network-error', 'failed-precondition'],
      });
    },
    { posts: [], lastDoc: null, hasMore: false } // Default value when offline
  );
}

/**
 * Fetch posts by a specific user
 * @param userId - User ID
 * @param options - Pagination options
 * @returns Paginated posts
 */
export async function fetchPostsByUser(
  userId: string,
  options?: PaginationOptions
): Promise<PaginationResult<Post>> {
  // CRITICAL: Validate userId before any operations
  if (!validateUserId(userId)) {
    console.warn('[fetchPostsByUser] Invalid userId, returning empty list');
    return { posts: [], nextCursor: undefined };
  }
  
  return safeFirestoreRead(
    async () => {
      return await retryWithBackoff(async () => {
        const limit = options?.limit || 20;
        const postsRef = collection(db, 'posts');

        // Build safe query with orderBy fallback
        let q;
        try {
          const baseQuery = query(postsRef, where('createdBy', '==', userId));
          q = buildSafeQuery(
            baseQuery,
            (base) => query(base, orderBy('createdAt', 'desc'), firestoreLimit(limit)),
            (base) => query(base, firestoreLimit(limit))
          );
        } catch (err: any) {
          // If createdBy fails, try userId field
          console.warn('[fetchPostsByUser] createdBy query failed, trying userId:', err?.message);
          const userIdBaseQuery = query(postsRef, where('userId', '==', userId));
          q = buildSafeQuery(
            userIdBaseQuery,
            (base) => query(base, orderBy('createdAt', 'desc'), firestoreLimit(limit)),
            (base) => query(base, firestoreLimit(limit))
          );
        }

        if (options?.lastDoc) {
          q = query(q, startAfter(options.lastDoc));
        }

        const docs = await safeGetDocs(q);

        // Normalize and resolve media safely - filter out null results
        const normalized = docs
          .map(normalizeUserPost)
          .filter((p): p is NonNullable<typeof p> => p !== null);
        
        const resolved = await Promise.all(
          normalized.map(async (p) => {
            if (!p || !p.media || p.media.length === 0) return p;
            const firstPath = p.media[0];
            if (!firstPath) return p;
            try {
              const resolvedUrl = await resolveMediaUrlIfNeeded(firstPath);
              return {
                ...p,
                media: resolvedUrl ? [resolvedUrl] : [],
              };
            } catch (err) {
              console.warn('[fetchPostsByUser] Error resolving media URL:', err);
              return p;
            }
          })
        );

        // Client-side sort by createdAt desc to cover cases without orderBy
        const sorted = sortByCreatedAtDesc(resolved);

        const lastDoc = docs[docs.length - 1];

        return {
          posts: sorted,
          nextCursor: docs.length === limit ? lastDoc : undefined,
        };
      }, {
        maxRetries: 3,
        retryableErrors: ['unavailable', 'deadline-exceeded', 'network-error'],
      });
    },
    { posts: [], nextCursor: undefined }
  );
}

// ---------- Comments ----------

/**
 * Get comments for a post
 * @param postId - Post ID
 * @returns Array of comments
 */
export async function getComments(postId: string): Promise<Comment[]> {
  try {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      postId,
      userId: doc.data().userId,
      username: doc.data().username,
      avatarUri: doc.data().avatarUri,
      text: doc.data().text,
      timestamp: doc.data().timestamp?.toMillis?.() || doc.data().timestamp,
      likeCount: doc.data().likeCount || 0,
      isLiked: doc.data().isLiked || false,
    }));
  } catch (error: any) {
    console.error('Error getting comments:', error);
    throw { code: 'get-comments-failed', message: 'Failed to fetch comments' };
  }
}

/**
 * Add a comment to a post
 * @param postId - Post ID
 * @param userId - User ID of commenter
 * @param text - Comment text
 * @returns Comment ID
 */
export async function addComment(
  postId: string,
  userId: string,
  text: string
): Promise<{ commentId: string }> {
  try {
    // Get user data for comment
    const { getUserById } = await import('./UsersAPI');
    const user = await getUserById(userId);
    
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const commentData = {
      userId,
      username: user?.username || 'Unknown',
      avatarUri: user?.photoUrl,
      text,
      timestamp: serverTimestamp(),
      likeCount: 0,
    };
    
    // Use batch write for atomicity (addDoc + increment count)
    const batch = writeBatch(db);
    const commentRef = doc(commentsRef);
    batch.set(commentRef, commentData);
    
    // Increment comment count atomically
    const postRef = doc(db, 'posts', postId);
    batch.update(postRef, {
      commentCount: increment(1),
    });
    
    await batch.commit();
    
    return { commentId: commentRef.id };
  } catch (error: any) {
    console.error('Error adding comment:', error);
    throw { code: 'add-comment-failed', message: 'Failed to add comment' };
  }
}

/**
 * Delete a comment
 * @param postId - Post ID
 * @param commentId - Comment ID
 */
export async function deleteComment(postId: string, commentId: string): Promise<void> {
  try {
    // Use batch write for atomicity (delete comment + decrement count)
    const batch = writeBatch(db);
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    batch.delete(commentRef);
    
    // Decrement comment count atomically
    const postRef = doc(db, 'posts', postId);
    batch.update(postRef, {
      commentCount: increment(-1),
    });
    
    await batch.commit();
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    throw { code: 'delete-comment-failed', message: 'Failed to delete comment' };
  }
}

// ---------- Save/Unsave ----------

/**
 * Save a post for a user
 * @param userId - User ID
 * @param postId - Post ID
 */
export async function savePost(userId: string, postId: string): Promise<void> {
  try {
    const savedRef = doc(db, 'users', userId, 'saved', postId);
    await setDoc(savedRef, {
      postId,
      savedAt: serverTimestamp(),
    });
    
    // Increment saved count
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      savedCount: increment(1),
    });
  } catch (error: any) {
    console.error('Error saving post:', error);
    throw { code: 'save-post-failed', message: 'Failed to save post' };
  }
}

/**
 * Unsave a post for a user
 * @param userId - User ID
 * @param postId - Post ID
 */
export async function unsavePost(userId: string, postId: string): Promise<void> {
  try {
    const savedRef = doc(db, 'users', userId, 'saved', postId);
    await deleteDoc(savedRef);
    
    // Decrement saved count
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      savedCount: increment(-1),
    });
  } catch (error: any) {
    console.error('Error unsaving post:', error);
    throw { code: 'unsave-post-failed', message: 'Failed to unsave post' };
  }
}

// ---------- Count Updates ----------

/**
 * Increment like count for a post
 * @param postId - Post ID
 * @param delta - Amount to increment (default: 1)
 */
export async function incrementLikeCount(postId: string, delta: number = 1): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      likeCount: increment(delta),
    });
  } catch (error: any) {
    console.error('Error incrementing like count:', error);
    throw { code: 'increment-like-failed', message: 'Failed to update like count' };
  }
}

/**
 * Increment comment count for a post
 * @param postId - Post ID
 * @param delta - Amount to increment (default: 1)
 */
export async function incrementCommentCount(postId: string, delta: number = 1): Promise<void> {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      commentCount: increment(delta),
    });
  } catch (error: any) {
    console.error('Error incrementing comment count:', error);
    throw { code: 'increment-comment-failed', message: 'Failed to update comment count' };
  }
}

// ---------- Hashtag Search ----------

/**
 * Search hashtags
 * @param query - Search query
 * @param limit - Maximum results (default: 20)
 * @returns Array of hashtag results with counts
 */
export async function searchHashtags(
  query: string,
  limit: number = 20
): Promise<{ tag: string; count: number }[]> {
  try {
    const searchQuery = query.toLowerCase().trim().replace('#', '');
    if (!searchQuery) {
      return [];
    }
    
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('hashtags', 'array-contains', searchQuery),
      firestoreLimit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Count occurrences (simplified - in production, use a hashtags collection)
    const tagCounts: Record<string, number> = {};
    querySnapshot.docs.forEach(doc => {
      const hashtags = doc.data().hashtags || [];
      hashtags.forEach((tag: string) => {
        if (tag.includes(searchQuery)) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      });
    });
    
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error: any) {
    console.error('Error searching hashtags:', error);
    throw { code: 'search-hashtags-failed', message: 'Failed to search hashtags' };
  }
}

