/**
 * AuthProvider
 * 
 * Provides global authentication state to the app using ONLY @react-native-firebase/auth.
 * Exposes the current user and an authReady flag that becomes true exactly once.
 * No side effects or Firestore operations.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { AppError, ErrorType } from '../utils/AppError';

export enum SessionState {
  VALID = 'VALID',
  EXPIRED = 'EXPIRED',
  INVALID = 'INVALID', // User disabled, deleted, or hard logged out
}

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  authReady: boolean;
  sessionState: SessionState;
  lastVerifiedAt: number | null;
  validateSession: () => Promise<boolean>; // Forces token refresh
  checkSession: () => void; // Throws if invalid (for pre-flight)
  resetSession: () => Promise<void>; // Hard logout
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authReady: false,
  sessionState: SessionState.INVALID,
  lastVerifiedAt: null,
  validateSession: async () => false,
  checkSession: () => { },
  resetSession: async () => { },
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.INVALID);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<number | null>(null);

  const appState = useRef(AppState.currentState);

  // 1. Core Auth Listener
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setSessionState(SessionState.VALID);
        setLastVerifiedAt(Date.now());
      } else {
        setUser(null);
        setSessionState(SessionState.INVALID);
        setLastVerifiedAt(null);
      }

      if (!authReady) {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, [authReady]);

  // 2. Validate Session (Force Token Refresh)
  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!auth().currentUser) {
      setSessionState(SessionState.INVALID);
      return false;
    }

    try {
      // Force refresh of ID token
      await auth().currentUser?.getIdToken(true);
      setSessionState(SessionState.VALID);
      setLastVerifiedAt(Date.now());
      return true;
    } catch (error: any) {
      console.error('Session validation failed:', error);
      // Determine if it's a soft expiry or hard invalidation
      if (error.code === 'auth/user-disabled' || error.code === 'auth/user-not-found') {
        setSessionState(SessionState.INVALID);
      } else if (error.code === 'auth/network-request-failed') {
        // Network error shouldn't invalidate session immediately, keep current state but don't update time
      } else {
        setSessionState(SessionState.EXPIRED);
      }
      return false;
    }
  }, []);

  // 3. Check Session (Pre-flight Guard)
  const checkSession = useCallback(() => {
    if (!authReady) {
      // If auth isn't ready, we can't be sure. 
      // Safe default: Throw error to prevent write.
      throw new AppError('Authentication not initializing.', ErrorType.UNKNOWN);
    }

    if (!user) {
      throw new AppError('You must be signed in.', ErrorType.AUTH, { action: 'LOGIN' });
    }

    if (sessionState === SessionState.EXPIRED) {
      throw new AppError('Session expired. Please sign in again.', ErrorType.SESSION, { action: 'LOGIN' });
    }

    if (sessionState === SessionState.INVALID) {
      throw new AppError('Session invalid. Please sign in again.', ErrorType.AUTH, { action: 'LOGIN' });
    }
  }, [user, sessionState, authReady]);

  // 4. Hard Reset (Logout & Purge)
  const resetSession = useCallback(async () => {
    try {
      await auth().signOut();
      setUser(null);
      setSessionState(SessionState.INVALID);
      // Navigation reset should be handled by the consumer of this context or root navigator listening to 'user'
    } catch (error) {
      console.error('Error signing out:', error);
      // Force local state clear anyway
      setUser(null);
      setSessionState(SessionState.INVALID);
    }
  }, []);

  // 5. AppState Listener for Foreground Re-validation
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        if (user) {
          console.log('🔄 [AuthProvider] App foregrounded. Validating session...');
          await validateSession();
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, validateSession]);

  // 6. Proactive Traveller Card Creation (Phase 1 - Identity Infrastructure)
  // Ensures every authenticated user has a Traveller Card, regardless of navigation
  useEffect(() => {
    let isMounted = true;

    async function ensureCardForUser() {
      if (!authReady || !user) {
        return;
      }

      try {
        // Import dynamically to avoid circular dependencies
        const { ensureTravelerCardExists } = await import('../global/services/travelerCard/travelerCard.service');

        console.log('[AuthProvider] 🎫 Ensuring Traveller Card exists for user:', user.uid);
        await ensureTravelerCardExists(user.uid);
        console.log('[AuthProvider] ✅ Traveller Card check complete');
      } catch (error) {
        // Non-blocking error - card creation will be retried on screen mount if needed
        console.warn('[AuthProvider] ⚠️ Traveller Card creation failed (non-blocking):', error);
      }
    }

    // Run once per session when auth becomes ready
    if (authReady && user) {
      ensureCardForUser();
    }

    return () => {
      isMounted = false;
    };
  }, [authReady, user?.uid]); // Only re-run if authReady or user.uid changes


  return (
    <AuthContext.Provider value={{
      user,
      authReady,
      sessionState,
      lastVerifiedAt,
      validateSession,
      checkSession,
      resetSession
    }}>
      {children}
    </AuthContext.Provider>
  );
}
