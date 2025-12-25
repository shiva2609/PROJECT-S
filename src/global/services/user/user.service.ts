/**
 * Global User Service
 * 
 * Centralized service for fetching user information with realtime updates
 * Used by all profile screens, followers/following lists, and post grids
 */

import { doc, onSnapshot, getDoc, getDocs, collection, query, where, orderBy, Unsubscribe, getCountFromServer } from '../../../core/firebase/compat';
import { db } from '../../../core/firebase';
import { normalizeUser } from '../../../utils/normalize/normalizeUser';
import { normalizePost } from '../../../utils/normalize/normalizePost';
import { Post } from '../../../types/firestore';
import type { UserPublicInfo, UserCounts } from './user.types';
import * as FollowService from '../../../services/follow/followRealtimeService';

// In-memory cache for user public info (session-based with TTL)
interface CacheEntry {
  data: UserPublicInfo;
  timestamp: number;
}

const userCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 60000; // 60 seconds

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
 * Get user public info (one-time fetch)
 * @param userId - User ID to fetch
 * @returns User public info or null
 */
export async function getUserPublicInfo(userId: string): Promise<UserPublicInfo | null> {
  if (!userId) return null;

  // Check cache first
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    const raw = { id: snapshot.id, ...snapshot.data() };

    // Check raw data directly for username fields (before normalization)
    const rawUsername = (raw as any).username || (raw as any).handle || (raw as any).userTag?.replace('@', '') || '';

    const normalized = normalizeUser(raw);

    if (!normalized) {
      return null;
    }

    // Try to get username from multiple possible sources
    let username = rawUsername || normalized.username || '';

    // If still empty, try to extract from displayName or use a portion of user ID
    if (!username || username.trim() === '') {
      const displayName = normalized.name || normalized.fullName || normalized.displayName || '';
      if (displayName && displayName.trim() !== '') {
        // Use displayName as fallback if it looks like a username (no spaces, alphanumeric)
        if (!displayName.includes(' ') && /^[a-zA-Z0-9_]+$/.test(displayName)) {
          username = displayName;
        } else {
          // Use first 8 chars of user ID as last resort (better than "Unknown")
          username = (normalized.id || userId || '').substring(0, 8);
        }
      } else {
        // Use first 8 chars of user ID as last resort (better than "Unknown")
        username = (normalized.id || userId || '').substring(0, 8);
      }
    }

    console.log('[getUserPublicInfo] Username resolved:', { userId, rawUsername, normalizedUsername: normalized.username, finalUsername: username });

    // Prepare displayName first (needed for username fallback)
    const displayName = normalized.name || normalized.fullName || normalized.displayName || '';

    // CRITICAL: Ensure username is NEVER empty - use displayName as fallback
    // This prevents "Unknown" from appearing in UI components
    let finalUsername = username;
    if (!finalUsername || finalUsername.trim() === '') {
      finalUsername = displayName || (normalized.id || userId || '').substring(0, 8);
    }

    const userInfo: UserPublicInfo = {
      uid: normalized.id || userId,
      username: finalUsername, // ✅ NEVER empty - always has fallback
      displayName: displayName || finalUsername || 'User', // ✅ Falls back to username if needed
      photoURL: normalized.photoUrl || normalized.profilePic || normalized.profilePhotoUrl || '',
      bio: normalized.bio || '',
      verified: normalized.verified || false,
      email: normalized.email,
      accountType: normalized.accountType || (raw as any).accountType || (raw as any).role,
      aboutMe: (normalized as any).aboutMe || (raw as any).aboutMe || (raw as any).about || '',
      travelPlan: normalized.travelPlan || [],
      onboardingComplete: normalized.onboardingComplete || false,
      isNewUser: (normalized as any).isNewUser ?? (raw as any).isNewUser ?? false,
    };

    // Update cache
    userCache.set(userId, { data: userInfo, timestamp: Date.now() });

    return userInfo;
  } catch (error: any) {
    console.error('[getUserPublicInfo] Error:', error);
    return null;
  }
}

/**
 * Get multiple users' public info (batched with chunking for Firestore 'in' limit)
 * @param uids - Array of user IDs to fetch
 * @returns Array of user public info (may be shorter than input if some users don't exist)
 */
export async function getUsersPublicInfo(uids: string[]): Promise<UserPublicInfo[]> {
  if (!uids || uids.length === 0) return [];

  // Filter out cached entries
  const uncachedUids: string[] = [];
  const cachedResults: UserPublicInfo[] = [];
  const now = Date.now();

  uids.forEach((uid) => {
    const cached = userCache.get(uid);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      cachedResults.push(cached.data);
    } else {
      uncachedUids.push(uid);
    }
  });

  if (uncachedUids.length === 0) {
    return cachedResults;
  }

  try {
    // Firestore 'in' query limit is 10, so chunk if needed
    const chunks = chunkArray(uncachedUids, 10);
    const results: UserPublicInfo[] = [...cachedResults];

    // Fetch users by document ID (users collection uses doc ID as user ID)
    // Firestore doesn't support 'in' queries on document IDs, so we fetch individually
    // but we can batch the promises for efficiency
    const fetchPromises = uncachedUids.map(async (uid) => {
      try {
        const userInfo = await getUserPublicInfo(uid);
        return userInfo;
      } catch (err) {
        console.warn('[getUsersPublicInfo] Error fetching user:', uid, err);
        return null;
      }
    });

    const fetchedUsers = await Promise.all(fetchPromises);
    const validUsers = fetchedUsers.filter((user): user is UserPublicInfo => user !== null);
    results.push(...validUsers);

    return results;
  } catch (error: any) {
    console.error('[getUsersPublicInfo] Error:', error);
    // Fallback to individual fetches
    const fallbackResults: UserPublicInfo[] = [...cachedResults];
    for (const uid of uncachedUids) {
      try {
        const userInfo = await getUserPublicInfo(uid);
        if (userInfo) {
          fallbackResults.push(userInfo);
        }
      } catch (err) {
        console.warn('[getUsersPublicInfo] Fallback error for user:', uid, err);
      }
    }
    return fallbackResults;
  }
}

/**
 * Listen to user public info (realtime)
 * @param userId - User ID to listen to
 * @param callback - Callback with user public info or null
 * @returns Unsubscribe function
 */
export function listenToUserPublicInfo(
  userId: string,
  callback: (user: UserPublicInfo | null) => void
): Unsubscribe {
  if (!userId) {
    callback(null);
    return () => { };
  }

  const userRef = doc(db, 'users', userId);

  try {
    return onSnapshot(
      userRef,
      (snapshot) => {
        try {
          if (!snapshot.exists()) {
            callback(null);
            return;
          }

          const raw = { id: snapshot.id, ...snapshot.data() };
          const normalized = normalizeUser(raw);

          if (!normalized) {
            callback(null);
            return;
          }

          // Prepare displayName first (needed for username fallback)
          const displayName = normalized.name || normalized.fullName || normalized.displayName || '';

          // CRITICAL: Ensure username is NEVER empty - use displayName as fallback
          let finalUsername = normalized.username || '';
          if (!finalUsername || finalUsername.trim() === '') {
            finalUsername = displayName || (normalized.id || userId || '').substring(0, 8);
          }

          const userInfo: UserPublicInfo = {
            uid: normalized.id || userId,
            username: finalUsername, // ✅ NEVER empty - always has fallback
            displayName: displayName || finalUsername || 'User', // ✅ Falls back to username if needed
            photoURL: normalized.photoUrl || normalized.profilePic || normalized.profilePhotoUrl || '',
            bio: normalized.bio || '',
            verified: normalized.verified || false,
            email: normalized.email,
            accountType: normalized.accountType || (raw as any).accountType || (raw as any).role,
            aboutMe: (normalized as any).aboutMe || (raw as any).aboutMe || (raw as any).about || '',
            travelPlan: normalized.travelPlan || [],
            onboardingComplete: normalized.onboardingComplete || false,
            isNewUser: (normalized as any).isNewUser ?? (raw as any).isNewUser ?? false,
          };

          callback(userInfo);
        } catch (err: any) {
          console.error('[listenToUserPublicInfo] Error processing snapshot:', err);
          callback(null);
        }
      },
      (error: any) => {
        console.error('[listenToUserPublicInfo] Listener error:', error);
        callback(null);
      }
    );
  } catch (setupErr: any) {
    console.error('[listenToUserPublicInfo] Setup error:', setupErr);
    callback(null);
    return () => { };
  }
}

/**
 * Get user posts (Dual-Source Read)
 * 🔬 Strategy: Fetches from both Global 'posts' and Legacy 'users/{id}/posts'
 * Merges, deduplicates, and sorts to ensure full history visibility
 */
export async function getUserPosts(userId: string): Promise<Post[]> {
  if (!userId) return [];

  try {
    // 1. Define Sources
    const globalPostsQuery = query(
      collection(db, 'posts'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Legacy support: Some older data structures might use this path
    const legacyPostsRef = collection(db, 'users', userId, 'posts');

    // 2. Execute Parallel Fetches
    const [globalSnap, legacySnap] = await Promise.all([
      getDocs(globalPostsQuery).catch(err => {
        console.warn('[getUserPosts] Global query failed:', err);
        return { docs: [] };
      }),
      getDocs(legacyPostsRef).catch(err => {
        // Expected behavior if collection doesn't exist or permissions block it
        // purely a compatibility probe
        return { docs: [] };
      })
    ]);

    // 3. Normalize & Merge
    const allPosts: Post[] = [];
    const seenIds = new Set<string>();

    const processDoc = (docSnap: any, source: string) => {
      if (seenIds.has(docSnap.id)) return;
      try {
        const raw = { id: docSnap.id, ...docSnap.data() };
        // Ensure critical fields exist for rendering
        if (!raw.createdBy) raw.createdBy = userId;

        const normalized = normalizePost(raw);
        if (normalized && normalized.id) {
          allPosts.push(normalized);
          seenIds.add(normalized.id);
        }
      } catch (e) {
        console.warn(`[getUserPosts] Error normalizing ${source} post:`, e);
      }
    };

    // Priority to Global posts (Newer schema)
    (globalSnap as any).docs?.forEach((d: any) => processDoc(d, 'global'));
    (legacySnap as any).docs?.forEach((d: any) => processDoc(d, 'legacy'));

    // 4. Sort (Newest First)
    allPosts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });

    // 5. Hydrate Author Data (CRITICAL for UI)
    try {
      const authorInfo = await getUserPublicInfo(userId);
      if (authorInfo) {
        return allPosts.map(post => ({
          ...post,
          authorUsername: authorInfo.username,
          authorAvatar: authorInfo.photoURL,
          username: authorInfo.username,
        } as any));
      }
    } catch (e) {
      console.warn('[getUserPosts] Author hydration failed', e);
    }

    return allPosts;

  } catch (error: any) {
    console.error('[getUserPosts] Critical Error:', error);
    return [];
  }
}

/**
 * Listen to user posts (Dual-Source Realtime)
 * 🎧 Subscribes to Global and Legacy paths simultaneously
 */
export function listenToUserPosts(
  userId: string,
  callback: (posts: Post[]) => void
): Unsubscribe {
  if (!userId) {
    callback([]);
    return () => { };
  }

  // Local state to hold merged results from both listeners
  let globalPosts: Post[] = [];
  let legacyPosts: Post[] = [];

  // Helper to merge, dedup, sort, and emit
  const emitMerged = async () => {
    const allPosts: Post[] = [];
    const seenIds = new Set<string>();

    // Merge Global First
    globalPosts.forEach(p => {
      if (!seenIds.has(p.id)) {
        allPosts.push(p);
        seenIds.add(p.id);
      }
    });

    // Merge Legacy
    legacyPosts.forEach(p => {
      if (!seenIds.has(p.id)) {
        allPosts.push(p);
        seenIds.add(p.id);
      }
    });

    // Sort
    allPosts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });

    // Hydrate
    try {
      const authorInfo = await getUserPublicInfo(userId);
      if (authorInfo) {
        const hydrated = allPosts.map(post => ({
          ...post,
          authorUsername: authorInfo.username,
          authorAvatar: authorInfo.photoURL,
          username: authorInfo.username,
        } as any));
        callback(hydrated);
        return;
      }
    } catch (e) { /* ignore */ }

    callback(allPosts);
  };

  // 1. Global Listener
  const globalQuery = query(
    collection(db, 'posts'),
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const unsubGlobal = onSnapshot(globalQuery, (snapshot) => {
    globalPosts = [];
    snapshot.forEach(doc => {
      const raw = { id: doc.id, ...doc.data() };
      const norm = normalizePost(raw);
      if (norm) globalPosts.push(norm);
    });
    emitMerged();
  }, (err) => {
    console.warn('[listenToUserPosts] Global listener error:', err);
    // On error, we still keep globalPosts as is or empty, and rely on legacy
  });

  // 2. Legacy Listener (Try/Catch wrapper not possible directly on onSnapshot, so we just attach error handler)
  let unsubLegacy = () => { };
  try {
    const legacyRef = collection(db, 'users', userId, 'posts');
    unsubLegacy = onSnapshot(legacyRef, (snapshot) => {
      legacyPosts = [];
      snapshot.forEach(doc => {
        const raw = { id: doc.id, ...doc.data() };
        // Ensure legacy posts have createdBy for consistency
        if (!raw.createdBy) raw.createdBy = userId;
        const norm = normalizePost(raw);
        if (norm) legacyPosts.push(norm);
      });
      emitMerged();
    }, (err) => {
      // Expected for permissions error or non-existent collection
      // console.debug('[listenToUserPosts] Legacy listener suppressed:', err.message);
    });
  } catch (e) {
    // Setup failed (e.g. valid path check)
  }

  return () => {
    unsubGlobal();
    unsubLegacy();
  };
}



/**
 * Get user counts (one-time fetch)
 * @param userId - User ID to get counts for
 * @returns User counts
 */
export async function getUserCounts(userId: string): Promise<UserCounts> {
  if (!userId) {
    return { followers: 0, following: 0, posts: 0 };
  }

  try {
    // Fetch actual counts from subcollections directly
    const followersRef = collection(db, 'users', userId, 'followers');
    const followingRef = collection(db, 'users', userId, 'following');

    const [followersSnap, followingSnap, posts] = await Promise.all([
      getCountFromServer(followersRef),
      getCountFromServer(followingRef),
      getUserPosts(userId)
    ]);

    return {
      followers: followersSnap.data().count,
      following: followingSnap.data().count,
      posts: posts.length,
    };
  } catch (error: any) {
    console.error('[getUserCounts] Error:', error);
    return { followers: 0, following: 0, posts: 0 };
  }
}

/**
 * Listen to user counts (realtime)
 * Uses listeners for followers/following subcollections and posts
 * @param userId - User ID to listen to counts for
 * @param callback - Callback with user counts
 * @returns Unsubscribe function
 */
export function listenToUserCounts(
  userId: string,
  callback: (counts: UserCounts) => void
): Unsubscribe {
  if (!userId) {
    callback({ followers: 0, following: 0, posts: 0 });
    return () => { };
  }

  let followersCount = 0;
  let followingCount = 0;
  let postsCount = 0;

  const updateCounts = () => {
    callback({
      followers: followersCount,
      following: followingCount,
      posts: postsCount,
    });
  };

  // Listen to followers subcollection
  const unsubscribeFollowers = FollowService.listenToFollowers(userId, (followers) => {
    followersCount = followers.length;
    updateCounts();
  });

  // Listen to following subcollection
  const unsubscribeFollowing = FollowService.listenToFollowing(userId, (following) => {
    followingCount = following.length;
    updateCounts();
  });

  // Listen to posts
  const unsubscribePosts = listenToUserPosts(userId, (posts) => {
    postsCount = posts.length;
    updateCounts();
  });

  // Return combined unsubscribe
  return () => {
    unsubscribeFollowers();
    unsubscribeFollowing();
    unsubscribePosts();
  };
}

