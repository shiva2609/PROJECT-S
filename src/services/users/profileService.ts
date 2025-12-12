/**
 * Profile Service
 * 
 * Functions to fetch user profile, posts, and follow state
 * These are called on ProfileScreen mount to fetch fresh data
 */

import { db } from '../auth/authService';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { store } from '../../store';
import { setUserProfile, setUserProfileLoading } from '../../store/slices/userProfileSlice';
import { setUserPosts, setUserPostsLoading } from '../../store/slices/userPostsSlice';
import { setUserFollowState } from '../../store/slices/userFollowStateSlice';
import type { ProfileData } from '../../store/slices/userProfileSlice';
import type { Post } from '../../store/slices/userPostsSlice';
import type { FollowState } from '../../store/slices/userFollowStateSlice';
import { normalizeUser } from '../../utils/normalize/normalizeUser';
import { normalizePost } from '../../utils/normalize/normalizePost';

/**
 * Convert Firestore Timestamp to serializable number (milliseconds)
 * Redux requires all values to be serializable, so we convert Timestamps to numbers
 */
function convertTimestamp(timestamp: any): number {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  // Firestore Timestamp has toMillis() method
  if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  // Firestore Timestamp object with seconds and nanoseconds
  if (timestamp.seconds) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
  }
  return 0;
}

/**
 * Fetch user profile data
 */
export async function fetchUserProfile(userId: string): Promise<void> {
  store.dispatch(setUserProfileLoading({ userId, loading: true }));
  
  try {
    const userRef = doc(db, 'users', userId);
    const snapshot = await getDoc(userRef);
    
    if (snapshot.exists()) {
      // Use global normalizer for safe defaults
      const normalized = normalizeUser(snapshot);
      if (!normalized) {
        store.dispatch(setUserProfile({ userId, profile: null }));
        return;
      }

      const profile: ProfileData = {
        username: normalized.username,
        fullname: normalized.name || normalized.fullName || normalized.displayName || 'User',
        userTag: normalized.userTag || `@${normalized.username}`,
        profilePic: normalized.photoUrl || normalized.profilePic || normalized.profilePhotoUrl,
        location: normalized.location || '',
        aboutMe: normalized.aboutMe || '',
        bio: normalized.bio || '',
        interests: normalized.interests || [],
        countriesVisited: normalized.countriesVisited || [],
        statesVisited: normalized.statesVisited || [],
        accountType: normalized.accountType || 'Traveler',
        verificationStatus: normalized.verificationStatus,
        verified: normalized.verified,
        // Include follow counts for stats calculation (already normalized)
        followersCount: normalized.followersCount,
        followingCount: normalized.followingCount,
      } as any;
      store.dispatch(setUserProfile({ userId, profile }));
    } else {
      store.dispatch(setUserProfile({ userId, profile: null }));
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    store.dispatch(setUserProfile({ userId, profile: null }));
  } finally {
    store.dispatch(setUserProfileLoading({ userId, loading: false }));
  }
}

/**
 * Fetch user posts
 */
export async function fetchUserPosts(userId: string): Promise<void> {
  // CRITICAL: Validate userId before any Firestore operations
  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.warn('[fetchUserPosts] Invalid userId, setting empty posts');
    store.dispatch(setUserPosts({ userId, posts: [] }));
    store.dispatch(setUserPostsLoading({ userId, loading: false }));
    return;
  }
  
  store.dispatch(setUserPostsLoading({ userId, loading: true }));
  
  try {
    let snapshot: any;
    let postsQuery: any;
    
    // PRIMARY: Try createdBy first with orderBy
    try {
      postsQuery = query(
        collection(db, 'posts'),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      snapshot = await getDocs(postsQuery);
    } catch (orderByError: any) {
      // If orderBy fails (missing createdAt or index), fallback without orderBy
      // Use normalizers to ensure createdAt exists before retrying
      if (orderByError?.code === 'failed-precondition' || orderByError?.message?.includes('INTERNAL ASSERTION')) {
        console.warn('[fetchUserPosts] orderBy(createdAt) failed, falling back without orderBy');
        try {
          postsQuery = query(
            collection(db, 'posts'),
            where('createdBy', '==', userId)
          );
          snapshot = await getDocs(postsQuery);
        } catch (fallbackError: any) {
          // If createdBy fails, try userId field
          console.warn('[fetchUserPosts] createdBy query failed, trying userId');
          try {
            postsQuery = query(
              collection(db, 'posts'),
              where('userId', '==', userId),
              orderBy('createdAt', 'desc')
            );
            snapshot = await getDocs(postsQuery);
          } catch (userIdOrderByError: any) {
            // Final fallback: userId without orderBy
            if (userIdOrderByError?.code === 'failed-precondition' || userIdOrderByError?.message?.includes('INTERNAL ASSERTION')) {
              postsQuery = query(
                collection(db, 'posts'),
                where('userId', '==', userId)
              );
              snapshot = await getDocs(postsQuery);
            } else {
              throw userIdOrderByError;
            }
          }
        }
      } else {
        throw orderByError;
      }
    }
    
    // If no results with createdBy, try userId field
    if (snapshot.empty && !snapshot.docs) {
      try {
        postsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(postsQuery);
      } catch (userIdError: any) {
        if (userIdError?.code === 'failed-precondition' || userIdError?.message?.includes('INTERNAL ASSERTION')) {
          postsQuery = query(
            collection(db, 'posts'),
            where('userId', '==', userId)
          );
          snapshot = await getDocs(postsQuery);
        } else {
          throw userIdError;
        }
      }
    }
    
    // Use global normalizer for safe defaults
    const posts: Post[] = snapshot.docs
      .map((docSnap) => {
        try {
          const normalized = normalizePost(docSnap);
          if (!normalized) return null;
          
          // Convert to Post format expected by Redux
          return {
            id: normalized.id,
            imageURL: normalized.imageURL || normalized.mediaUrl || undefined,
            imageUrl: normalized.imageURL || normalized.mediaUrl || undefined,
            finalCroppedUrl: normalized.mediaUrl || undefined,
            mediaUrls: normalized.gallery && normalized.gallery.length > 0 
              ? normalized.gallery 
              : normalized.mediaUrl 
                ? [normalized.mediaUrl] 
                : undefined,
            coverImage: normalized.coverImage || undefined,
            gallery: normalized.gallery || undefined,
            likeCount: normalized.likeCount || normalized.likesCount || 0,
            createdAt: convertTimestamp(normalized.createdAt),
            createdBy: normalized.createdBy || normalized.userId || '',
            userId: normalized.userId || normalized.createdBy || '',
          };
        } catch (err) {
          console.warn('[fetchUserPosts] Error normalizing post:', err);
          return null;
        }
      })
      .filter((post): post is Post => post !== null && post.id && post.id.trim().length > 0);
    
    // Client-side sort by createdAt desc to cover cases without orderBy
    posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
    store.dispatch(setUserPosts({ userId, posts }));
  } catch (error: any) {
    console.error('Error fetching user posts:', error);
    store.dispatch(setUserPosts({ userId, posts: [] }));
  } finally {
    store.dispatch(setUserPostsLoading({ userId, loading: false }));
  }
}

/**
 * Fetch follow state (whether current user is following target user, and vice versa)
 */
export async function fetchFollowState(currentUserId: string, targetUserId: string): Promise<void> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    const followState: FollowState = {
      isFollowing: false,
      isFollowedBack: false,
      followerCount: 0,
      followingCount: 0,
      isLoading: false,
    };
    store.dispatch(setUserFollowState({ userId: targetUserId, followState }));
    return;
  }
  
  try {
    // Check if current user follows target user
    const followId = `${currentUserId}_${targetUserId}`;
    const followRef = doc(db, 'follows', followId);
    const followSnapshot = await getDoc(followRef);
    const isFollowing = followSnapshot.exists();
    
    // Check if target user follows current user (isFollowedBack)
    const followedBackId = `${targetUserId}_${currentUserId}`;
    const followedBackRef = doc(db, 'follows', followedBackId);
    const followedBackSnapshot = await getDoc(followedBackRef);
    const isFollowedBack = followedBackSnapshot.exists();
    
    // Get follower and following counts from target user's profile
    const targetUserRef = doc(db, 'users', targetUserId);
    const targetUserSnapshot = await getDoc(targetUserRef);
    
    let followerCount = 0;
    let followingCount = 0;
    
    if (targetUserSnapshot.exists()) {
      const normalized = normalizeUser(targetUserSnapshot);
      if (normalized) {
        followerCount = normalized.followersCount;
        followingCount = normalized.followingCount;
      }
    }
    
    const followState: FollowState = {
      isFollowing,
      isFollowedBack,
      followerCount,
      followingCount,
      isLoading: false,
    };
    
    store.dispatch(setUserFollowState({ userId: targetUserId, followState }));
  } catch (error) {
    console.error('Error fetching follow state:', error);
    const followState: FollowState = {
      isFollowing: false,
      isFollowedBack: false,
      followerCount: 0,
      followingCount: 0,
      isLoading: false,
    };
    store.dispatch(setUserFollowState({ userId: targetUserId, followState }));
  }
}

