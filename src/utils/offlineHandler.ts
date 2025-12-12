/**
 * Global Offline Handler Utility
 * 
 * Provides utilities for detecting and handling Firestore offline errors
 */

export interface OfflineError {
  code: string;
  message?: string;
  offline: boolean;
}

/**
 * Check if an error is an offline/unavailable error
 */
export function isOfflineError(error: any): boolean {
  if (!error) return false;
  
  const code = error?.code || '';
  const message = error?.message || '';
  
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'network-error' ||
    message.toLowerCase().includes('offline') ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('connection')
  );
}

/**
 * Wrap a Firestore operation with offline handling
 * Returns { offline: true } if offline, otherwise throws or returns result
 */
export async function withOfflineHandler<T>(
  operation: () => Promise<T>,
  fallback?: () => T
): Promise<T | { offline: true }> {
  try {
    return await operation();
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn('⚠️ Firestore operation failed due to offline state');
      if (fallback) {
        return fallback();
      }
      return { offline: true } as any;
    }
    throw error;
  }
}

/**
 * Safe Firestore read wrapper
 * Returns empty array/object if offline
 */
export async function safeFirestoreRead<T>(
  operation: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn('⚠️ Firestore read failed due to offline state, returning default value');
      return defaultValue;
    }
    throw error;
  }
}

