/**
 * AuthProvider
 * 
 * Provides global authentication state to the app.
 * Uses @react-native-firebase/auth to match the auth instance used throughout the app.
 * Ensures Firebase Auth persistence is restored before components render.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../core/firebase';
import { userStore } from '../global/stores/userStore';
import type { UserPublicInfo } from '../global/services/user/user.types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  authReady: boolean;
  needsKYCVerification?: boolean;
  userRole: 'super_admin' | 'user' | null;
  roleChecked: boolean;
  isSuperAdmin: boolean;
  userProfile: UserPublicInfo | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  initialized: false,
  authReady: false,
  needsKYCVerification: false,
  userRole: null,
  roleChecked: false,
  isSuperAdmin: false,
  userProfile: null,
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
      possibleAdminIds.map(id => getDoc(doc(db, 'adminUsers', id as string)))
    );

    // Find the first existing document that matches the user's UID
    for (let i = 0; i < docSnaps.length; i++) {
      const docSnap = docSnaps[i];
      if (docSnap && docSnap.exists()) {
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [authReady, setAuthReady] = useState(false); // Native auth readiness
  const [userRole, setUserRole] = useState<'super_admin' | 'user' | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [userProfile, setUserProfile] = useState<UserPublicInfo | null>(null);

  useEffect(() => {
    // Subscribe to global user store to keep profile data in sync
    return userStore.subscribe(setUserProfile);
  }, []);

  // Track Native Authentication Readiness (Critical for Storage)
  useEffect(() => {
    // We import locally to avoid conflicts if needed, or rely on global
    const nativeAuth = require('@react-native-firebase/auth').default;
    const unsubscribe = nativeAuth().onAuthStateChanged((nativeUser: any) => {
      console.log('🔐 [Native Auth] Readiness Check:', !!nativeUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Auto-redirect to KYC verification if needed
  // Note: This requires navigation to be available, so it's best used in a component
  // that has access to navigation. For now, we'll just track the state.
  // The actual redirect should be handled in your app's navigation component.

  useEffect(() => {
    console.log('🔐 AuthContext: Setting up persistent Firebase auth state listener');

    // JS SDK onAuthStateChanged
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        console.log('✅ Auth state restored:', firebaseUser.uid);

        // Reset role check state
        setRoleChecked(false);


        // BootGate will handle fetching current user data
        // userStore.fetchCurrentUser(firebaseUser.uid) is moved there

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
      authReady, // Exposed Native Auth Readiness
      userRole,
      roleChecked,
      isSuperAdmin: userRole === 'super_admin',
      userProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
