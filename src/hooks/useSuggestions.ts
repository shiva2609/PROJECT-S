/**
 * useSuggestions Hook
 * Fetches and manages user suggestions with real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../api/authService';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { SuggestionCandidate, sortCandidatesByScore, rotateSuggestions, chunkArray } from '../utils/suggestionUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { filterValidPosts } from '../utils/postUtils';

const RECENTLY_SHOWN_KEY = 'recently_shown_suggestions';
const RECENTLY_SHOWN_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface SuggestionCategory {
  title: string;
  users: SuggestionCandidate[];
  loading: boolean;
}

/**
 * Get recently shown suggestions from local storage
 */
async function getRecentlyShown(): Promise<Set<string>> {
  try {
    const data = await AsyncStorage.getItem(RECENTLY_SHOWN_KEY);
    if (!data) return new Set();
    
    const parsed = JSON.parse(data);
    const now = Date.now();
    const valid: string[] = [];
    
    for (const [userId, timestamp] of Object.entries(parsed)) {
      if (now - (timestamp as number) < RECENTLY_SHOWN_TTL) {
        valid.push(userId);
      }
    }
    
    return new Set(valid);
  } catch {
    return new Set();
  }
}

/**
 * Save recently shown suggestions to local storage
 */
async function saveRecentlyShown(userIds: string[]): Promise<void> {
  try {
    const existing = await getRecentlyShown();
    const now = Date.now();
    const data: Record<string, number> = {};
    
    // Keep existing valid entries
    for (const userId of existing) {
      data[userId] = now; // Update timestamp
    }
    
    // Add new entries
    for (const userId of userIds) {
      data[userId] = now;
    }
    
    await AsyncStorage.setItem(RECENTLY_SHOWN_KEY, JSON.stringify(data));
    } catch (error: any) {
      console.warn('Error saving recently shown suggestions:', error.message || error);
    }
}

/**
 * Hook for fetching user suggestions
 * Caches suggestions and updates locally on follow (no refetch)
 */
export function useSuggestions() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<SuggestionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyShown, setRecentlyShown] = useState<Set<string>>(new Set());
  const cacheRef = useRef<SuggestionCategory[]>([]);

  // Fetch current user data
  const fetchCurrentUser = useCallback(async () => {
    if (!user) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return null;

      const data = userDoc.data();
      return {
        id: user.uid,
        location: data.location,
        interests: data.interests || [],
        contactsHash: data.contactsHash || [],
      };
    } catch (error: any) {
      console.warn('Firestore query error:', error.message || error);
      return null;
    }
  }, [user]);

  // Fetch following IDs (users the current user is following)
  const fetchFollowingIds = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const followsRef = collection(db, 'follows');
      const q = query(followsRef, where('followerId', '==', user.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data().followingId);
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      return [];
    }
  }, [user]);

  // Fetch follower IDs (users who follow the current user)
  const fetchFollowerIds = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const followsRef = collection(db, 'follows');
      const q = query(followsRef, where('followingId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      console.log('[Suggestions] Query for followers - Total docs found:', snapshot.docs.length);
      console.log('[Suggestions] Current user ID (followingId):', user.uid);
      
      // Log all documents to debug
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`[Suggestions] Follow doc ${index}:`, {
          docId: doc.id,
          followerId: data.followerId,
          followingId: data.followingId,
          timestamp: data.timestamp,
        });
      });
      
      const followerIds = snapshot.docs.map(doc => {
        const data = doc.data();
        const followerId = data.followerId;
        console.log('[Suggestions] Extracted followerId:', followerId, 'from doc:', doc.id);
        return followerId;
      }).filter(id => {
        const isValid = id && id !== user.uid;
        if (!isValid) {
          console.log('[Suggestions] Filtered out invalid followerId:', id);
        }
        return isValid;
      });
      
      console.log('[Suggestions] Found valid followers:', followerIds.length, followerIds);
      return followerIds;
    } catch (error: any) {
      console.error('[Suggestions] Error in fetchFollowerIds:', error);
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      return [];
    }
  }, [user]);

  // NOTE: fetchFollowers is now replaced by direct reverse-follower logic in fetchSuggestions
  // This function is kept for backward compatibility but reverse-followers are handled separately
  const fetchFollowers = useCallback(async (excludeIds: string[]): Promise<SuggestionCandidate[]> => {
    // This function is deprecated - reverse-followers are now handled directly in fetchSuggestions
    // to ensure they always appear regardless of filters
    return [];
  }, []);

  // Fetch verified users
  const fetchVerifiedUsers = useCallback(async (excludeIds: string[]): Promise<SuggestionCandidate[]> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('verified', '==', true),
        orderBy('followersCount', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.fullname || data.name || data.username || 'User',
            username: data.username || 'user',
            avatar: data.profilePic || data.avatar || data.photoURL,
            bio: data.bio || data.aboutMe,
            location: data.location,
            verified: data.verified || false,
            interests: data.interests || [],
            contactsHash: data.contactsHash || [],
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            postsCount: data.postsCount || 0,
            createdAt: data.createdAt,
            lastActiveAt: data.lastActiveAt,
          } as SuggestionCandidate;
        })
        .filter(user => !excludeIds.includes(user.id));
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      return [];
    }
  }, []);

  // Fetch users by location
  const fetchUsersByLocation = useCallback(async (
    location: string,
    excludeIds: string[]
  ): Promise<SuggestionCandidate[]> => {
    if (!location) return [];

    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('location', '==', location),
        limit(50)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.fullname || data.name || data.username || 'User',
            username: data.username || 'user',
            avatar: data.profilePic || data.avatar || data.photoURL,
            bio: data.bio || data.aboutMe,
            location: data.location,
            verified: data.verified || false,
            interests: data.interests || [],
            contactsHash: data.contactsHash || [],
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            postsCount: data.postsCount || 0,
            createdAt: data.createdAt,
            lastActiveAt: data.lastActiveAt,
          } as SuggestionCandidate;
        })
        .filter(user => !excludeIds.includes(user.id));
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      return [];
    }
  }, []);

  // Fetch contact mutuals
  const fetchContactMutuals = useCallback(async (
    contactsHash: string[],
    excludeIds: string[]
  ): Promise<SuggestionCandidate[]> => {
    if (!contactsHash || contactsHash.length === 0) return [];

    try {
      const chunks = chunkArray(contactsHash, 10); // Firestore limit
      const allUsers: SuggestionCandidate[] = [];

      for (const chunk of chunks) {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('contactsHash', 'array-contains-any', chunk),
          limit(50)
        );
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (!excludeIds.includes(doc.id)) {
            allUsers.push({
              id: doc.id,
              name: data.fullname || data.name || data.username || 'User',
              username: data.username || 'user',
              avatar: data.profilePic || data.avatar || data.photoURL,
              bio: data.bio || data.aboutMe,
              location: data.location,
              verified: data.verified || false,
              interests: data.interests || [],
              contactsHash: data.contactsHash || [],
              followersCount: data.followersCount || 0,
              followingCount: data.followingCount || 0,
              postsCount: data.postsCount || 0,
              createdAt: data.createdAt,
              lastActiveAt: data.lastActiveAt,
            } as SuggestionCandidate);
          }
        });
      }

      // Remove duplicates
      const uniqueUsers = Array.from(
        new Map(allUsers.map(user => [user.id, user])).values()
      );

      return uniqueUsers;
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      return [];
    }
  }, []);

  // Fetch new users
  const fetchNewUsers = useCallback(async (excludeIds: string[]): Promise<SuggestionCandidate[]> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      return snapshot.docs
        .map(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toMillis?.() || data.createdAt || 0;
          return {
            id: doc.id,
            name: data.fullname || data.name || data.username || 'User',
            username: data.username || 'user',
            avatar: data.profilePic || data.avatar || data.photoURL,
            bio: data.bio || data.aboutMe,
            location: data.location,
            verified: data.verified || false,
            interests: data.interests || [],
            contactsHash: data.contactsHash || [],
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            postsCount: data.postsCount || 0,
            createdAt: data.createdAt,
            lastActiveAt: data.lastActiveAt,
            isNewUser: createdAt > weekAgo,
          } as SuggestionCandidate;
        })
        .filter(user => {
          // Skip users without createdAt
          if (!user.createdAt) return false;
          return !excludeIds.includes(user.id) && user.isNewUser;
        });
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
      return [];
    }
  }, []);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);

  // Fetch all suggestions
  const fetchSuggestions = useCallback(async (rotate = false) => {
    if (!user) return;
    
    // Prevent duplicate calls
    if (fetchingRef.current) {
      console.log('[Suggestions] Fetch already in progress, skipping duplicate call');
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      const currentUser = await fetchCurrentUser();
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const followingIds = await fetchFollowingIds();
      // IMPORTANT: excludeIds only contains users we're following + ourselves
      // Users who follow us are NOT in excludeIds, so they will appear in all categories
      // This ensures followers show up in location, verified, contacts, etc. suggestions
      const excludeIds = [...followingIds, user.uid];
      
      console.log('[Suggestions] Following IDs:', followingIds.length, followingIds);
      console.log('[Suggestions] Exclude IDs (users we follow + self):', excludeIds);

      // Load recently shown if rotating
      let recentlyShownSet = recentlyShown;
      if (rotate) {
        recentlyShownSet = await getRecentlyShown();
        setRecentlyShown(recentlyShownSet);
      }

      const categoriesData: SuggestionCategory[] = [];

      // 0. People Who Follow You (HIGHEST PRIORITY - ALWAYS SHOW - users who follow you but you don't follow back)
      // This category MUST always appear if there are any reverse-followers, regardless of other filters
      const allFollowerIds = await fetchFollowerIds();
      console.log('[Suggestions] All follower IDs (before filtering):', allFollowerIds.length, allFollowerIds);
      
      // Filter to only users we DON'T follow back (non-mutual followers)
      const notFollowedBackIds = allFollowerIds.filter(followerId => 
        followerId !== user.uid && !followingIds.includes(followerId)
      );
      
      console.log('[Suggestions] Not followed back (reverse-followers):', notFollowedBackIds.length, notFollowedBackIds);
      console.log('[Suggestions] Following IDs (mutual follows to exclude):', followingIds);
      
      // ALWAYS fetch and show reverse-followers, regardless of other filters
      if (notFollowedBackIds.length > 0) {
        // Fetch user documents for reverse-followers
        const reverseFollowerDocs = await Promise.all(
          notFollowedBackIds.slice(0, 50).map(async (followerId) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', followerId));
              if (!userDoc.exists()) {
                console.log('[Suggestions] User document not found for reverse-follower:', followerId);
                return null;
              }
              const data = userDoc.data();
              const candidate = {
                id: userDoc.id,
                name: data.fullname || data.name || data.username || 'User',
                username: data.username || 'user',
                avatar: data.profilePic || data.avatar || data.photoURL,
                bio: data.bio || data.aboutMe,
                location: data.location,
                verified: data.verified || false,
                interests: data.interests || [],
                contactsHash: data.contactsHash || [],
                followersCount: data.followersCount || 0,
                followingCount: data.followingCount || 0,
                postsCount: data.postsCount || 0,
                createdAt: data.createdAt,
                lastActiveAt: data.lastActiveAt,
                isFollowing: false, // They follow us, but we don't follow them back yet
                isReverseFollow: true, // Mark as reverse-follow for priority
                priority: 999, // Highest priority
              } as SuggestionCandidate & { isReverseFollow: boolean; priority: number };
              console.log('[Suggestions] Fetched reverse-follower:', candidate.id, candidate.name);
              return candidate;
            } catch (err: any) {
              console.warn('[Suggestions] Error fetching reverse-follower user:', followerId, err.message);
              return null;
            }
          })
        );

        const validReverseFollowers = reverseFollowerDocs.filter((user): user is SuggestionCandidate => user !== null);
        console.log('[Suggestions] Valid reverse-followers:', validReverseFollowers.length);
        
        // ALWAYS add this category if we have reverse-followers, regardless of other conditions
        // Check if category already exists to prevent duplicates
        const existingCategory = categoriesData.find(cat => cat.title === 'People Who Follow You');
        if (validReverseFollowers.length > 0 && !existingCategory) {
          // Don't apply rotation or recently-shown filters to reverse-followers - they should ALWAYS appear
          const reverseFollowersToShow = validReverseFollowers.slice(0, 20); // Show up to 20
          
          // Deduplicate users within this category
          const uniqueReverseFollowers = Array.from(
            new Map(reverseFollowersToShow.map(u => [u.id, u])).values()
          );
          
          console.log('[Suggestions] Adding "People Who Follow You" category with', uniqueReverseFollowers.length, 'users (PRIORITY - always shown)');
          
          // Insert at the beginning (highest priority) - only if not already added
          categoriesData.unshift({
            title: 'People Who Follow You',
            users: uniqueReverseFollowers,
            loading: false,
          });
          console.log('[Suggestions] Category "People Who Follow You" added to categoriesData (PRIORITY)');
        } else if (existingCategory) {
          console.log('[Suggestions] "People Who Follow You" category already exists, skipping duplicate');
        }
      } else {
        console.log('[Suggestions] No reverse-followers found (all followers are mutual follows)');
      }

      // 1. Priority Accounts (Verified + High Activity)
      const verifiedUsers = await fetchVerifiedUsers(excludeIds);
      const priorityUsers = sortCandidatesByScore(verifiedUsers, currentUser)
        .slice(0, 20);
      const rotatedPriority = rotate
        ? rotateSuggestions(priorityUsers, recentlyShownSet)
        : priorityUsers.slice(0, 8);
      
      if (rotatedPriority.length > 0) {
        categoriesData.push({
          title: 'Priority Accounts',
          users: rotatedPriority,
          loading: false,
        });
        if (rotate) {
          await saveRecentlyShown(rotatedPriority.map(u => u.id));
        }
      }

      // 2. Verified Travellers
      const verifiedTravellers = verifiedUsers
        .filter(u => u.verified)
        .slice(0, 20);
      const rotatedVerified = rotate
        ? rotateSuggestions(verifiedTravellers, recentlyShownSet)
        : verifiedTravellers.slice(0, 8);
      
      if (rotatedVerified.length > 0) {
        categoriesData.push({
          title: 'Verified Travellers',
          users: rotatedVerified,
          loading: false,
        });
      }

      // 3. People Near You
      if (currentUser.location) {
        const locationUsers = await fetchUsersByLocation(currentUser.location, excludeIds);
        const sortedLocation = sortCandidatesByScore(locationUsers, currentUser);
        const rotatedLocation = rotate
          ? rotateSuggestions(sortedLocation, recentlyShownSet)
          : sortedLocation.slice(0, 8);
        
        if (rotatedLocation.length > 0) {
          categoriesData.push({
            title: 'People Near You',
            users: rotatedLocation,
            loading: false,
          });
        }
      }

      // 4. Contacts Mutuals
      if (currentUser.contactsHash && currentUser.contactsHash.length > 0) {
        const contactMutuals = await fetchContactMutuals(currentUser.contactsHash, excludeIds);
        const sortedMutuals = sortCandidatesByScore(contactMutuals, currentUser);
        const rotatedMutuals = rotate
          ? rotateSuggestions(sortedMutuals, recentlyShownSet)
          : sortedMutuals.slice(0, 8);
        
        if (rotatedMutuals.length > 0) {
          categoriesData.push({
            title: 'Contacts Mutuals',
            users: rotatedMutuals,
            loading: false,
          });
        }
      }

      // 5. New Explorers
      const newUsers = await fetchNewUsers(excludeIds);
      const sortedNew = sortCandidatesByScore(newUsers, currentUser);
      const rotatedNew = rotate
        ? rotateSuggestions(sortedNew, recentlyShownSet)
        : sortedNew.slice(0, 8);
      
      if (rotatedNew.length > 0) {
        categoriesData.push({
          title: 'New Explorers',
          users: rotatedNew,
          loading: false,
        });
      }

      // GLOBAL DEDUPLICATION: Ensure each user appears ONLY ONCE across ALL categories
      // Priority: "People Who Follow You" > other categories
      const uniqueCategories: SuggestionCategory[] = [];
      const seenTitles = new Set<string>();
      const usedUserIds = new Set<string>(); // Track users already assigned to a category
      
      // First pass: Process "People Who Follow You" category (highest priority)
      const peopleWhoFollowYouCategory = categoriesData.find(cat => cat.title === 'People Who Follow You');
      if (peopleWhoFollowYouCategory && !seenTitles.has('People Who Follow You')) {
        seenTitles.add('People Who Follow You');
        
        // Deduplicate users within this category
        const uniqueUsers = Array.from(
          new Map(peopleWhoFollowYouCategory.users.map(u => [u.id, u])).values()
        );
        
        // Mark all users as used
        uniqueUsers.forEach(user => usedUserIds.add(user.id));
        
        if (uniqueUsers.length > 0) {
          uniqueCategories.push({
            ...peopleWhoFollowYouCategory,
            users: uniqueUsers,
          });
          console.log('[Suggestions] Added "People Who Follow You" category with', uniqueUsers.length, 'unique users');
        }
      }
      
      // Second pass: Process other categories, excluding users already in "People Who Follow You"
      for (const category of categoriesData) {
        // Skip "People Who Follow You" (already processed) and duplicates
        if (category.title === 'People Who Follow You' || seenTitles.has(category.title)) {
          if (category.title !== 'People Who Follow You') {
            console.log('[Suggestions] Skipping duplicate category:', category.title);
          }
          continue;
        }
        
        seenTitles.add(category.title);
        
        // Deduplicate users within this category AND exclude users already in "People Who Follow You"
        const uniqueUsersInCategory: SuggestionCandidate[] = [];
        const seenInCategory = new Set<string>();
        
        for (const user of category.users) {
          // Skip if user already used in a higher priority category OR duplicate within this category
          if (!usedUserIds.has(user.id) && !seenInCategory.has(user.id)) {
            uniqueUsersInCategory.push(user);
            usedUserIds.add(user.id);
            seenInCategory.add(user.id);
          }
        }
        
        // Only add category if it has users after deduplication
        if (uniqueUsersInCategory.length > 0) {
          uniqueCategories.push({
            ...category,
            users: uniqueUsersInCategory,
          });
          console.log('[Suggestions] Added category:', category.title, 'with', uniqueUsersInCategory.length, 'unique users');
        } else {
          console.log('[Suggestions] Removing category with no unique users:', category.title);
        }
      }

      console.log('[Suggestions] Setting categories (after global deduplication):', uniqueCategories.length, uniqueCategories.map(c => ({ title: c.title, users: c.users.length, userIds: c.users.map(u => u.id) })));
      setCategories(uniqueCategories);
      cacheRef.current = uniqueCategories; // Cache suggestions
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore query error: ensure createdAt exists.');
      } else {
        console.warn('Firestore query error:', error.message || error);
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [user, recentlyShown, fetchCurrentUser, fetchFollowingIds, fetchFollowerIds, fetchFollowers, fetchVerifiedUsers, fetchUsersByLocation, fetchContactMutuals, fetchNewUsers]);

  // Update suggestion locally when user follows (no refetch)
  const updateSuggestionFollowState = useCallback((targetUserId: string, isFollowing: boolean) => {
    setCategories(prev => 
      prev.map(category => ({
        ...category,
        users: category.users.map(user => 
          user.id === targetUserId 
            ? { ...user, isFollowing } 
            : user
        ),
      }))
    );
    // Update cache too
    cacheRef.current = cacheRef.current.map(category => ({
      ...category,
      users: category.users.map(user => 
        user.id === targetUserId 
          ? { ...user, isFollowing } 
          : user
      ),
    }));
  }, []);

  // Initial load
  useEffect(() => {
    fetchSuggestions(false);
  }, [fetchSuggestions]);

  // Refresh with rotation
  const refresh = useCallback(() => {
    fetchSuggestions(true);
  }, [fetchSuggestions]);

  return {
    categories,
    loading,
    refresh,
    updateSuggestionFollowState,
  };
}

