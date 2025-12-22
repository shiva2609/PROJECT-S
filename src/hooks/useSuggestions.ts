import { useCallback, useState, useEffect, useMemo } from 'react';
import { useUserRelations } from '../providers/UserRelationProvider';
import { useAuth } from '../providers/AuthProvider';
import * as UserService from '../global/services/user/user.service';
import * as FollowService from '../global/services/follow/follow.service';
import * as UsersAPI from '../services/users/usersService';
import { segmentFollowersAndSuggestions } from '../global/services/follow/follow.segmentation';
import { withTimeout } from '../utils/AppError';
import { useSuggestionsStore, SuggestionUser, SuggestionCategory } from '../store/stores/useSuggestionsStore';
export type { SuggestionUser, SuggestionCategory };

interface UseSuggestionsReturn {
  categories: SuggestionCategory[];
  loading: boolean;
  refresh: (force?: boolean) => Promise<void>;
  updateSuggestionFollowState: (userId: string, isFollowing: boolean) => void;
  followers: SuggestionUser[];
  suggestions: SuggestionUser[];
  followersCount: number;
  suggestionsCount: number;
  contactsPermissionGranted: boolean;
  contactsProcessed: boolean;
  contactSuggestions: SuggestionUser[];
}

export function useSuggestions(): UseSuggestionsReturn {
  const { user } = useAuth();
  const { following } = useUserRelations();
  const {
    categories,
    suggestionUsers,
    isLoading,
    lastFetched,
    setCategories,
    setSuggestionUsers,
    setIsLoading,
    updateLocalFollow
  } = useSuggestionsStore();

  const [contactsPermissionGranted, setContactsPermissionGranted] = useState(false);
  const [contactsProcessed, setContactsProcessed] = useState(false);
  const [contactSuggestions, setContactSuggestionsState] = useState<SuggestionUser[]>([]);

  const updateSuggestionFollowState = useCallback((userId: string, isFollowing: boolean) => {
    updateLocalFollow(userId, isFollowing);
  }, [updateLocalFollow]);

  const fetchGeneralSuggestions = useCallback(async (currentUserId: string): Promise<SuggestionUser[]> => {
    try {
      const suggestedUsers = await withTimeout(UsersAPI.getSuggested(currentUserId, {
        excludeFollowing: Array.from(following),
        limit: 30,
      }), 7000).catch(() => []);

      if (suggestedUsers.length === 0) return [];

      const userIds = suggestedUsers.map(u => u.id).filter(Boolean);
      const userInfos = await withTimeout(UserService.getUsersPublicInfo(userIds), 7000).catch(() => []);

      const followerCountMap = new Map<string, number>();
      suggestedUsers.forEach(u => {
        if (u.followersCount) followerCountMap.set(u.id, u.followersCount);
      });

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

  const refresh = useCallback(async (force = false): Promise<void> => {
    if (!user?.uid || isLoading) return;

    // Use cached data if fresh (5 mins) and not forced
    const fiveMinutes = 5 * 60 * 1000;
    if (!force && categories.length > 0 && (Date.now() - lastFetched < fiveMinutes)) {
      console.log('📦 [useSuggestions] Using cached suggestions');
      return;
    }

    setIsLoading(true);
    console.log('🔄 [useSuggestions] Starting refresh for:', user.uid);
    let fetchedContacts: SuggestionUser[] = [];

    const safetyTimeoutId = setTimeout(() => {
      console.warn('⚠️ [useSuggestions] Refresh safety timeout triggered!');
      setIsLoading(false);
    }, 20000);

    try {
      try {
        await withTimeout((async () => {
          const contactsService = await import('../services/contacts/contactsService');
          const hasPermission = await contactsService.checkContactsPermission();
          setContactsPermissionGranted(hasPermission);

          const hasUploaded = await contactsService.hasUploadedContacts(user?.uid || '');
          setContactsProcessed(hasUploaded);

          if (hasPermission && hasUploaded) {
            const fIds = await withTimeout(FollowService.getFollowingIds(user?.uid || ''), 5000).catch(() => []);
            const matches = await contactsService.findContactMatches(user?.uid || '', fIds);

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
          }
        })(), 12000);
        setContactSuggestionsState(fetchedContacts);
      } catch (err) {
        console.warn('⚠️ Error fetching contact suggestions or timeout:', err);
      }

      // STEP 1: Fetch raw data in parallel with timeouts
      const [followerIds, generalSuggestions] = await Promise.all([
        withTimeout(FollowService.getFollowersIds(user.uid), 8000).catch(() => []),
        withTimeout(fetchGeneralSuggestions(user.uid), 8000).catch(() => []),
      ]);
      console.log(`📊 [useSuggestions] Raw data fetched - Followers: ${followerIds.length}, Suggested: ${generalSuggestions.length}`);

      const followingIds = await withTimeout(FollowService.getFollowingIds(user.uid), 5000).catch(() => []);
      const followerUserInfos = followerIds.length > 0
        ? await withTimeout(UserService.getUsersPublicInfo(followerIds.slice(0, 50)), 5000).catch(() => [])
        : [];

      const followersAsUsers = followerUserInfos.map(userInfo => ({ ...userInfo, uid: userInfo.uid }));
      const suggestedAsUsers = generalSuggestions.map(s => ({ ...s, uid: s.id }));

      const { followersSection, suggestedSection } = segmentFollowersAndSuggestions({
        followers: followersAsUsers,
        followingIds,
        suggestedUsers: suggestedAsUsers,
        loggedUserId: user.uid,
      });

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
        reason: 'mutual',
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
        reason: s.reason || 'popular',
      }));

      const userMap = new Map<string, SuggestionUser>();
      [...segmentedFollowers, ...segmentedSuggestions, ...fetchedContacts].forEach(u => userMap.set(u.id, u));
      setSuggestionUsers(userMap);

      let newCategories: SuggestionCategory[] = [];
      if (fetchedContacts.length > 0) newCategories.push({ title: 'Contacts You May Know', users: fetchedContacts });
      if (segmentedFollowers.length > 0) newCategories.push({ title: 'People Who Follow You', users: segmentedFollowers });
      if (segmentedSuggestions.length > 0) newCategories.push({ title: 'People You Might Know', users: segmentedSuggestions });

      if (newCategories.length === 0) {
        console.log('🔄 All suggestions empty, fetching popular fallback...');
        const popularUsers = await withTimeout(UsersAPI.getSuggested(user.uid, {
          limit: 10,
          excludeFollowing: Array.from(following)
        }), 5000).catch(() => []);
        if (popularUsers.length > 0) {
          const transformed = popularUsers.map(u => ({
            id: u.id,
            username: u.username || '',
            displayName: u.name || u.username || '',
            name: u.name || u.username || '',
            avatarUri: u.photoUrl,
            profilePic: u.photoUrl,
            profilePhoto: u.photoUrl,
            isVerified: u.verified || false,
            followerCount: u.followersCount || 0,
            mutualFollowers: 0,
            reason: 'popular' as const,
          }));
          transformed.forEach(u => userMap.set(u.id, u));
          setSuggestionUsers(new Map(userMap));
          newCategories.push({ title: 'People You Might Know', users: transformed });
        }
      }

      setCategories(newCategories);
      console.log('✅ [useSuggestions] Refresh completed successfully');
    } catch (error) {
      console.error('❌ [useSuggestions] Error refreshing suggestions:', error);
    } finally {
      clearTimeout(safetyTimeoutId);
      setIsLoading(false);
    }
  }, [user?.uid, fetchGeneralSuggestions, setIsLoading, setCategories, setSuggestionUsers, updateLocalFollow]); // Removed categories.length and lastFetched

  useEffect(() => {
    if (user?.uid) {
      refresh(false);
    }
  }, [user?.uid, refresh]);

  const updatedCategories = useMemo(() => {
    // Audit: Centralized filtering happens here before rendering
    // Rule: Suggestions = ALL_USERS − FOLLOWING − SELF
    return categories.map(category => ({
      ...category,
      users: category.users
        .map(u => {
          const updated = suggestionUsers.get(u.id);
          return updated ? { ...u, ...updated } : u;
        })
        .filter(u => {
          const isFollowed = following.has(u.id);
          const isSelf = u.id === user?.uid;

          if (__DEV__ && (isFollowed || isSelf)) {
            console.log(`[useSuggestions] Filtering out user ${u.username} (${u.id}) - Followed: ${isFollowed}, Self: ${isSelf}`);
          }

          return !isFollowed && !isSelf;
        }),
    }))
      .filter(category => category.users.length > 0); // Remove empty categories after filtering
  }, [categories, suggestionUsers, following, user?.uid]);

  const followersCategory = updatedCategories.find(c => c.title === 'People Who Follow You');
  // Handle both "People You Might Know" and "Suggested Accounts" for compatibility
  const suggestionsCategory = updatedCategories.find(c => c.title === 'People You Might Know' || c.title === 'Suggested Accounts');
  const contactsCategory = updatedCategories.find(c => c.title === 'Contacts You May Know');

  return {
    categories: updatedCategories,
    loading: isLoading,
    refresh,
    updateSuggestionFollowState,
    followers: followersCategory?.users || [],
    suggestions: suggestionsCategory?.users || [],
    followersCount: followersCategory?.users.length || 0,
    suggestionsCount: suggestionsCategory?.users.length || 0,
    contactsPermissionGranted,
    contactsProcessed,
    contactSuggestions: contactsCategory?.users || [],
  };
}
