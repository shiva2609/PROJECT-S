/**
 * Authentication Utility
 * 
 * Provides centralized authentication checks for Firebase operations.
 * Ensures all write operations require user authentication.
 * Waits for Firebase Auth initialization to prevent false negatives.
 */

import { Alert } from 'react-native';
import { auth } from '../services/auth/authService';
import { onAuthStateChanged } from '../core/firebase/compat';

/**
 * Wait for Firebase Auth to initialize
 * Returns a promise that resolves when auth state is ready
 */
function waitForAuthInitialization(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('⏳ Waiting for auth initialization...');

    // If auth is already initialized and user exists, resolve immediately
    if (auth.currentUser) {
      console.log('✅ Auth already initialized with user:', auth.currentUser.uid);
      resolve(true);
      return;
    }

    // Check if auth state listener will fire immediately
    let resolved = false;
    let timeoutId: NodeJS.Timeout;

    // Wait for auth state to be determined (even if null)
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          unsubscribe();
          console.log('✅ Auth state initialized:', user ? `User ${user.uid}` : 'No user');
          resolve(true);
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          unsubscribe();
          console.error('❌ Auth state error during initialization:', error);
          resolve(true); // Resolve anyway to continue
        }
      }
    );

    // Timeout after 3 seconds if auth doesn't initialize
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        console.warn('⚠️ Auth initialization timeout - proceeding anyway');
        resolve(true); // Resolve anyway to prevent hanging
      }
    }, 3000);
  });
}

/**
 * Checks if user is authenticated (after waiting for auth initialization)
 * @returns Promise<boolean> - true if authenticated, false otherwise
 */
export async function isAuthenticatedAsync(): Promise<boolean> {
  await waitForAuthInitialization();
  return auth.currentUser !== null;
}

/**
 * Checks if user is authenticated (synchronous check)
 * Use this only if you're certain auth has initialized
 * @returns true if authenticated, false otherwise
 */
export function isAuthenticated(): boolean {
  return auth.currentUser !== null;
}

/**
 * Gets current user ID
 * @returns user ID or null if not authenticated
 */
export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null;
}

/**
 * Requires authentication for an operation
 * Uses AuthContext user (from @react-native-firebase/auth) as primary source,
 * falls back to web SDK auth if needed
 * @param action - Name of the action (e.g., "create a post", "submit KYC")
 * @param contextUser - User from AuthContext (should be provided from useAuth hook)
 * @returns Promise<boolean> - true if authenticated, false otherwise
 */
export async function requireAuth(action: string, contextUser?: any): Promise<boolean> {
  // If contextUser is provided (from AuthContext), use it as primary source
  // This is more reliable since AuthContext uses @react-native-firebase/auth
  if (contextUser && contextUser.uid) {
    console.log('✅ User verified from AuthContext:', contextUser.uid);
    return true;
  }

  // Fallback: Wait for auth to initialize and check web SDK
  await waitForAuthInitialization();

  // Small delay to ensure auth state is stable
  await new Promise(resolve => setTimeout(resolve, 200));

  const user = auth.currentUser;

  console.log('🔑 Current User (web SDK):', user?.uid || 'None');
  console.log('🔑 Auth state check - User exists:', !!user);
  console.log('🔑 Context User exists:', contextUser !== null && contextUser !== undefined);

  if (!user) {
    console.error('❌ Auth check failed - No user found');
    console.error('   - auth.currentUser:', auth.currentUser);
    console.error('   - contextUser:', contextUser);
    Alert.alert(
      'Login Required',
      `You must be logged in to ${action}. Please sign in and try again.`,
      [{ text: 'OK' }]
    );
    return false;
  }

  console.log('✅ User verified:', user.uid);
  return true;
}

/**
 * Wrapper for async operations that require authentication
 * @param operation - Async function to execute
 * @param actionName - Name of the action for error messages
 * @returns Promise with result or throws error if not authenticated
 */
export async function withAuth<T>(
  operation: () => Promise<T>,
  actionName: string = 'perform this action'
): Promise<T> {
  const authenticated = await isAuthenticatedAsync();
  if (!authenticated) {
    const error = new Error(`You must be logged in to ${actionName}.`);
    Alert.alert(
      'Authentication Required',
      `You must be logged in to ${actionName}.`,
      [{ text: 'OK' }]
    );
    throw error;
  }
  return operation();
}

