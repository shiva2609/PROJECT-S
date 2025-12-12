import { useCallback, useState, useEffect, useMemo } from 'react';
import { useUserRelations } from '../providers/UserRelationProvider';
import { useAuth } from '../providers/AuthProvider';
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
      
      // Fetch user documents
      const userPromises = followerIds.slice(0, 20).map(async (followerId: string) => {
        try {
          const userDoc = await UsersAPI.getUserById(followerId);
          if (userDoc) {
            return {
              id: userDoc.id,
              username: userDoc.username || '',
              displayName: userDoc.name || userDoc.username || '',
              name: userDoc.name || userDoc.username || '',
              avatarUri: userDoc.photoUrl || userDoc.photoURL || userDoc.profilePhoto || undefined,
              profilePic: userDoc.photoUrl || userDoc.photoURL || userDoc.profilePhoto || undefined,
              profilePhoto: userDoc.photoUrl || userDoc.photoURL || userDoc.profilePhoto || undefined,
              isVerified: userDoc.verified || false,
              followerCount: userDoc.followersCount || 0,
              mutualFollowers: 0, // Will be calculated
              reason: 'mutual' as const,
            } as SuggestionUser;
          }
        } catch (error) {
          console.warn(`Error fetching user ${followerId}:`, error);
        }
        return null;
      });
      
      const users = (await Promise.all(userPromises)).filter((u): u is SuggestionUser => u !== null);
      return users.filter(u => !following.has(u.id)); // Exclude already following
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
      const suggestions = await UsersAPI.getSuggested(currentUserId, {
        excludeFollowing: Array.from(following),
        limit: 30,
      });

      // Transform to SuggestionUser format
      return suggestions.map(user => ({
        id: user.id,
        username: user.username || '',
        displayName: user.name || user.username || '',
        name: user.name || user.username || '',
        avatarUri: user.photoUrl || user.photoURL || user.profilePhoto || undefined,
        profilePic: user.photoUrl || user.photoURL || user.profilePhoto || undefined,
        profilePhoto: user.photoUrl || user.photoURL || user.profilePhoto || undefined,
        isVerified: user.verified || false,
        followerCount: user.followersCount || 0,
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
