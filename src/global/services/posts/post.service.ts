/**
 * Global Post Service
 * 
 * Centralized service for fetching posts with author information
 * Used by home feed, profile screens, and post grids
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  Unsubscribe,
  startAfter,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../services/auth/authService';
import { normalizePost } from '../../../utils/normalize/normalizePost';
import { Post as FirestorePost } from '../../../types/firestore';

/**
 * Helper to chunk array into groups of max size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Get posts by their IDs
 * Fetches posts individually and in parallel
 * @param postIds - Array of post IDs to fetch
 * @returns Array of posts
 */
export async function getPostsByIds(postIds: string[]): Promise<PostWithAuthor[]> {
  if (!postIds || postIds.length === 0) {
    return [];
  }

  try {
    // Fetch all posts in parallel
    const postPromises = postIds.map(async (postId) => {
      try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        
        if (postSnap.exists()) {
          const raw = { id: postSnap.id, ...postSnap.data() };
          const normalized = normalizePost(raw);
          
          if (normalized && normalized.id && normalized.createdBy) {
            const rawImageURL = raw.imageURL || raw.imageUrl || raw.mediaUrl || raw.coverImage || 
                                raw.finalCroppedUrl || null;
            
            let imageURLs: string[] = [];
            
            if (Array.isArray(raw.mediaUrls) && raw.mediaUrls.length > 0) {
              imageURLs = raw.mediaUrls.filter((url: any) => url && typeof url === 'string');
            } else if (Array.isArray(raw.gallery) && raw.gallery.length > 0) {
              imageURLs = raw.gallery.filter((url: any) => url && typeof url === 'string');
            } else if (Array.isArray(raw.media) && raw.media.length > 0) {
              imageURLs = raw.media
                .map((item: any) => {
                  if (typeof item === 'string') return item;
                  if (item && typeof item === 'object') {
                    return item.url || item.uri || item.finalCroppedUrl || null;
                  }
                  return null;
                })
                .filter((url: any): url is string => url !== null && typeof url === 'string');
            } else {
              const imageURL = rawImageURL || normalized.imageURL || normalized.imageUrl || 
                              normalized.mediaUrl || normalized.coverImage || null;
              if (imageURL) {
                imageURLs = [imageURL];
              }
            }
            
            const post: PostWithAuthor = {
              ...normalized,
              authorId: normalized.createdBy || normalized.authorId || '',
              imageURL: rawImageURL,
              imageURLs: imageURLs.length > 0 ? imageURLs : (rawImageURL ? [rawImageURL] : []),
            };
            
            return post;
          }
        }
        return null;
      } catch (err: any) {
        console.warn('[getPostsByIds] Error fetching post:', postId, err);
        return null;
      }
    });
    
    const posts = await Promise.all(postPromises);
    return posts.filter((p): p is PostWithAuthor => p !== null);
  } catch (error: any) {
    console.error('[getPostsByIds] Error:', error);
    return [];
  }
}

/**
 * Post with author information
 */
export interface PostWithAuthor extends FirestorePost {
  authorId: string;
  authorUsername?: string;
  authorAvatar?: string;
  authorDisplayName?: string;
  isFollowingAuthor?: boolean;
  imageURL?: string | null;
  imageURLs?: string[];
}

/**
 * Get posts by user IDs (chunked for Firestore 'in' limit)
 * @param userIds - Array of user IDs to fetch posts from
 * @param limitCount - Maximum number of posts to return (default: 15)
 * @returns Array of posts sorted by createdAt desc, capped at limitCount
 */
export async function getPostsByUserIds(
  userIds: string[],
  limitCount: number = 15
): Promise<PostWithAuthor[]> {
  if (!userIds || userIds.length === 0) {
    return [];
  }

  try {
    const chunks = chunkArray(userIds, 10); // Firestore 'in' limit is 10
    const allPosts: PostWithAuthor[] = [];

    // Query each chunk
    for (const chunk of chunks) {
      try {
        const postsRef = collection(db, 'posts');
        const q = query(
          postsRef,
          where('createdBy', 'in', chunk),
          orderBy('createdAt', 'desc'),
          limit(limitCount * 2) // Fetch more to account for merging across chunks
        );

        const snapshot = await getDocs(q);

        snapshot.docs.forEach((docSnap) => {
          try {
            const raw = { id: docSnap.id, ...docSnap.data() };
            const normalized = normalizePost(raw);

            if (normalized && normalized.id && normalized.createdBy) {
              // Extract image URLs with comprehensive fallbacks
              const rawImageURL = raw.imageURL || raw.imageUrl || raw.mediaUrl || raw.coverImage || 
                                  raw.finalCroppedUrl || null;
              
              let imageURLs: string[] = [];
              
              if (Array.isArray(raw.mediaUrls) && raw.mediaUrls.length > 0) {
                imageURLs = raw.mediaUrls.filter((url: any) => url && typeof url === 'string');
              } else if (Array.isArray(raw.gallery) && raw.gallery.length > 0) {
                imageURLs = raw.gallery.filter((url: any) => url && typeof url === 'string');
              } else if (Array.isArray(raw.media) && raw.media.length > 0) {
                imageURLs = raw.media
                  .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') {
                      return item.url || item.uri || item.finalCroppedUrl || null;
                    }
                    return null;
                  })
                  .filter((url: any): url is string => url !== null && typeof url === 'string');
              } else if (Array.isArray(normalized.mediaUrls) && normalized.mediaUrls.length > 0) {
                imageURLs = normalized.mediaUrls.filter((url: any) => url && typeof url === 'string');
              } else if (Array.isArray(normalized.gallery) && normalized.gallery.length > 0) {
                imageURLs = normalized.gallery.filter((url: any) => url && typeof url === 'string');
              } else {
                const imageURL = rawImageURL || normalized.imageURL || normalized.imageUrl || 
                                normalized.mediaUrl || normalized.coverImage || null;
                if (imageURL) {
                  imageURLs = [imageURL];
                }
              }

              const finalImageURLs = imageURLs.length > 0 ? imageURLs : (rawImageURL ? [rawImageURL] : []);
              
              const post: PostWithAuthor = {
                ...normalized,
                authorId: normalized.createdBy || normalized.authorId || '',
                imageURL: rawImageURL,
                imageURLs: finalImageURLs,
              };

              allPosts.push(post);
            }
          } catch (err: any) {
            console.warn('[getPostsByUserIds] Error normalizing post:', docSnap.id, err);
          }
        });
      } catch (chunkErr: any) {
        console.error('[getPostsByUserIds] Error fetching chunk:', chunkErr);
      }
    }

    // Sort all posts by createdAt desc and apply limit
    allPosts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });

    // Return ONLY first 'limitCount' posts (max 15 for Following feed)
    return allPosts.slice(0, limitCount);
  } catch (error: any) {
    console.error('[getPostsByUserIds] Error:', error);
    return [];
  }
}

/**
 * Get newer posts by user IDs (for refresh logic)
 * @param userIds - Array of user IDs to fetch posts from
 * @param lastTimestamp - Timestamp to fetch posts created after
 * @returns Array of posts created after lastTimestamp, limited to 15
 */
export async function getNewerPostsByUserIds(
  userIds: string[],
  lastTimestamp: Timestamp | null | undefined
): Promise<PostWithAuthor[]> {
  if (!userIds || userIds.length === 0 || !lastTimestamp) {
    return [];
  }

  try {
    const chunks = chunkArray(userIds, 10);
    const allPosts: PostWithAuthor[] = [];

    for (const chunk of chunks) {
      try {
        const postsRef = collection(db, 'posts');
        const q = query(
          postsRef,
          where('createdBy', 'in', chunk),
          where('createdAt', '>', lastTimestamp),
          orderBy('createdAt', 'desc'),
          limit(15)
        );

        const snapshot = await getDocs(q);

        snapshot.docs.forEach((docSnap) => {
          try {
            const raw = { id: docSnap.id, ...docSnap.data() };
            const normalized = normalizePost(raw);

            if (normalized && normalized.id && normalized.createdBy) {
              const rawImageURL = raw.imageURL || raw.imageUrl || raw.mediaUrl || raw.coverImage || 
                                  raw.finalCroppedUrl || null;
              
              let imageURLs: string[] = [];
              
              if (Array.isArray(raw.mediaUrls) && raw.mediaUrls.length > 0) {
                imageURLs = raw.mediaUrls.filter((url: any) => url && typeof url === 'string');
              } else if (Array.isArray(raw.gallery) && raw.gallery.length > 0) {
                imageURLs = raw.gallery.filter((url: any) => url && typeof url === 'string');
              } else if (Array.isArray(raw.media) && raw.media.length > 0) {
                imageURLs = raw.media
                  .map((item: any) => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') {
                      return item.url || item.uri || item.finalCroppedUrl || null;
                    }
                    return null;
                  })
                  .filter((url: any): url is string => url !== null && typeof url === 'string');
              } else {
                const imageURL = rawImageURL || normalized.imageURL || normalized.imageUrl || 
                                normalized.mediaUrl || normalized.coverImage || null;
                if (imageURL) {
                  imageURLs = [imageURL];
                }
              }

              const post: PostWithAuthor = {
                ...normalized,
                authorId: normalized.createdBy || normalized.authorId || '',
                imageURL: rawImageURL,
                imageURLs: imageURLs.length > 0 ? imageURLs : (rawImageURL ? [rawImageURL] : []),
              };

              allPosts.push(post);
            }
          } catch (err: any) {
            console.warn('[getNewerPostsByUserIds] Error normalizing post:', docSnap.id, err);
          }
        });
      } catch (chunkErr: any) {
        console.error('[getNewerPostsByUserIds] Error fetching chunk:', chunkErr);
      }
    }

    // Sort and limit to 15
    allPosts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });

    return allPosts.slice(0, 15);
  } catch (error: any) {
    console.error('[getNewerPostsByUserIds] Error:', error);
    return [];
  }
}

/**
 * Get candidate posts for feed classification
 * Fetches a larger batch of recent posts that will be classified into FOLLOWING and FOR YOU feeds
 * @param options - Query options with cursor for pagination
 * @returns Posts and next cursor for pagination
 */
export async function getCandidatePostsForClassification(options?: {
  limit?: number;
  cursor?: QueryDocumentSnapshot | null;
}): Promise<{ posts: PostWithAuthor[]; nextCursor: QueryDocumentSnapshot | null }> {
  try {
    // Fetch larger batch (50-100) for classification
    const postsLimit = options?.limit || 80;

    const postsRef = collection(db, 'posts');
    let q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      limit(postsLimit)
    );

    if (options?.cursor) {
      q = query(q, startAfter(options.cursor));
    }

    const snapshot = await getDocs(q);
    const posts: PostWithAuthor[] = [];

    snapshot.docs.forEach((docSnap) => {
      try {
        const raw = { id: docSnap.id, ...docSnap.data() };
        const normalized = normalizePost(raw);

        if (normalized && normalized.id && normalized.createdBy) {
          const rawImageURL = raw.imageURL || raw.imageUrl || raw.mediaUrl || raw.coverImage || 
                              raw.finalCroppedUrl || null;
          
          let imageURLs: string[] = [];
          
          if (Array.isArray(raw.mediaUrls) && raw.mediaUrls.length > 0) {
            imageURLs = raw.mediaUrls.filter((url: any) => url && typeof url === 'string');
          } else if (Array.isArray(raw.gallery) && raw.gallery.length > 0) {
            imageURLs = raw.gallery.filter((url: any) => url && typeof url === 'string');
          } else if (Array.isArray(raw.media) && raw.media.length > 0) {
            imageURLs = raw.media
              .map((item: any) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                  return item.url || item.uri || item.finalCroppedUrl || null;
                }
                return null;
              })
              .filter((url: any): url is string => url !== null && typeof url === 'string');
          } else {
            const imageURL = rawImageURL || normalized.imageURL || normalized.imageUrl || 
                            normalized.mediaUrl || normalized.coverImage || null;
            if (imageURL) {
              imageURLs = [imageURL];
            }
          }

          const post: PostWithAuthor = {
            ...normalized,
            authorId: normalized.createdBy || normalized.authorId || '',
            imageURL: rawImageURL,
            imageURLs: imageURLs.length > 0 ? imageURLs : (rawImageURL ? [rawImageURL] : []),
          };

          posts.push(post);
        }
      } catch (err: any) {
        console.warn('[getCandidatePostsForClassification] Error normalizing post:', docSnap.id, err);
      }
    });

    // Get next cursor (last document for pagination)
    const nextCursor = snapshot.docs.length > 0 && snapshot.docs.length === postsLimit
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;

    return {
      posts,
      nextCursor,
    };
  } catch (error: any) {
    console.error('[getCandidatePostsForClassification] Error:', error);
    return { posts: [], nextCursor: null };
  }
}

/**
 * Get suggested posts (For You feed with cursor-based pagination)
 * @param options - Query options with cursor for pagination
 * @returns Posts and next cursor for pagination
 */
export async function getSuggestedPosts(options?: {
  limit?: number;
  cursor?: QueryDocumentSnapshot | null;
}): Promise<{ posts: PostWithAuthor[]; nextCursor: QueryDocumentSnapshot | null }> {
  try {
    const postsLimit = options?.limit || 10;

    const postsRef = collection(db, 'posts');
    let q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      limit(postsLimit)
    );

    if (options?.cursor) {
      q = query(q, startAfter(options.cursor));
    }

    const snapshot = await getDocs(q);
    const posts: PostWithAuthor[] = [];

    snapshot.docs.forEach((docSnap) => {
      try {
        const raw = { id: docSnap.id, ...docSnap.data() };
        const normalized = normalizePost(raw);

        if (normalized && normalized.id && normalized.createdBy) {
          const rawImageURL = raw.imageURL || raw.imageUrl || raw.mediaUrl || raw.coverImage || 
                              raw.finalCroppedUrl || null;
          
          let imageURLs: string[] = [];
          
          if (Array.isArray(raw.mediaUrls) && raw.mediaUrls.length > 0) {
            imageURLs = raw.mediaUrls.filter((url: any) => url && typeof url === 'string');
          } else if (Array.isArray(raw.gallery) && raw.gallery.length > 0) {
            imageURLs = raw.gallery.filter((url: any) => url && typeof url === 'string');
          } else if (Array.isArray(raw.media) && raw.media.length > 0) {
            imageURLs = raw.media
              .map((item: any) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                  return item.url || item.uri || item.finalCroppedUrl || null;
                }
                return null;
              })
              .filter((url: any): url is string => url !== null && typeof url === 'string');
          } else {
            const imageURL = rawImageURL || normalized.imageURL || normalized.imageUrl || 
                            normalized.mediaUrl || normalized.coverImage || null;
            if (imageURL) {
              imageURLs = [imageURL];
            }
          }

          const post: PostWithAuthor = {
            ...normalized,
            authorId: normalized.createdBy || normalized.authorId || '',
            imageURL: rawImageURL,
            imageURLs: imageURLs.length > 0 ? imageURLs : (rawImageURL ? [rawImageURL] : []),
          };

          posts.push(post);
        }
      } catch (err: any) {
        console.warn('[getSuggestedPosts] Error normalizing post:', docSnap.id, err);
      }
    });

    // Get next cursor (last document for pagination)
    const nextCursor = snapshot.docs.length > 0 && snapshot.docs.length === postsLimit
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;

    return {
      posts,
      nextCursor,
    };
  } catch (error: any) {
    console.error('[getSuggestedPosts] Error:', error);
    return { posts: [], nextCursor: null };
  }
}

/**
 * Get newer suggested posts (for pull-to-refresh)
 * @param lastTimestamp - Timestamp to fetch posts created after
 * @returns Array of posts created after lastTimestamp
 */
export async function getNewerSuggestedPosts(
  lastTimestamp: Timestamp | null | undefined
): Promise<PostWithAuthor[]> {
  if (!lastTimestamp) {
    return [];
  }

  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('createdAt', '>', lastTimestamp),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const posts: PostWithAuthor[] = [];

    snapshot.docs.forEach((docSnap) => {
      try {
        const raw = { id: docSnap.id, ...docSnap.data() };
        const normalized = normalizePost(raw);

        if (normalized && normalized.id && normalized.createdBy) {
          const rawImageURL = raw.imageURL || raw.imageUrl || raw.mediaUrl || raw.coverImage || 
                              raw.finalCroppedUrl || null;
          
          let imageURLs: string[] = [];
          
          if (Array.isArray(raw.mediaUrls) && raw.mediaUrls.length > 0) {
            imageURLs = raw.mediaUrls.filter((url: any) => url && typeof url === 'string');
          } else if (Array.isArray(raw.gallery) && raw.gallery.length > 0) {
            imageURLs = raw.gallery.filter((url: any) => url && typeof url === 'string');
          } else if (Array.isArray(raw.media) && raw.media.length > 0) {
            imageURLs = raw.media
              .map((item: any) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                  return item.url || item.uri || item.finalCroppedUrl || null;
                }
                return null;
              })
              .filter((url: any): url is string => url !== null && typeof url === 'string');
          } else {
            const imageURL = rawImageURL || normalized.imageURL || normalized.imageUrl || 
                            normalized.mediaUrl || normalized.coverImage || null;
            if (imageURL) {
              imageURLs = [imageURL];
            }
          }

          const post: PostWithAuthor = {
            ...normalized,
            authorId: normalized.createdBy || normalized.authorId || '',
            imageURL: rawImageURL,
            imageURLs: imageURLs.length > 0 ? imageURLs : (rawImageURL ? [rawImageURL] : []),
          };

          posts.push(post);
        }
      } catch (err: any) {
        console.warn('[getNewerSuggestedPosts] Error normalizing post:', docSnap.id, err);
      }
    });

    return posts;
  } catch (error: any) {
    console.error('[getNewerSuggestedPosts] Error:', error);
    return [];
  }
}

/**
 * Listen to posts by user IDs (realtime)
 * @param userIds - Array of user IDs to listen to
 * @param callback - Callback with array of posts
 * @returns Unsubscribe function
 */
export function listenToPostsByUserIds(
  userIds: string[],
  callback: (posts: PostWithAuthor[]) => void
): Unsubscribe {
  if (!userIds || userIds.length === 0) {
    callback([]);
    return () => {};
  }

  try {
    const chunks = chunkArray(userIds, 10);
    const unsubscribes: Unsubscribe[] = [];
    const allPosts: PostWithAuthor[] = [];

    const updateCallback = () => {
      // Merge all posts and sort
      const merged: PostWithAuthor[] = [];
      chunks.forEach(() => {
        // This is a simplified version - in production, you'd track posts per chunk
      });
      callback(allPosts);
    };

    // Set up listeners for each chunk
    chunks.forEach((chunk) => {
      try {
        const postsRef = collection(db, 'posts');
        const q = query(
          postsRef,
          where('createdBy', 'in', chunk),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const chunkPosts: PostWithAuthor[] = [];
            snapshot.docs.forEach((docSnap) => {
              try {
                const rawData = { id: docSnap.id, ...docSnap.data() };
                const normalized = normalizePost(rawData);

                if (normalized && normalized.id && normalized.createdBy) {
                  // Extract image URLs with comprehensive fallbacks (same logic as getPostsByUserIds)
                  const rawImageURL = rawData.imageURL || rawData.imageUrl || rawData.mediaUrl || rawData.coverImage || 
                                      rawData.finalCroppedUrl || null;
                  
                  let imageURLs: string[] = [];
                  
                  if (Array.isArray(rawData.mediaUrls) && rawData.mediaUrls.length > 0) {
                    imageURLs = rawData.mediaUrls.filter((url: any) => url && typeof url === 'string');
                  } else if (Array.isArray(rawData.gallery) && rawData.gallery.length > 0) {
                    imageURLs = rawData.gallery.filter((url: any) => url && typeof url === 'string');
                  } else if (Array.isArray(rawData.media) && rawData.media.length > 0) {
                    imageURLs = rawData.media
                      .map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') {
                          return item.url || item.uri || item.finalCroppedUrl || null;
                        }
                        return null;
                      })
                      .filter((url: any): url is string => url !== null && typeof url === 'string');
                  } else if (Array.isArray(normalized.mediaUrls) && normalized.mediaUrls.length > 0) {
                    imageURLs = normalized.mediaUrls.filter((url: any) => url && typeof url === 'string');
                  } else if (Array.isArray(normalized.gallery) && normalized.gallery.length > 0) {
                    imageURLs = normalized.gallery.filter((url: any) => url && typeof url === 'string');
                  } else if (Array.isArray(normalized.media) && normalized.media.length > 0) {
                    imageURLs = normalized.media
                      .map((item: any) => {
                        if (typeof item === 'string') return item;
                        if (item && typeof item === 'object') {
                          return item.url || item.uri || null;
                        }
                        return null;
                      })
                      .filter((url: any): url is string => url !== null && typeof url === 'string');
                  } else {
                    const imageURL = rawImageURL || normalized.imageURL || normalized.imageUrl || 
                                    normalized.mediaUrl || normalized.coverImage || null;
                    if (imageURL) {
                      imageURLs = [imageURL];
                    }
                  }

                  const finalImageURL = rawImageURL || normalized.imageURL || normalized.imageUrl || 
                                       normalized.mediaUrl || normalized.coverImage || null;

                  const post: PostWithAuthor = {
                    ...normalized,
                    authorId: normalized.createdBy,
                    imageURL: finalImageURL,
                    imageURLs: imageURLs.length > 0 ? imageURLs : (finalImageURL ? [finalImageURL] : []),
                  };
                  chunkPosts.push(post);
                }
              } catch (err: any) {
                console.warn('[listenToPostsByUserIds] Error normalizing post:', docSnap.id, err);
              }
            });

            // Update allPosts and trigger callback
            allPosts.length = 0;
            allPosts.push(...chunkPosts);
            allPosts.sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
              const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
              return bTime - aTime;
            });
            callback([...allPosts]);
          },
          (error: any) => {
            console.error('[listenToPostsByUserIds] Listener error:', error);
            callback([]);
          }
        );

        unsubscribes.push(unsubscribe);
      } catch (chunkErr: any) {
        console.error('[listenToPostsByUserIds] Error setting up listener for chunk:', chunkErr);
      }
    });

    // Return combined unsubscribe function
    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  } catch (error: any) {
    console.error('[listenToPostsByUserIds] Setup error:', error);
    callback([]);
    return () => {};
  }
}

