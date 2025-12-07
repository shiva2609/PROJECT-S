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

import { useState, useEffect } from 'react';
import { db } from '../api/authService';
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
import { useAuth } from '../contexts/AuthContext';

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
  const targetUserId = userId || user?.uid;
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tripCollections, setTripCollections] = useState<TripCollection[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    // Fetch user profile with real-time follow counts
    const userRef = doc(db, 'users', targetUserId);
    
    // Initial fetch to get data immediately (before listener fires)
    getDoc(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfileData({
          username: data.username || data.displayName || 'User',
          fullname: data.fullName || data.displayName || data.username || 'User',
          userTag: data.userTag || `@${data.username || 'user'}`,
          profilePic: data.photoURL || data.profilePic,
          location: data.location || '',
          aboutMe: data.aboutMe || data.about || data.description || '',
          bio: data.bio || '', // Auto-generated bio (separate from aboutMe)
          interests: data.interests || [],
          countriesVisited: data.countriesVisited || [],
          statesVisited: data.statesVisited || [],
        });
        
        // Initialize follow counts from user document
        setStats(prev => ({
          ...prev,
          followersCount: typeof data.followersCount === 'number' ? data.followersCount : 0,
          followingCount: typeof data.followingCount === 'number' ? data.followingCount : 0,
        }));
      }
    }).catch((error) => {
      console.warn('Error fetching user profile (initial):', error);
    });
    
    // Real-time listener for updates
    const unsubscribeUser = onSnapshot(
      userRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfileData({
            username: data.username || data.displayName || 'User',
            fullname: data.fullName || data.displayName || data.username || 'User',
            userTag: data.userTag || `@${data.username || 'user'}`,
            profilePic: data.photoURL || data.profilePic,
            location: data.location || '',
            aboutMe: data.aboutMe || data.about || data.description || '',
            bio: data.bio || '', // Auto-generated bio (separate from aboutMe)
            interests: data.interests || [],
            countriesVisited: data.countriesVisited || [],
            statesVisited: data.statesVisited || [],
          });
          
          // Update follow counts in real-time from user document
          // Only update if the values are actually numbers (not undefined/null)
          setStats(prev => ({
            ...prev,
            followersCount: typeof data.followersCount === 'number' ? data.followersCount : prev.followersCount,
            followingCount: typeof data.followingCount === 'number' ? data.followingCount : prev.followingCount,
          }));
        }
      },
      (error: any) => {
        // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
        if (error?.message?.includes('INTERNAL ASSERTION FAILED') || error?.message?.includes('Unexpected state')) {
          console.warn('⚠️ Firestore internal error (non-fatal, will retry):', error.message?.substring(0, 100));
          return;
        }
        console.warn('Error fetching user profile (listener):', error);
      }
    );

    // Fetch posts count and posts
    // PRIMARY: Use createdBy, FALLBACK: Use userId
    let unsubscribePosts: (() => void) | null = null;
    
    const setupPostsListener = () => {
      // PRIMARY: Try createdBy first (preferred)
      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('createdBy', '==', targetUserId),
          orderBy('createdAt', 'desc')
        );
        
        unsubscribePosts = onSnapshot(
          postsQuery,
          (snapshot) => {
            const postsData: Post[] = snapshot.docs
              .map((doc) => {
                const data = doc.data();
                // Skip posts without createdAt
                if (!data.createdAt) return null;
                return {
                  id: doc.id,
                  imageURL: data.imageURL,
                  imageUrl: data.imageUrl, // Legacy field
                  finalCroppedUrl: data.finalCroppedUrl, // REAL cropped bitmap URL
                  mediaUrls: data.mediaUrls, // Array of final cropped bitmap URLs
                  coverImage: data.coverImage,
                  gallery: data.gallery,
                  likeCount: data.likeCount || 0,
                  createdAt: data.createdAt,
                };
              })
              .filter((post): post is Post => post !== null);
            setPosts(postsData);
            setStats((prev) => ({ ...prev, postsCount: postsData.length }));
          },
          (error: any) => {
            // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
            if (error?.message?.includes('INTERNAL ASSERTION FAILED') || error?.message?.includes('Unexpected state')) {
              console.warn('⚠️ Firestore internal error (non-fatal, will retry):', error.message?.substring(0, 100));
              return;
            }
            if (error.code === 'failed-precondition') {
              console.warn('Firestore query error: ensure createdAt exists.');
            } else {
              console.warn('Error with createdBy query, trying userId:', error.message || error);
            }
            // FALLBACK: Try userId field
            try {
              const altQuery = query(
                collection(db, 'posts'),
                where('userId', '==', targetUserId),
                orderBy('createdAt', 'desc')
              );
              unsubscribePosts = onSnapshot(
                altQuery,
                (snapshot) => {
                  const postsData: Post[] = snapshot.docs
                    .map((doc) => {
                      const data = doc.data();
                      // Skip posts without createdAt
                      if (!data.createdAt) return null;
                      return {
                        id: doc.id,
                        imageURL: data.imageURL,
                        coverImage: data.coverImage,
                        gallery: data.gallery,
                        likeCount: data.likeCount || 0,
                        createdAt: data.createdAt,
                      };
                    })
                    .filter((post): post is Post => post !== null);
                  setPosts(postsData);
                  setStats((prev) => ({ ...prev, postsCount: postsData.length }));
                },
                (err: any) => {
                  // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
                  if (err?.message?.includes('INTERNAL ASSERTION FAILED') || err?.message?.includes('Unexpected state')) {
                    console.warn('⚠️ Firestore internal error (non-fatal, will retry):', err.message?.substring(0, 100));
                    return;
                  }
                  console.warn('Error with userId query:', err.message || err);
                  // Last resort: get all posts and filter client-side (only posts with createdAt)
                  const allPostsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
                  unsubscribePosts = onSnapshot(
                    allPostsQuery,
                    (snapshot) => {
                      const postsData: Post[] = snapshot.docs
                        .filter((doc) => {
                          const data = doc.data();
                          // Must have createdAt and match user
                          return data.createdAt && (data.userId === targetUserId || data.createdBy === targetUserId);
                        })
                        .map((doc) => {
                          const data = doc.data();
                          return {
                            id: doc.id,
                            imageURL: data.imageURL,
                            coverImage: data.coverImage,
                            gallery: data.gallery,
                            likeCount: data.likeCount || 0,
                            createdAt: data.createdAt,
                          };
                        });
                      setPosts(postsData);
                      setStats((prev) => ({ ...prev, postsCount: postsData.length }));
                    },
                    (finalErr: any) => {
                      // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
                      if (finalErr?.message?.includes('INTERNAL ASSERTION FAILED') || finalErr?.message?.includes('Unexpected state')) {
                        console.warn('⚠️ Firestore internal error (non-fatal, will retry):', finalErr.message?.substring(0, 100));
                        return;
                      }
                      console.warn('Error with fallback posts query:', finalErr.message || finalErr);
                    }
                  );
                }
              );
            } catch (altError: any) {
              console.warn('Error setting up alt query:', altError.message || altError);
            }
          }
        );
      } catch (error: any) {
        console.warn('Error setting up posts query:', error.message || error);
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
      try {
        const memoriesQuery = query(
          collection(db, 'posts'),
          where('userId', '==', targetUserId),
          orderBy('createdAt', 'desc')
        );

        unsubscribeMemories = onSnapshot(
          memoriesQuery,
          async (snapshot) => {
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

            setMemories(memoriesData);
            
            // Convert trip map to array
            const trips: TripCollection[] = Array.from(tripMap.entries()).map(([id, data]) => ({
              id,
              name: data.name,
              coverImage: data.coverImage,
              memoryCount: data.count,
            }));
            setTripCollections(trips);
          },
          (error: any) => {
            // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
            if (error?.message?.includes('INTERNAL ASSERTION FAILED') || error?.message?.includes('Unexpected state')) {
              console.warn('⚠️ Firestore internal error (non-fatal, will retry):', error.message?.substring(0, 100));
              return;
            }
            console.error('Error fetching memories with userId, trying createdBy:', error);
            // Fallback to createdBy
            try {
              const altMemoriesQuery = query(
                collection(db, 'posts'),
                where('createdBy', '==', targetUserId),
                orderBy('createdAt', 'desc')
              );
              unsubscribeMemories = onSnapshot(
                altMemoriesQuery,
                async (snapshot) => {
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

                      if (data.tripId || data.title) {
                        const tripKey = data.tripId || data.title;
                        const existing = tripMap.get(tripKey) || { name: data.title || data.tripName || 'Untitled Trip', count: 0, coverImage: data.coverImage || data.imageURL || data.gallery?.[0] };
                        existing.count++;
                        tripMap.set(tripKey, existing);
                      }
                    }
                  }

                  setMemories(memoriesData);
                  const trips: TripCollection[] = Array.from(tripMap.entries()).map(([id, data]) => ({
                    id,
                    name: data.name,
                    coverImage: data.coverImage,
                    memoryCount: data.count,
                  }));
                  setTripCollections(trips);
                },
                (err: any) => {
                  // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
                  if (err?.message?.includes('INTERNAL ASSERTION FAILED') || err?.message?.includes('Unexpected state')) {
                    console.warn('⚠️ Firestore internal error (non-fatal, will retry):', err.message?.substring(0, 100));
                    return;
                  }
                  console.error('Error with alt memories query:', err);
                }
              );
            } catch (altError: any) {
              // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
              if (altError?.message?.includes('INTERNAL ASSERTION FAILED') || altError?.message?.includes('Unexpected state')) {
                console.warn('⚠️ Firestore internal error (non-fatal, will retry):', altError.message?.substring(0, 100));
                return;
              }
              console.error('Error setting up alt memories query:', altError);
            }
          }
        );
      } catch (error: any) {
        // Suppress Firestore internal assertion errors (non-fatal SDK bugs)
        if (error?.message?.includes('INTERNAL ASSERTION FAILED') || error?.message?.includes('Unexpected state')) {
          console.warn('⚠️ Firestore internal error (non-fatal, will retry):', error.message?.substring(0, 100));
          return;
        }
        console.error('Error setting up memories query:', error);
      }
    };

    setupMemoriesListener();

    // Fetch reviews (from posts that have reviews)
    const fetchReviews = async () => {
      try {
        // Get all posts by this user
        const userPostsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', targetUserId)
        );
        const userPostsSnap = await getDocs(userPostsQuery);
        
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
            } catch (err) {
              console.error('Error fetching reviewer info:', err);
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
    setLoading(false);

    return () => {
      unsubscribeUser();
      if (unsubscribePosts) unsubscribePosts();
      if (unsubscribeMemories) unsubscribeMemories();
    };
  }, [targetUserId]);

  return {
    profileData,
    stats,
    posts,
    memories,
    tripCollections,
    reviews,
    loading,
  };
}

