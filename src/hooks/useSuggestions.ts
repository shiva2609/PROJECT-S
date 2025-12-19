import { useCallback, useState, useEffect, useMemo } from 'react';
import { useUserRelations } from '../providers/UserRelationProvider';
import { useAuth } from '../providers/AuthProvider';
import * as UserService from '../global/services/user/user.service';
import * as FollowService from '../global/services/follow/follow.service';
import * as UsersAPI from '../services/users/usersService';
import { segmentFollowersAndSuggestions } from '../global/services/follow/follow.segmentation';

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
  followers: SuggestionUser[];
  suggestions: SuggestionUser[];
  followersCount: number;
  suggestionsCount: number;
  contactsPermissionGranted: boolean;
  contactsProcessed: boolean;
  contactSuggestions: SuggestionUser[];
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

  // Contacts state
  const [contactsPermissionGranted, setContactsPermissionGranted] = useState(false);
  const [contactsProcessed, setContactsProcessed] = useState(false);
  const [contactSuggestions, setContactSuggestions] = useState<SuggestionUser[]>([]);

  /**
   * Check contacts state on mount or refresh
   */
  const checkContactsState = useCallback(async () => {
    if (!user?.uid) return;

    try {
      // Check permission (async)
      const contactsService = await import('../services/contacts/contactsService');
      const hasPermission = await contactsService.checkContactsPermission();
      setContactsPermissionGranted(hasPermission);

      // Check if hashes uploaded (async)
      const hasUploaded = await contactsService.hasUploadedContacts(user.uid);
      setContactsProcessed(hasUploaded);

      // If permission granted and uploaded, fetch matches (placeholder)
      if (hasPermission && hasUploaded) {
        setContactSuggestions([]);
      }
    } catch (err) {
      console.warn('Error checking contacts state:', err);
    }
  }, [user?.uid]);

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
   * Fetch users who follow the current user using global service
   */
  const fetchPeopleWhoFollowYou = useCallback(async (currentUserId: string): Promise<SuggestionUser[]> => {
    try {
      // Use global follow service to get follower IDs
      const followerIds = await FollowService.getFollowersIds(currentUserId);

      if (followerIds.length === 0) return [];

      // Batch fetch user documents using global service
      const userIdsToFetch = followerIds.slice(0, 50); // Increased limit for segmentation
      const userInfos = await UserService.getUsersPublicInfo(userIdsToFetch);

      // Transform to SuggestionUser format
      const users: SuggestionUser[] = userInfos.map(userInfo => ({
        id: userInfo.uid,
        username: userInfo.username || '',
        displayName: userInfo.displayName || userInfo.username || '',
        name: userInfo.displayName || userInfo.username || '',
        avatarUri: userInfo.photoURL || undefined,
        profilePic: userInfo.photoURL || undefined,
        profilePhoto: userInfo.photoURL || undefined,
        isVerified: userInfo.verified || false,
        followerCount: userInfo.followersCount || 0,
        mutualFollowers: 0, // Will be calculated
        reason: 'mutual' as const,
      } as SuggestionUser));

      return users;
    } catch (error) {
      console.error('Error fetching people who follow you:', error);
      return [];
    }
  }, []);

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
   * Refresh suggestions using global segmentation
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!user?.uid || isLoading) return;

    setIsLoading(true);
    try {
      // Check contacts state and fetch matches
      let fetchedContacts: SuggestionUser[] = [];
      try {
        const contactsService = await import('../services/contacts/contactsService');
        const hasPermission = await contactsService.checkContactsPermission();
        setContactsPermissionGranted(hasPermission);

        const hasUploaded = await contactsService.hasUploadedContacts(user.uid);
        setContactsProcessed(hasUploaded);

        if (hasPermission && hasUploaded) {
          console.log('📞 Fetching contact matches...');

          // Get following IDs to exclude
          const followingIds = await FollowService.getFollowingIds(user.uid);

          // Find users who match contacts
          const matches = await contactsService.findContactMatches(user.uid, followingIds);

          // Transform to SuggestionUser format
          fetchedContacts = matches.map((match): SuggestionUser => ({
            id: match.id,
            username: match.username || '',
            displayName: match.displayName || match.username || '',
            name: match.displayName || match.username || '',
            avatarUri: match.photoURL || undefined,
            profilePic: match.photoURL || undefined,
            profilePhoto: match.photoURL || undefined,
            isVerified: match.verified || false,
            followerCount: match.followersCount || 0,
            mutualFollowers: 0,
            reason: 'mutual' as const,
          }));

          console.log(`✅ Found ${fetchedContacts.length} contact suggestions`);
        }
        setContactSuggestions(fetchedContacts);
      } catch (err) {
        console.warn('⚠️ Error fetching contact suggestions:', err);
        setContactSuggestions([]);
      }

      // STEP 1: Fetch raw data in parallel
      const [followerIds, generalSuggestions] = await Promise.all([
        FollowService.getFollowersIds(user.uid),
        fetchGeneralSuggestions(user.uid),
      ]);

      // STEP 2: Get following IDs for segmentation
      const followingIds = await FollowService.getFollowingIds(user.uid);

      // STEP 3: Fetch full user data for followers
      const followerUserInfos = followerIds.length > 0
        ? await UserService.getUsersPublicInfo(followerIds.slice(0, 50))
        : [];

      // STEP 4: Transform to common format for segmentation
      const followersAsUsers = followerUserInfos.map(userInfo => ({
        uid: userInfo.uid,
        id: userInfo.uid,
        ...userInfo,
      }));

      const suggestedAsUsers = generalSuggestions.map(s => ({
        uid: s.id,
        id: s.id,
        ...s,
      }));

      // STEP 5: Use global segmentation service
      const { followersSection, suggestedSection, followersCount, suggestionsCount } =
        segmentFollowersAndSuggestions({
          followers: followersAsUsers,
          followingIds,
          suggestedUsers: suggestedAsUsers,
          loggedUserId: user.uid,
        });

      // STEP 6: Transform segmented results back to SuggestionUser format
      const segmentedFollowers: SuggestionUser[] = followersSection.map(f => ({
        id: f.uid || f.id,
        username: f.username || '',
        displayName: f.displayName || f.name || f.username || '',
        name: f.displayName || f.name || f.username || '',
        avatarUri: f.photoURL || f.avatarUri || f.profilePic || f.profilePhoto,
        profilePic: f.photoURL || f.avatarUri || f.profilePic || f.profilePhoto,
        profilePhoto: f.photoURL || f.avatarUri || f.profilePic || f.profilePhoto,
        isVerified: f.verified || false,
        followerCount: f.followersCount || 0,
        mutualFollowers: 0,
        reason: 'mutual' as const,
      }));

      const segmentedSuggestions: SuggestionUser[] = suggestedSection.map(s => ({
        id: s.uid || s.id,
        username: s.username || '',
        displayName: s.displayName || s.name || s.username || '',
        name: s.displayName || s.name || s.username || '',
        avatarUri: s.photoURL || s.avatarUri || s.profilePic || s.profilePhoto,
        profilePic: s.photoURL || s.avatarUri || s.profilePic || s.profilePhoto,
        profilePhoto: s.photoURL || s.avatarUri || s.profilePic || s.profilePhoto,
        isVerified: s.verified || false,
        followerCount: s.followerCount || 0,
        mutualFollowers: 0,
        reason: s.reason || 'popular' as const,
      }));

      // STEP 7: Update suggestion users map
      const userMap = new Map<string, SuggestionUser>();
      [...segmentedFollowers, ...segmentedSuggestions, ...fetchedContacts].forEach(u => {
        userMap.set(u.id, u);
      });
      setSuggestionUsers(userMap);

      // STEP 8: Build categories with proper headers
      const newCategories: SuggestionCategory[] = [];

      // Category 0: Contacts (High Priority)
      if (fetchedContacts.length > 0) {
        newCategories.push({
          title: 'People you may know',
          users: fetchedContacts,
        });
      }

      // Category 1: People Who Follow You
      if (segmentedFollowers.length > 0) {
        newCategories.push({
          title: 'People Who Follow You',
          users: segmentedFollowers,
        });
      }

      // Category 2: Suggested Accounts
      if (segmentedSuggestions.length > 0) {
        newCategories.push({
          title: 'Suggested Accounts',
          users: segmentedSuggestions,
        });
      }

      setCategories(newCategories);
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, isLoading, fetchGeneralSuggestions]);

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

  // Extract followers and suggestions from categories
  const followersCategory = updatedCategories.find(c => c.title === 'People Who Follow You');
  const suggestionsCategory = updatedCategories.find(c => c.title === 'Suggested Accounts');

  const contactsCategory = updatedCategories.find(c => c.title === 'People you may know');

  return {
    categories: updatedCategories,
    loading: isLoading,
    refresh,
    updateSuggestionFollowState,
    followers: followersCategory?.users || [],
    suggestions: suggestionsCategory?.users || [],
    followersCount: followersCategory?.users.length || 0,
    suggestionsCount: suggestionsCategory?.users.length || 0,
    // Expose contacts state for UI logic
    contactsPermissionGranted,
    contactsProcessed,
    contactSuggestions: contactsCategory?.users || [],
  };
}
