/**
 * Profile Service
 * 
 * Functions to fetch user profile, posts, and follow state
 * These are called on ProfileScreen mount to fetch fresh data
 */

import { db } from '../api/authService';
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
import { store } from '../store';
import { setUserProfile, setUserProfileLoading } from '../store/userProfileSlice';
import { setUserPosts, setUserPostsLoading } from '../store/userPostsSlice';
import { setUserFollowState } from '../store/userFollowStateSlice';
import type { ProfileData } from '../store/userProfileSlice';
import type { Post } from '../store/userPostsSlice';
import type { FollowState } from '../store/userFollowStateSlice';

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
      const data = snapshot.data();
      const profile: ProfileData = {
        username: data.username || data.displayName || 'User',
        fullname: data.fullName || data.displayName || data.username || 'User',
        userTag: data.userTag || `@${data.username || 'user'}`,
        profilePic: data.photoURL || data.profilePic,
        location: data.location || '',
        aboutMe: data.aboutMe || data.about || data.description || '',
        bio: data.bio || '',
        interests: data.interests || [],
        countriesVisited: data.countriesVisited || [],
        statesVisited: data.statesVisited || [],
        accountType: data.accountType || data.role || 'Traveler',
        verificationStatus: data.verificationStatus,
        verified: data.verificationStatus === 'verified' || data.verified === true,
        // Include follow counts for stats calculation
        followersCount: typeof data.followersCount === 'number' ? data.followersCount : 0,
        followingCount: typeof data.followingCount === 'number' ? data.followingCount : 0,
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
  store.dispatch(setUserPostsLoading({ userId, loading: true }));
  
  try {
    // PRIMARY: Try createdBy first
    let postsQuery = query(
      collection(db, 'posts'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    let snapshot = await getDocs(postsQuery);
    
    // If no results, try userId field
    if (snapshot.empty) {
      postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      snapshot = await getDocs(postsQuery);
    }
    
    const posts: Post[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        if (!data.createdAt) return null;
        return {
          id: doc.id,
          imageURL: data.imageURL,
          imageUrl: data.imageUrl,
          finalCroppedUrl: data.finalCroppedUrl,
          mediaUrls: data.mediaUrls,
          coverImage: data.coverImage,
          gallery: data.gallery,
          likeCount: data.likeCount || 0,
          // Convert Firestore Timestamp to serializable number (milliseconds)
          createdAt: convertTimestamp(data.createdAt),
          createdBy: data.createdBy || data.userId,
          userId: data.userId || data.createdBy,
        };
      })
      .filter((post): post is Post => post !== null);
    
    store.dispatch(setUserPosts({ userId, posts }));
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      console.warn('Firestore query error: ensure createdAt exists.');
    } else {
      console.error('Error fetching user posts:', error);
    }
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
    const targetUserData = targetUserSnapshot.exists() ? targetUserSnapshot.data() : {};
    
    const followState: FollowState = {
      isFollowing,
      isFollowedBack,
      followerCount: typeof targetUserData.followersCount === 'number' ? targetUserData.followersCount : 0,
      followingCount: typeof targetUserData.followingCount === 'number' ? targetUserData.followingCount : 0,
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

