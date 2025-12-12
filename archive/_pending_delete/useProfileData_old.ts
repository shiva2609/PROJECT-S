/**
 * Profile Data Hook
 * 
 * Fetches all profile-related data from Firebase:
 * - User profile info (username, fullname, userTag, profilePic)
 * - Posts count
 * - Followers/Following counts
 * - Posts array
 * - Memories array
 * - Trips with memories
 * - Reviews array
 */

import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/auth/authService';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  orderBy,
} from 'firebase/firestore';
import { useAuth } from '../app/providers/AuthProvider';
import { useUserRelations } from '../app/providers/UserRelationProvider';
import { listenToSavedPosts } from '../services/api/firebaseService';
import {
  validateUserId,
  normalizePostDocument,
  safeOnSnapshot,
  safeGetDocs,
  buildSafeQuery,
  sortByCreatedAtDesc,
} from '../utils/safeFirestore';
import { normalizeUser, normalizePost } from '../utils/firestore/normalizeDoc';

export interface ProfileData {
  username: string;
  fullname: string;
  userTag: string;
  profilePic?: string;
  location?: string;
  aboutMe?: string;
  bio?: string; // Auto-generated bio
  interests?: string[];
  countriesVisited?: string[];
  statesVisited?: string[];
}

export interface Post {
  id: string;
  imageURL?: string;
  coverImage?: string;
  gallery?: string[];
  likeCount?: number;
  createdAt: any;
}

export interface Memory {
  id: string;
  imageURL?: string;
  tripId?: string;
  tripName?: string;
  createdAt: any;
}

export interface TripCollection {
  id: string;
  name: string;
  coverImage?: string;
  memoryCount: number;
}

export interface Review {
  id: string;
  userId: string;
  rating: number;
  feedback: string;
  reviewerName?: string;
  reviewerPhoto?: string;
  createdAt: any;
}

export interface ProfileStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

export function useProfileData(userId?: string) {
  const { user } = useAuth();
  const { following, followers } = useUserRelations(); // NEW: Get global state for instant updates
  // CRITICAL: Ensure targetUserId is never undefined or empty string
  const targetUserId = (userId || user?.uid || '').trim();
  const isOwnProfile = !userId || userId === user?.uid;
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]); // NEW: Saved posts
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tripCollections, setTripCollections] = useState<TripCollection[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Normalize a post document safely to avoid crashes from missing fields.
   * Uses global normalizer for comprehensive field normalization
   */
  const normalizePostDoc = (docSnap: any): Post | null => {
    // Use global normalizer for comprehensive field normalization
    const normalized = normalizePost(docSnap);
    if (!normalized) return null;
    
    // Also use safeFirestore normalizer for media URL extraction
    const safeNormalized = normalizePostDocument(docSnap as any);
    const mediaUrl = safeNormalized?.mediaUrl || normalized.mediaUrl || normalized.imageURL || '';
    
    return {
      id: normalized.id,
      imageURL: mediaUrl,
      coverImage: normalized.coverImage,
      gallery: normalized.gallery || [],
      likeCount: normalized.likeCount || normalized.likesCount || 0,
      createdAt: normalized.createdAt,
    };
  };

  useEffect(() => {
    // CRITICAL: Validate targetUserId before any Firestore operations
    if (!validateUserId(targetUserId)) {
      console.warn('[useProfileData] Invalid targetUserId, skipping fetch');
      setLoading(false);
      setPosts([]);
      setStats({ postsCount: 0, followersCount: 0, followingCount: 0 });
      return;
    }

    // Fetch user profile with real-time follow counts
    const userRef = doc(db, 'users', targetUserId);
    
    // Initial fetch to get data immediately (before listener fires)
    getDoc(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        // Use global normalizer for safe defaults
        const normalized = normalizeUser(snapshot);
        if (normalized) {
          setProfileData({
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
          });
          
          // Initialize follow counts from normalized user document
          setStats(prev => ({
            ...prev,
            followersCount: normalized.followersCount,
            followingCount: normalized.followingCount,
          }));
        }
      }
    }).catch((error) => {
      console.warn('Error fetching user profile (initial):', error);
    });
    
    // Real-time listener for updates - wrap in try-catch to handle INTERNAL ASSERTION errors
    let unsubscribeUser: (() => void) | null = null;
    try {
      unsubscribeUser = onSnapshot(
        userRef,
        async (snapshot) => {
          try {
            if (snapshot.exists()) {
              // Use global normalizer for safe defaults
              const normalized = normalizeUser(snapshot);
              if (normalized) {
                setProfileData({
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
                });
                
                // Update follow counts in real-time from normalized user document
                setStats(prev => ({
                  ...prev,
                  followersCount: normalized.followersCount,
                  followingCount: normalized.followingCount,
                }));
              }
            }
          } catch (snapshotErr: any) {
            // Catch errors during snapshot processing
            if (snapshotErr?.message?.includes('INTERNAL ASSERTION FAILED') || 
                snapshotErr?.message?.includes('Unexpected state') ||
                snapshotErr?.message?.includes('AsyncQueue')) {
              console.warn('[useProfileData] Error processing user snapshot (non-fatal):', snapshotErr?.message?.substring(0, 150));
              return;
            }
            console.error('[useProfileData] Snapshot processing error:', snapshotErr);
          }
        },
        (error: any) => {
          // CRITICAL: Suppress INTERNAL ASSERTION FAILED errors
          if (error?.message?.includes('INTERNAL ASSERTION FAILED') || 
              error?.message?.includes('Unexpected state') ||
              error?.message?.includes('AsyncQueue')) {
            console.warn('⚠️ Firestore internal error (non-fatal, will retry):', error.message?.substring(0, 100));
            return;
          }
          console.warn('Error fetching user profile (listener):', error);
        }
      );
    } catch (setupErr: any) {
      // Catch errors during listener setup
      if (setupErr?.message?.includes('INTERNAL ASSERTION FAILED') || 
          setupErr?.message?.includes('Unexpected state')) {
        console.warn('[useProfileData] Error setting up user listener (non-fatal):', setupErr?.message?.substring(0, 150));
        unsubscribeUser = () => {}; // No-op unsubscribe
      } else {
        console.error('[useProfileData] Error setting up user listener:', setupErr);
        unsubscribeUser = () => {}; // No-op unsubscribe
      }
    }

    // Fetch posts count and posts with defensive query building
    let unsubscribePosts: (() => void) | null = null;
    
    const setupPostsListener = () => {
      // CRITICAL: Double-check targetUserId is valid
      if (!validateUserId(targetUserId)) {
        console.warn('[useProfileData] setupPostsListener: Invalid targetUserId');
        setPosts([]);
        setStats((prev) => ({ ...prev, postsCount: 0 }));
        return;
      }

      const processSnapshot = (snapshot: any) => {
        const postsData: Post[] = snapshot.docs
          .map(normalizePostDoc)
          .filter((post): post is Post => post !== null);
        
        // Client-side sort by createdAt desc
        const sorted = sortByCreatedAtDesc(postsData);
        
        setPosts(sorted);
        setStats((prev) => ({ ...prev, postsCount: sorted.length }));
      };

      const fallbackFetch = async () => {
        // CRITICAL: Validate targetUserId before fallback fetch
        if (!validateUserId(targetUserId)) {
          console.warn('[useProfileData] fallbackFetch: Invalid targetUserId');
          setPosts([]);
          setStats((prev) => ({ ...prev, postsCount: 0 }));
          return;
        }
        
        try {
          const safeQ = query(collection(db, 'posts'), where('createdBy', '==', targetUserId));
          const docs = await safeGetDocs(safeQ);
          processSnapshot({ docs } as any);
          return;
        } catch (err: any) {
          console.warn('Fallback fetch (createdBy) failed, trying userId:', err?.message || err);
        }
        try {
          const safeQ = query(collection(db, 'posts'), where('userId', '==', targetUserId));
          const docs = await safeGetDocs(safeQ);
          processSnapshot({ docs } as any);
        } catch (err2: any) {
          console.warn('Final fallback fetch failed:', err2?.message || err2);
          setPosts([]);
          setStats((prev) => ({ ...prev, postsCount: 0 }));
        }
      };

      // CRITICAL FIX: Remove orderBy from onSnapshot to prevent AsyncQueue assertion failures
      // Firestore's AsyncQueue can crash when orderBy is used with documents missing createdAt
      // Solution: Use simple equality query, sort client-side
      
      const setupSafeListener = (fieldName: 'createdBy' | 'userId') => {
        try {
          // CRITICAL: Validate targetUserId before building query
          if (!validateUserId(targetUserId)) {
            console.warn(`[useProfileData] setupSafeListener: Invalid targetUserId for ${fieldName}`);
            return false;
          }
          
          // Build query WITHOUT orderBy to prevent AsyncQueue assertion failures
          const safeQuery = query(
            collection(db, 'posts'),
            where(fieldName, '==', targetUserId)
          );

          unsubscribePosts = safeOnSnapshot(
            safeQuery,
            (docs) => {
              processSnapshot({ docs } as any);
            },
            (error: any) => {
              console.warn(`[useProfileData] Posts listener error (${fieldName}):`, error?.message || error);
              setPosts([]);
              setStats((prev) => ({ ...prev, postsCount: 0 }));
            }
          );
          return true;
        } catch (err: any) {
          console.warn(`[useProfileData] Failed to setup listener (${fieldName}):`, err?.message || err);
          return false;
        }
      };

      // Try createdBy first, then userId, then give up
      if (!setupSafeListener('createdBy')) {
        if (!setupSafeListener('userId')) {
          console.warn('[useProfileData] All listener setups failed, using one-time fetch');
          fallbackFetch();
        }
      }
    };

    setupPostsListener();

    // Follow counts are handled by the real-time listener on user document (lines 104-132)
    // No need for separate fetchFollowCounts - the onSnapshot listener will update counts
    // immediately when the user document loads, and continue to update in real-time

    // Fetch memories (from posts or dedicated memories collection)
    // Use the same posts data but filter for images
    let unsubscribeMemories: (() => void) | null = null;
    
    const setupMemoriesListener = () => {
      const processMemoriesSnapshot = (snapshot: any) => {
        const memoriesData: Memory[] = [];
        const tripMap = new Map<string, { name: string; count: number; coverImage?: string }>();

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (data.imageURL || data.coverImage || data.gallery) {
            memoriesData.push({
              id: docSnap.id,
              imageURL: data.imageURL || data.coverImage || (data.gallery?.[0]),
              tripId: data.tripId,
              tripName: data.title || data.tripName,
              createdAt: data.createdAt,
            });

            // Group by trip
            if (data.tripId || data.title) {
              const tripKey = data.tripId || data.title;
              const existing = tripMap.get(tripKey) || { name: data.title || data.tripName || 'Untitled Trip', count: 0, coverImage: data.coverImage || data.imageURL || data.gallery?.[0] };
              existing.count++;
              tripMap.set(tripKey, existing);
            }
          }
        }

        // Sort by createdAt client-side (descending)
        memoriesData.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || a.createdAt || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || b.createdAt || 0;
          return bTime - aTime;
        });

        setMemories(memoriesData);
        
        // Convert trip map to array
        const trips: TripCollection[] = Array.from(tripMap.entries()).map(([id, data]) => ({
          id,
          name: data.name,
          coverImage: data.coverImage,
          memoryCount: data.count,
        }));
        setTripCollections(trips);
      };

      // CRITICAL FIX: Remove orderBy from memories listener to prevent AsyncQueue assertion failures
      const setupSafeMemoriesListener = (fieldName: 'userId' | 'createdBy') => {
        try {
          // CRITICAL: Validate targetUserId before building query
          if (!validateUserId(targetUserId)) {
            console.warn(`[useProfileData] setupSafeMemoriesListener: Invalid targetUserId for ${fieldName}`);
            return false;
          }
          
          // Build query WITHOUT orderBy to prevent AsyncQueue assertion failures
          const safeQuery = query(
            collection(db, 'posts'),
            where(fieldName, '==', targetUserId)
          );

          unsubscribeMemories = safeOnSnapshot(
            safeQuery,
            (docs) => {
              processMemoriesSnapshot({ docs } as any);
            },
            (error: any) => {
              console.error(`[useProfileData] Memories listener error (${fieldName}):`, error?.message || error);
              setMemories([]);
              setTripCollections([]);
            }
          );
          return true;
        } catch (err: any) {
          console.warn(`[useProfileData] Failed to setup memories listener (${fieldName}):`, err?.message || err);
          return false;
        }
      };

      // Try userId first, then createdBy
      if (!setupSafeMemoriesListener('userId')) {
        if (!setupSafeMemoriesListener('createdBy')) {
          console.warn('[useProfileData] All memories listener setups failed');
          setMemories([]);
          setTripCollections([]);
        }
      }
    };

    setupMemoriesListener();

    // Fetch reviews (from posts that have reviews)
    const fetchReviews = async () => {
      // CRITICAL: Validate targetUserId before fetching reviews
      if (!validateUserId(targetUserId)) {
        console.warn('[useProfileData] fetchReviews: Invalid targetUserId');
        setReviews([]);
        return;
      }
      
      try {
        // Get all posts by this user
        const userPostsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', targetUserId)
        );
        const docs = await safeGetDocs(userPostsQuery);
        const userPostsSnap = { docs } as any;
        
        const allReviews: Review[] = [];
        
        // For each post, get reviews
        for (const postDoc of userPostsSnap.docs) {
          const reviewsRef = collection(db, 'posts', postDoc.id, 'reviews');
          const reviewsSnap = await getDocs(reviewsRef);
          
          for (const reviewDoc of reviewsSnap.docs) {
            const reviewData = reviewDoc.data();
            // Fetch reviewer info
            let reviewerName = 'Anonymous';
            let reviewerPhoto;
            try {
              const reviewerDoc = await getDoc(doc(db, 'users', reviewData.userId));
              if (reviewerDoc.exists()) {
                const reviewerData = reviewerDoc.data();
                reviewerName = reviewerData.displayName || reviewerData.username || reviewerData.fullName || 'Anonymous';
                reviewerPhoto = reviewerData.photoURL || reviewerData.profilePic;
              }
            } catch (error) {
              console.error('Error fetching reviewer info:', error);
            }
            
            allReviews.push({
              id: reviewDoc.id,
              userId: reviewData.userId,
              rating: reviewData.rating,
              feedback: reviewData.feedback || '',
              reviewerName,
              reviewerPhoto,
              createdAt: reviewData.createdAt,
            });
          }
        }
        
        setReviews(allReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      }
    };

    fetchReviews();
    
    // Fetch saved posts (only for own profile)
    let savedPostsUnsubscribe: (() => void) | null = null;
    if (isOwnProfile && targetUserId) {
      savedPostsUnsubscribe = listenToSavedPosts(targetUserId, (savedPostsData) => {
        setSavedPosts(savedPostsData);
      });
    } else {
      setSavedPosts([]);
    }
    
    setLoading(false);

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribePosts) unsubscribePosts();
      if (unsubscribeMemories) unsubscribeMemories();
      if (savedPostsUnsubscribe) savedPostsUnsubscribe();
    };
  }, [targetUserId, isOwnProfile]);

  // Compute stats with global state sync for instant updates
  const computedStats = useMemo<ProfileStats>(() => {
    // For own profile, use global state counts (more accurate and instant)
    // For other profiles, use document counts (updated via real-time listener)
    const followersCount = isOwnProfile && followers.size > 0
      ? followers.size
      : stats.followersCount;
    const followingCount = isOwnProfile && following.size > 0
      ? following.size
      : stats.followingCount;

    return {
      postsCount: stats.postsCount,
      followersCount: Math.max(0, followersCount),
      followingCount: Math.max(0, followingCount),
    };
  }, [stats, followers.size, following.size, isOwnProfile]);

  return {
    profileData,
    stats: computedStats, // Return computed stats with global state sync
    posts,
    savedPosts, // NEW: Return saved posts
    memories,
    tripCollections,
    reviews,
    loading,
  };
}

