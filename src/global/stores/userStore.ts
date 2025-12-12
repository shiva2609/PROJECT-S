/**
 * Global User Store
 * 
 * Stores current user data globally for instant access across the app
 * Starts fetching from login
 */

import * as UserService from '../services/user/user.service';
import type { UserPublicInfo } from '../services/user/user.types';

// Simple module-level store
let currentUser: UserPublicInfo | null = null;
let loading = false;
let unsubscribe: (() => void) | null = null;
const listeners = new Set<(user: UserPublicInfo | null) => void>();

const notifyListeners = (user: UserPublicInfo | null) => {
  listeners.forEach((listener) => listener(user));
};

export const userStore = {
  getCurrentUser: (): UserPublicInfo | null => currentUser,
  getLoading: (): boolean => loading,
  setCurrentUser: (user: UserPublicInfo | null) => {
    currentUser = user;
    notifyListeners(user);
  },
  setLoading: (isLoading: boolean) => {
    loading = isLoading;
  },
  fetchCurrentUser: async (userId: string): Promise<void> => {
    if (!userId) {
      currentUser = null;
      loading = false;
      notifyListeners(null);
      return;
    }

    loading = true;
    notifyListeners(currentUser);

    // Clean up previous listener
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    // Start realtime listener
    unsubscribe = UserService.listenToUserPublicInfo(userId, (userInfo) => {
      currentUser = userInfo;
      loading = false;
      notifyListeners(userInfo);
    });
  },
  subscribe: (listener: (user: UserPublicInfo | null) => void) => {
    listeners.add(listener);
    // Immediately call with current value
    listener(currentUser);
    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  },
  cleanup: () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    currentUser = null;
    loading = false;
    listeners.clear();
  },
};

