/**
 * AuthProvider
 * 
 * Provides global authentication state to the app using ONLY @react-native-firebase/auth.
 * Exposes the current user and an authReady flag that becomes true exactly once.
 * No side effects or Firestore operations.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  authReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authReady: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!authReady) {
        setAuthReady(true);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [authReady]);

  return (
    <AuthContext.Provider value={{ user, authReady }}>
      {children}
    </AuthContext.Provider>
  );
}
