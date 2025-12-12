/**
 * Users API
 * 
 * All user-related CRUD operations and queries.
 * Handles user profiles, followers/following, search, and push tokens.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  startAfter,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../auth/authService';
import { retryWithBackoff } from '../../utils/retry';
import { safeFirestoreRead } from '../../utils/offlineHandler';

// ---------- Types ----------

export interface User {
  id: string;
  username: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  followersCount: number;
  followingCount: number;
  pushTokens?: string[];
  createdAt: any;
  email?: string;
  verified?: boolean;
}

interface PaginationOptions {
  limit?: number;
  lastDoc?: any;
}

interface PaginationResult<T> {
  users: T[];
  nextCursor?: any;
}

// ---------- Helper Functions ----------

/**
 * Normalize Firestore document to User object
 * Uses global normalizer for safe defaults
 */
import { normalizeUser as normalizeUserGlobal } from '../../utils/normalize/normalizeUser';

function normalizeUser(docSnap: QueryDocumentSnapshot<DocumentData>): User {
  const normalized = normalizeUserGlobal(docSnap);
  if (!normalized) {
    // Return minimal safe user object
    return {
      id: docSnap.id,
      username: '',
      name: '',
      bio: '',
      photoUrl: '',
      followersCount: 0,
      followingCount: 0,
      pushTokens: [],
      createdAt: null,
      email: '',
      verified: false,
    };
  }
  
  return {
    id: normalized.id,
    username: normalized.username,
    name: normalized.name,
    bio: normalized.bio || '',
    photoUrl: normalized.photoUrl || normalized.profilePic || normalized.profilePhotoUrl || '',
    followersCount: normalized.followersCount,
    followingCount: normalized.followingCount,
    pushTokens: normalized.pushTokens || [],
    createdAt: normalized.createdAt,
    email: normalized.email || '',
    verified: normalized.verified,
  };
}

// ---------- Exported Functions ----------

/**
 * Get user by ID
 * @param userId - User document ID
 * @returns User object or null if not found
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    return await safeFirestoreRead(
      async () => {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          return null;
        }
        
        return normalizeUser(userSnap as QueryDocumentSnapshot<DocumentData>);
      },
      null
    );
  } catch (error: any) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get user by username
 * @param username - Username to search for
 * @returns User object or null if not found
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()), firestoreLimit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    return normalizeUser(querySnapshot.docs[0]);
  } catch (error: any) {
    console.error('Error getting user by username:', error);
    throw { code: 'get-user-failed', message: 'Failed to fetch user' };
  }
}

/**
 * Update user profile
 * @param userId - User document ID
 * @param data - Partial user data to update
 */
export async function updateProfile(userId: string, data: Partial<User>): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const updateData: any = { ...data };
    
    // Remove id from update data if present
    delete updateData.id;
    
    // Lowercase username for search
    if (updateData.username) {
      updateData.usernameLower = updateData.username.toLowerCase();
    }
    
    await updateDoc(userRef, updateData);
  } catch (error: any) {
    console.error('Error updating profile:', error);
    throw { code: 'update-profile-failed', message: 'Failed to update profile' };
  }
}

/**
 * Check if username is available
 * @param username - Username to check
 * @returns true if available, false if taken
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()), firestoreLimit(1));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty;
  } catch (error: any) {
    console.error('Error checking username:', error);
    throw { code: 'check-username-failed', message: 'Failed to check username availability' };
  }
}

/**
 * Search users by username or name
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching users
 */
export async function searchUsers(query: string, limit: number = 20): Promise<User[]> {
  try {
    const usersRef = collection(db, 'users');
    const searchQuery = query.toLowerCase().trim();
    
    if (!searchQuery) {
      return [];
    }
    
    // Search by username (exact match or starts with)
    const usernameQuery = query(
      usersRef,
      where('usernameLower', '>=', searchQuery),
      where('usernameLower', '<=', searchQuery + '\uf8ff'),
      firestoreLimit(limit)
    );
    
    const usernameResults = await getDocs(usernameQuery);
    const users = usernameResults.docs.map(normalizeUser);
    
    return users;
  } catch (error: any) {
    console.error('Error searching users:', error);
    throw { code: 'search-users-failed', message: 'Failed to search users' };
  }
}

/**
 * Get followers list with pagination
 * @param userId - User ID to get followers for
 * @param options - Pagination options
 * @returns Paginated followers list
 */
import {
  validateUserId,
  normalizeRelationDocument,
  buildSafeQuery,
  sortByCreatedAtDesc,
  safeGetDocs,
} from '../../utils/safeFirestore';

export async function getFollowers(
  userId: string,
  options?: PaginationOptions
): Promise<PaginationResult<User>> {
  // CRITICAL: Validate userId before any Firestore operations
  if (!validateUserId(userId)) {
    console.warn('[getFollowers] Invalid userId, returning empty list');
    return { users: [], nextCursor: undefined };
  }
  
    try {
      const limit = options?.limit || 20;
      const followersRef = collection(db, 'follows');
      
      // Build safe query with orderBy fallback
      const baseQuery = query(followersRef, where('followingId', '==', userId));
      
      let q = buildSafeQuery(
        baseQuery,
        (base) => {
          let ordered = query(base, orderBy('createdAt', 'desc'), firestoreLimit(limit));
          if (options?.lastDoc) {
            ordered = query(ordered, startAfter(options.lastDoc));
          }
          return ordered;
        },
        (base) => {
          let simple = query(base, firestoreLimit(limit * 2)); // Fetch more for sorting
          if (options?.lastDoc) {
            simple = query(simple, startAfter(options.lastDoc));
          }
          return simple;
        }
      );
      
      // Try to execute query, fallback if index error
      let docs = await safeGetDocs(q);
      
      // If we got empty and the query had orderBy, try without orderBy
      if (docs.length === 0 && q.toString().includes('orderBy')) {
        const fallbackQuery = query(
          followersRef,
          where('followingId', '==', userId),
          firestoreLimit(limit * 2)
        );
        if (options?.lastDoc) {
          const fallbackWithCursor = query(fallbackQuery, startAfter(options.lastDoc));
          docs = await safeGetDocs(fallbackWithCursor);
        } else {
          docs = await safeGetDocs(fallbackQuery);
        }
      }
      
      // Normalize and sort relations
      const relations = docs
        .map(normalizeRelationDocument)
        .filter((rel): rel is NonNullable<typeof rel> => rel !== null);
      
      const sorted = sortByCreatedAtDesc(relations);
      const limited = sorted.slice(0, limit);
      
      // Extract followerIds from normalized relations
      const followerIds = limited
        .map(rel => rel.followerId || rel.followedId)
        .filter((id): id is string => id !== null && typeof id === 'string' && id.trim().length > 0);
      
      // Fetch user documents for followers
      const users: User[] = [];
      for (const followerId of followerIds) {
        try {
          const user = await getUserById(followerId);
          if (user) {
            users.push(user);
          }
        } catch (err) {
          console.warn(`[getFollowers] Error fetching user ${followerId}:`, err);
        }
      }
      
      const lastDoc = docs[limited.length - 1];
      
      return {
        users,
        nextCursor: limited.length === limit ? lastDoc : undefined,
      };
  } catch (error: any) {
    console.error('Error getting followers:', error);
    // Return empty instead of throwing to prevent crashes
    return { users: [], nextCursor: undefined };
  }
}

/**
 * Get following list with pagination
 * @param userId - User ID to get following for
 * @param options - Pagination options
 * @returns Paginated following list
 */
export async function getFollowing(
  userId: string,
  options?: PaginationOptions
): Promise<PaginationResult<User>> {
  // CRITICAL: Validate userId before any Firestore operations
  if (!validateUserId(userId)) {
    console.warn('[getFollowing] Invalid userId, returning empty list');
    return { users: [], nextCursor: undefined };
  }
  
    try {
      const limit = options?.limit || 20;
      const followsRef = collection(db, 'follows');
      
      // Build safe query with orderBy fallback
      const baseQuery = query(followsRef, where('followerId', '==', userId));
      
      let q = buildSafeQuery(
        baseQuery,
        (base) => {
          let ordered = query(base, orderBy('createdAt', 'desc'), firestoreLimit(limit));
          if (options?.lastDoc) {
            ordered = query(ordered, startAfter(options.lastDoc));
          }
          return ordered;
        },
        (base) => {
          let simple = query(base, firestoreLimit(limit * 2)); // Fetch more for sorting
          if (options?.lastDoc) {
            simple = query(simple, startAfter(options.lastDoc));
          }
          return simple;
        }
      );
      
      // Try to execute query, fallback if index error
      let docs = await safeGetDocs(q);
      
      // If we got empty and the query had orderBy, try without orderBy
      if (docs.length === 0 && q.toString().includes('orderBy')) {
        const fallbackQuery = query(
          followsRef,
          where('followerId', '==', userId),
          firestoreLimit(limit * 2)
        );
        if (options?.lastDoc) {
          const fallbackWithCursor = query(fallbackQuery, startAfter(options.lastDoc));
          docs = await safeGetDocs(fallbackWithCursor);
        } else {
          docs = await safeGetDocs(fallbackQuery);
        }
      }
      
      // Normalize and sort relations
      const relations = docs
        .map(normalizeRelationDocument)
        .filter((rel): rel is NonNullable<typeof rel> => rel !== null);
      
      const sorted = sortByCreatedAtDesc(relations);
      const limited = sorted.slice(0, limit);
      
      // Extract followingIds from normalized relations
      const followingIds = limited
        .map(rel => rel.followingId || rel.followedId)
        .filter((id): id is string => id !== null && typeof id === 'string' && id.trim().length > 0);
      
      // Fetch user documents for following
      const users: User[] = [];
      for (const followingId of followingIds) {
        try {
          const user = await getUserById(followingId);
          if (user) {
            users.push(user);
          }
        } catch (err) {
          console.warn(`[getFollowing] Error fetching user ${followingId}:`, err);
        }
      }
      
      const lastDoc = docs[limited.length - 1];
      
      return {
        users,
        nextCursor: limited.length === limit ? lastDoc : undefined,
      };
    } catch (error: any) {
      console.error('Error getting following:', error);
      // Return empty instead of throwing to prevent crashes
      return { users: [], nextCursor: undefined };
    }
}

/**
 * Increment follower count
 * @param userId - User ID
 * @param delta - Amount to increment (default: 1)
 */
export async function incrementFollowerCount(userId: string, delta: number = 1): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      followersCount: increment(delta),
    });
  } catch (error: any) {
    console.error('Error incrementing follower count:', error);
    throw { code: 'increment-follower-failed', message: 'Failed to update follower count' };
  }
}

/**
 * Increment following count
 * @param userId - User ID
 * @param delta - Amount to increment (default: 1)
 */
export async function incrementFollowingCount(userId: string, delta: number = 1): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      followingCount: increment(delta),
    });
  } catch (error: any) {
    console.error('Error incrementing following count:', error);
    throw { code: 'increment-following-failed', message: 'Failed to update following count' };
  }
}

/**
 * Decrement follower count (helper for useFollowManager)
 * @param userId - User ID
 */
export async function decrementFollowerCount(userId: string): Promise<void> {
  await incrementFollowerCount(userId, -1);
}

/**
 * Decrement following count (helper for useFollowManager)
 * @param userId - User ID (current user)
 */
export async function decrementFollowingCount(): Promise<void> {
  // This will be called with current user ID from hook
  // For now, this is a placeholder - hook should pass userId
}

/**
 * Update push token for user
 * @param userId - User ID
 * @param token - Push notification token
 */
export async function updatePushToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      pushTokens: arrayUnion(token),
    });
  } catch (error: any) {
    console.error('Error updating push token:', error);
    throw { code: 'update-push-token-failed', message: 'Failed to update push token' };
  }
}

/**
 * Remove push token for user
 * @param userId - User ID
 * @param token - Push notification token to remove
 */
export async function removePushToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      pushTokens: arrayRemove(token),
    });
  } catch (error: any) {
    console.error('Error removing push token:', error);
    throw { code: 'remove-push-token-failed', message: 'Failed to remove push token' };
  }
}

/**
 * Get suggested users for discovery
 * @param userId - Current user ID
 * @param options - Options including excludeFollowing array
 * @returns Array of suggested users
 */
export async function getSuggested(
  userId: string,
  options?: { excludeFollowing?: string[]; limit?: number }
): Promise<User[]> {
  try {
    const limit = options?.limit || 20;
    const excludeSet = new Set(options?.excludeFollowing || []);
    excludeSet.add(userId); // Exclude self
    
    // Strategy 1: Get popular accounts (high follower count)
    const usersRef = collection(db, 'users');
    const popularQuery = query(
      usersRef,
      orderBy('followersCount', 'desc'),
      firestoreLimit(limit * 2)
    );
    
    const popularSnapshot = await getDocs(popularQuery);
    const suggestions: User[] = [];
    const seenIds = new Set<string>();
    
    // Add popular users
    for (const docSnap of popularSnapshot.docs) {
      const user = normalizeUser(docSnap);
      if (!excludeSet.has(user.id) && !seenIds.has(user.id)) {
        suggestions.push(user);
        seenIds.add(user.id);
      }
    }
    
    // Strategy 2: Get users followed by my following (2nd degree)
    // This would require additional queries - simplified for now
    
    // Strategy 3: Get new accounts (recently created)
    const newQuery = query(
      usersRef,
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    const newSnapshot = await getDocs(newQuery);
    for (const docSnap of newSnapshot.docs) {
      const user = normalizeUser(docSnap);
      if (!excludeSet.has(user.id) && !seenIds.has(user.id) && suggestions.length < limit) {
        suggestions.push(user);
        seenIds.add(user.id);
      }
    }
    
    return suggestions.slice(0, limit);
  } catch (error: any) {
    console.error('Error getting suggestions:', error);
    throw { code: 'get-suggestions-failed', message: 'Failed to fetch suggestions' };
  }
}

/**
 * Check username availability (alias for checkUsernameAvailable)
 * Used by useProfileManager
 */
export async function checkUsername(username: string): Promise<boolean> {
  return checkUsernameAvailable(username);
}

