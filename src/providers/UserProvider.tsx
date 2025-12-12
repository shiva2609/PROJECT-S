import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import * as UsersAPI from '../services/users/usersService';

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
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = React.useState<UsersAPI.User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user?.uid) {
      UsersAPI.getUserById(user.uid)
        .then((userData) => {
          setCurrentUser(userData || null);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching user data:', error);
          setIsLoading(false);
        });
    } else {
      setCurrentUser(null);
      setIsLoading(false);
    }
  }, [user?.uid]);

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

