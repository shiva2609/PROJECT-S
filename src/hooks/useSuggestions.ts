import { useCallback, useState, useEffect, useMemo } from 'react';
import { useUserRelations } from '../providers/UserRelationProvider';
import { useAuth } from '../providers/AuthProvider';
import * as UserService from '../global/services/user/user.service';
import * as UsersAPI from '../services/users/usersService';
import { db } from '../services/auth/authService';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface SuggestionUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUri?: string;
  isVerified?: boolean;
  followerCount?: number;
  mutualFollowers?: number;
  reason?: 'popular' | 'mutual' | 'new' | 'second_degree';
  name?: string;
  profilePic?: string;
  profilePhoto?: string;
}

export interface SuggestionCategory {
  title: string;
  users: SuggestionUser[];
}

interface UseSuggestionsReturn {
  categories: SuggestionCategory[];
  loading: boolean;
  refresh: () => Promise<void>;
  updateSuggestionFollowState: (userId: string, isFollowing: boolean) => void;
}

/**
 * User discovery engine for generating personalized suggestions
 * Returns categorized suggestions: People Who Follow You, Popular, Mutual Followers, etc.
 */
export function useSuggestions(): UseSuggestionsReturn {
  const { user } = useAuth();
  const { following } = useUserRelations();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<SuggestionCategory[]>([]);
  const [suggestionUsers, setSuggestionUsers] = useState<Map<string, SuggestionUser>>(new Map());

  /**
   * Update follow state in local suggestions (optimistic update)
   */
  const updateSuggestionFollowState = useCallback((userId: string, isFollowing: boolean) => {
    setSuggestionUsers(prev => {
      const updated = new Map(prev);
      const user = updated.get(userId);
      if (user) {
        updated.set(userId, { ...user, isFollowing });
      }
      return updated;
    });
  }, []);

  /**
   * Fetch users who follow the current user
   */
  const fetchPeopleWhoFollowYou = useCallback(async (currentUserId: string): Promise<SuggestionUser[]> => {
    try {
      const followsRef = collection(db, 'follows');
      const q = query(followsRef, where('followingId', '==', currentUserId));
      const snapshot = await getDocs(q);
      
      const followerIds = snapshot.docs.map(doc => doc.data().followerId).filter(Boolean);
      
      if (followerIds.length === 0) return [];
      
      // Batch fetch user documents using global service
      const userIdsToFetch = followerIds.slice(0, 20);
      const userInfos = await UserService.getUsersPublicInfo(userIdsToFetch);
      
      const users: SuggestionUser[] = userInfos
        .filter(userInfo => !following.has(userInfo.uid)) // Exclude already following
        .map(userInfo => ({
          id: userInfo.uid,
          username: userInfo.username || '',
          displayName: userInfo.displayName || userInfo.username || '',
          name: userInfo.displayName || userInfo.username || '',
          avatarUri: userInfo.photoURL || undefined,
          profilePic: userInfo.photoURL || undefined,
          profilePhoto: userInfo.photoURL || undefined,
          isVerified: userInfo.verified || false,
          followerCount: 0, // Will be updated if needed
          mutualFollowers: 0, // Will be calculated
          reason: 'mutual' as const,
        } as SuggestionUser));
      
      return users;
    } catch (error) {
      console.error('Error fetching people who follow you:', error);
      return [];
    }
  }, [following]);

  /**
   * Fetch general suggestions from API
   */
  const fetchGeneralSuggestions = useCallback(async (currentUserId: string): Promise<SuggestionUser[]> => {
    try {
      // Get suggested users from API (returns User objects with IDs)
      const suggestedUsers = await UsersAPI.getSuggested(currentUserId, {
        excludeFollowing: Array.from(following),
        limit: 30,
      });

      if (suggestedUsers.length === 0) {
        return [];
      }

      // Extract user IDs and batch fetch fresh data using global service
      const userIds = suggestedUsers.map(u => u.id).filter(Boolean);
      const userInfos = await UserService.getUsersPublicInfo(userIds);
      
      // Create a map for quick lookup of follower counts from original data
      const followerCountMap = new Map<string, number>();
      suggestedUsers.forEach(u => {
        if (u.followersCount) {
          followerCountMap.set(u.id, u.followersCount);
        }
      });
      
      // Transform to SuggestionUser format using fresh Firestore data
      return userInfos.map(userInfo => ({
        id: userInfo.uid,
        username: userInfo.username || '',
        displayName: userInfo.displayName || userInfo.username || '',
        name: userInfo.displayName || userInfo.username || '',
        avatarUri: userInfo.photoURL || undefined,
        profilePic: userInfo.photoURL || undefined,
        profilePhoto: userInfo.photoURL || undefined,
        isVerified: userInfo.verified || false,
        followerCount: followerCountMap.get(userInfo.uid) || 0,
        mutualFollowers: 0,
        reason: 'popular' as const,
      })) as SuggestionUser[];
    } catch (error) {
      console.error('Error fetching general suggestions:', error);
      return [];
    }
  }, [following]);

  /**
   * Refresh suggestions
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!user?.uid || isLoading) return;

    setIsLoading(true);
    try {
      // Fetch both types of suggestions in parallel
      const [peopleWhoFollowYou, generalSuggestions] = await Promise.all([
        fetchPeopleWhoFollowYou(user.uid),
        fetchGeneralSuggestions(user.uid),
      ]);

      // Update suggestion users map
      const userMap = new Map<string, SuggestionUser>();
      [...peopleWhoFollowYou, ...generalSuggestions].forEach(u => {
        userMap.set(u.id, u);
      });
      setSuggestionUsers(userMap);

      // Build categories
      const newCategories: SuggestionCategory[] = [];

      // Category 1: People Who Follow You (highest priority)
      if (peopleWhoFollowYou.length > 0) {
        newCategories.push({
          title: 'People Who Follow You',
          users: peopleWhoFollowYou,
        });
      }

      // Category 2: Popular Accounts
      const popular = generalSuggestions
        .filter(u => (u.followerCount || 0) > 100)
        .slice(0, 10);
      if (popular.length > 0) {
        newCategories.push({
          title: 'Popular Accounts',
          users: popular,
        });
      }

      // Category 3: Suggested for You
      const suggested = generalSuggestions
        .filter(u => !popular.includes(u))
        .slice(0, 10);
      if (suggested.length > 0) {
        newCategories.push({
          title: 'Suggested for You',
          users: suggested,
        });
      }

      setCategories(newCategories);
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isLoading, following, fetchPeopleWhoFollowYou, fetchGeneralSuggestions]);

  // Auto-fetch on mount
  useEffect(() => {
    if (user?.uid) {
      refresh();
    }
  }, [user?.uid]); // Only depend on user.uid, refresh will be stable

  // Update categories when suggestionUsers change (for follow state updates)
  const updatedCategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      users: category.users.map(user => {
        const updated = suggestionUsers.get(user.id);
        return updated ? { ...user, ...updated } : user;
      }),
    }));
  }, [categories, suggestionUsers]);

  return {
    categories: updatedCategories,
    loading: isLoading,
    refresh,
    updateSuggestionFollowState,
  };
}
