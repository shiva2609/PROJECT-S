import React, { createContext, useContext, ReactNode } from 'react';
import * as UsersAPI from '../services/users/usersService';

import { userStore } from '../global/stores/userStore';

interface UserContextType {
  currentUser: UsersAPI.User | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

/**
 * Global context provider for current user data
 * Extends AuthContext with user profile information
 */
export function UserProvider({ children }: UserProviderProps) {
  // Subscribe to userStore (which is populated by BootGate)
  const [currentUser, setCurrentUser] = React.useState<UsersAPI.User | null>(
    userStore.getCurrentUser() as UsersAPI.User | null
  );
  const [isLoading, setIsLoading] = React.useState(userStore.getLoading());

  React.useEffect(() => {
    // Sync with global store
    // This allows BootGate to drive the fetching and we just reflect the state
    return userStore.subscribe((user) => {
      setCurrentUser(user as UsersAPI.User | null);
      setIsLoading(userStore.getLoading());
    });
  }, []);

  const value: UserContextType = {
    currentUser,
    isLoading,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}

