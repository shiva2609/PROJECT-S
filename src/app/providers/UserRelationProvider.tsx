import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import * as UsersAPI from '../../services/users/usersService';
import { retryWithBackoff } from '../../utils/retry';
import { validateUserId } from '../../utils/safeFirestore';

interface UserRelationContextType {
  following: Set<string>;
  followers: Set<string>;
  setFollowing: (list: string[]) => void;
  setFollowers: (list: string[]) => void;
  addFollowing: (userId: string) => void;
  removeFollowing: (userId: string) => void;
  addFollower: (userId: string) => void;
  removeFollower: (userId: string) => void;
  refreshRelations: (userId: string) => Promise<void>;
  isLoading: boolean;
}

const UserRelationContext = createContext<UserRelationContextType | undefined>(undefined);

interface UserRelationProviderProps {
  children: ReactNode;
}

/**
 * Global context provider for user relations (followers/following)
 * Fetches and maintains current user's followers and following lists
 * Updates reflect instantly across PostCard, FollowButton, Profile, Search, Explore
 */
export function UserRelationProvider({ children }: UserRelationProviderProps) {
  const { user } = useAuth();
  const [following, setFollowingState] = useState<Set<string>>(new Set());
  const [followers, setFollowersState] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const setFollowing = useCallback((list: string[]): void => {
    setFollowingState(new Set(list));
  }, []);

  const setFollowers = useCallback((list: string[]): void => {
    setFollowersState(new Set(list));
  }, []);

  const addFollowing = useCallback((userId: string): void => {
    setFollowingState(prev => new Set([...prev, userId]));
  }, []);

  const removeFollowing = useCallback((userId: string): void => {
    setFollowingState(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, []);

  const addFollower = useCallback((userId: string): void => {
    setFollowersState(prev => new Set([...prev, userId]));
  }, []);

  const removeFollower = useCallback((userId: string): void => {
    setFollowersState(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, []);

  const refreshRelations = useCallback(async (userId: string): Promise<void> => {
    // CRITICAL: Validate userId before any operations
    if (!validateUserId(userId)) {
      console.warn('[UserRelationProvider] refreshRelations: Invalid userId');
      setFollowers([]);
      setFollowing([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const [followersResult, followingResult] = await Promise.all([
        retryWithBackoff(() => UsersAPI.getFollowers(userId), {
          maxRetries: 3,
          retryableErrors: ['unavailable', 'deadline-exceeded', 'network-error', 'get-followers-failed'],
        }).catch((err) => {
          console.warn('[UserRelationProvider] getFollowers failed, returning empty:', err);
          return { users: [], nextCursor: undefined };
        }),
        retryWithBackoff(() => UsersAPI.getFollowing(userId), {
          maxRetries: 3,
          retryableErrors: ['unavailable', 'deadline-exceeded', 'network-error', 'get-following-failed'],
        }).catch((err) => {
          console.warn('[UserRelationProvider] getFollowing failed, returning empty:', err);
          return { users: [], nextCursor: undefined };
        }),
      ]);

      setFollowers(followersResult.users.map(u => u.id).filter(id => id && id.trim().length > 0));
      setFollowing(followingResult.users.map(u => u.id).filter(id => id && id.trim().length > 0));
    } catch (error) {
      console.error('Error refreshing relations:', error);
      // Don't throw - set empty arrays instead to prevent crashes
      setFollowers([]);
      setFollowing([]);
    } finally {
      setIsLoading(false);
    }
  }, [setFollowers, setFollowing]);

  // Fetch relations on app load when user is authenticated
  useEffect(() => {
    if (user?.uid && validateUserId(user.uid)) {
      refreshRelations(user.uid).catch(error => {
        console.error('Failed to load user relations on mount:', error);
        // Set empty arrays on error to prevent crashes
        setFollowing([]);
        setFollowers([]);
      });
    } else {
      // Clear relations on logout
      setFollowing([]);
      setFollowers([]);
    }
  }, [user?.uid, refreshRelations]);

  const value: UserRelationContextType = {
    following,
    followers,
    setFollowing,
    setFollowers,
    addFollowing,
    removeFollowing,
    addFollower,
    removeFollower,
    refreshRelations,
    isLoading,
  };

  return (
    <UserRelationContext.Provider value={value}>
      {children}
    </UserRelationContext.Provider>
  );
}

/**
 * Hook to access user relations context
 * @throws Error if used outside UserRelationProvider
 */
export function useUserRelations(): UserRelationContextType {
  const context = useContext(UserRelationContext);
  if (context === undefined) {
    throw new Error('useUserRelations must be used within a UserRelationProvider');
  }
  return context;
}

