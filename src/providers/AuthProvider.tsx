/**
 * AuthProvider
 * 
 * Provides global authentication state to the app.
 * Uses @react-native-firebase/auth to match the auth instance used throughout the app.
 * Ensures Firebase Auth persistence is restored before components render.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/auth/authService';
import { userStore } from '../global/stores/userStore';

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  initialized: boolean;
  needsKYCVerification?: boolean;
  userRole: 'super_admin' | 'user' | null;
  roleChecked: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialized: false,
  needsKYCVerification: false,
  userRole: null,
  roleChecked: false,
  isSuperAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Check if a user is a super admin by checking the adminUsers collection
 * Tries multiple possible document IDs (UID, username, email prefix)
 */
const checkIfSuperAdmin = async (uid: string, email?: string | null): Promise<boolean> => {
  try {
    // Try multiple possible adminUsers document IDs
    const possibleAdminIds = [
      uid, // Try UID first (most reliable)
      email?.toLowerCase().split('@')[0], // Email prefix (if email exists)
      'sanchariadmin', // Default admin username (fallback)
    ].filter(Boolean); // Remove undefined/null values
    
    // Check all possible document IDs in parallel
    const docSnaps = await Promise.all(
      possibleAdminIds.map(id => getDoc(doc(db, 'adminUsers', id)))
    );
    
    // Find the first existing document that matches the user's UID
    for (let i = 0; i < docSnaps.length; i++) {
      const docSnap = docSnaps[i];
      if (docSnap.exists()) {
        const data = docSnap.data();
        // STRICT CHECK: UID must match OR document ID is UID and role is superAdmin
        // This prevents false positives from generic admin documents
        const docId = possibleAdminIds[i];
        const uidMatches = data?.uid === uid;
        const isUidDoc = docId === uid && data?.role === 'superAdmin';
        
        if (uidMatches || isUidDoc) {
          console.log('✅ Super admin found in adminUsers collection', {
            docId,
            uid,
            dataUid: data?.uid,
            role: data?.role,
          });
          return true;
        } else {
          console.log('⚠️ Admin document found but UID mismatch', {
            docId,
            uid,
            dataUid: data?.uid,
            role: data?.role,
          });
        }
      }
    }
    
    console.log('❌ User is not a super admin', { uid, email });
    return false;
  } catch (error) {
    console.error('❌ Error checking super admin status:', error);
    return false;
  }
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [userRole, setUserRole] = useState<'super_admin' | 'user' | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  
  // Auto-redirect to KYC verification if needed
  // Note: This requires navigation to be available, so it's best used in a component
  // that has access to navigation. For now, we'll just track the state.
  // The actual redirect should be handled in your app's navigation component.

  useEffect(() => {
    console.log('🔐 AuthContext: Setting up persistent Firebase auth state listener');
    
    // @react-native-firebase/auth automatically handles persistence
    // onAuthStateChanged fires immediately with current user if logged in
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ Auth state restored:', firebaseUser.uid);
        
        // Reset role check state
        setRoleChecked(false);
        
        // Start fetching current user data (profile data retrieval)
        userStore.fetchCurrentUser(firebaseUser.uid).catch((error) => {
          console.error('[AuthProvider] Error fetching current user data:', error);
        });
        
        // Check if user is super admin (try multiple document ID formats)
        try {
          const isSuperAdmin = await checkIfSuperAdmin(firebaseUser.uid, firebaseUser.email);
          setUserRole(isSuperAdmin ? 'super_admin' : 'user');
          console.log('🔐 User role determined:', isSuperAdmin ? 'super_admin' : 'user', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
          });
        } catch (error) {
          console.error('❌ Error checking super admin status:', error);
          // Default to regular user if check fails
          setUserRole('user');
        } finally {
          setRoleChecked(true);
        }
      } else {
        console.log('✅ Auth state restored: none');
        setUserRole(null);
        setRoleChecked(true);
        // Clear user data when logged out
        userStore.cleanup();
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

  const isSuperAdmin = userRole === 'super_admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      initialized, 
      userRole, 
      roleChecked,
      isSuperAdmin 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

