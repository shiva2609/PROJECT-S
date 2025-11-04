/**
 * AuthContext
 * 
 * Provides global authentication state to the app.
 * Uses @react-native-firebase/auth to match the auth instance used throughout the app.
 * Ensures Firebase Auth persistence is restored before components render.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialized: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log('🔐 AuthContext: Setting up persistent Firebase auth state listener');
    
    // @react-native-firebase/auth automatically handles persistence
    // onAuthStateChanged fires immediately with current user if logged in
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ Auth state restored:', firebaseUser.uid);
      } else {
        console.log('✅ Auth state restored: none');
      }
      console.log('🔄 Auth state changed:', firebaseUser?.uid || 'none');
      setUser(firebaseUser);
      setInitialized(true);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => {
      console.log('🔐 AuthContext: Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  // Only render children when auth is initialized
  if (!initialized || loading) {
    return null; // Will be handled by AppNavigator loading screen
  }

  return (
    <AuthContext.Provider value={{ user, loading, initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

