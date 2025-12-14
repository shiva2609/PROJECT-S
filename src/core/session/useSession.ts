/**
 * Global Session Hook
 * 
 * SINGLE SOURCE OF TRUTH for user session state.
 * 
 * This hook wraps the AuthProvider's useAuth hook and provides
 * a consistent interface for accessing the current user session.
 * 
 * All components and services should use this hook instead of:
 * - auth.currentUser (direct Firebase access)
 * - useAuth() directly (use useSession instead for consistency)
 * 
 * Benefits:
 * - Single source of truth for session state
 * - Consistent API across the app
 * - Easy to add session-related features (analytics, logging, etc.)
 * - Reliable auth state restoration on app reload
 * - Type-safe session access
 * 
 * Usage:
 *   const { user, userId, loading, isAuthenticated } = useSession();
 */

import { useAuth } from '../../providers/AuthProvider';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface UseSessionReturn {
    /**
     * The current Firebase user object (null if not authenticated)
     */
    user: FirebaseAuthTypes.User | null;

    /**
     * The current user's ID (null if not authenticated)
     * Convenience property for user?.uid
     */
    userId: string | null;

    /**
     * Whether the auth state is currently being loaded
     */
    loading: boolean;

    /**
     * Whether the auth system has been initialized
     * (first auth state check has completed)
     */
    initialized: boolean;

    /**
     * Whether a user is currently authenticated
     * Convenience property for user !== null
     */
    isAuthenticated: boolean;

    /**
     * User's role (super_admin or user)
     */
    userRole: 'super_admin' | 'user' | null;

    /**
     * Whether the role check has completed
     */
    roleChecked: boolean;

    /**
     * Whether the current user is a super admin
     */
    isSuperAdmin: boolean;
}

/**
 * Global session hook - SINGLE SOURCE OF TRUTH for user session
 * 
 * @returns Session state including user, userId, loading, and authentication status
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, userId, isAuthenticated, loading } = useSession();
 *   
 *   if (loading) return <LoadingSpinner />;
 *   if (!isAuthenticated) return <LoginPrompt />;
 *   
 *   return <div>Welcome, {user.displayName}!</div>;
 * }
 * ```
 */
export function useSession(): UseSessionReturn {
    const authContext = useAuth();

    return {
        user: authContext.user,
        userId: authContext.user?.uid || null,
        loading: authContext.loading,
        initialized: authContext.initialized,
        isAuthenticated: authContext.user !== null,
        userRole: authContext.userRole,
        roleChecked: authContext.roleChecked,
        isSuperAdmin: authContext.isSuperAdmin,
    };
}

/**
 * Type guard to check if user is authenticated
 * Useful for TypeScript type narrowing
 * 
 * @example
 * ```tsx
 * const session = useSession();
 * if (isAuthenticated(session)) {
 *   // TypeScript knows session.user is not null here
 *   console.log(session.user.uid);
 * }
 * ```
 */
export function isAuthenticated(session: UseSessionReturn): session is UseSessionReturn & { user: FirebaseAuthTypes.User; userId: string } {
    return session.isAuthenticated && session.user !== null;
}
