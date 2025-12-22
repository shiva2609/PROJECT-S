/**
 * PERMISSION-MEDIA BRIDGING LAYER
 * 
 * 🔐 HARD INVARIANTS:
 * 1. Permission dialog appears only until permission is granted
 * 2. After permission granted once, NEVER re-ask on reload
 * 3. Empty gallery ≠ permission denied
 * 4. Media must render every time permission is granted
 * 
 * This module provides UX-level permission memory to prevent:
 * - Re-asking permission after grant
 * - Treating empty gallery as permission denial
 * - Permission loops on app reload
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MEDIA_PERMISSION_KEY = 'MEDIA_PERMISSION_GRANTED_V1';

/**
 * Mark that media permission has been successfully granted AND media was accessible
 * 
 * 🔐 CRITICAL: Only call this AFTER successful media access, not just permission grant
 * 
 * @example
 * ```typescript
 * const assets = await CameraRoll.getPhotos(...);
 * if (assets.length > 0) {
 *   await markMediaPermissionGranted(); // Only if media actually loaded
 * }
 * ```
 */
export async function markMediaPermissionGranted(): Promise<void> {
    try {
        await AsyncStorage.setItem(MEDIA_PERMISSION_KEY, 'true');
        if (__DEV__) {
            console.log('[PermissionMemory] ✅ Media permission marked as granted');
        }
    } catch (error) {
        console.error('[PermissionMemory] Error marking permission granted:', error);
    }
}

/**
 * Check if media permission has been granted before
 * 
 * This is UX-level memory, not OS-level permission check.
 * Used to prevent re-asking permission on every reload.
 * 
 * @returns true if permission was granted and media was accessible before
 */
export async function hasMediaPermissionBeenGranted(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(MEDIA_PERMISSION_KEY);
        const hasGrant = value === 'true';

        if (__DEV__) {
            console.log('[PermissionMemory] Has previous grant:', hasGrant);
        }

        return hasGrant;
    } catch (error) {
        console.error('[PermissionMemory] Error checking permission memory:', error);
        return false;
    }
}

/**
 * Clear permission memory
 * 
 * 🔐 ONLY call this when:
 * - User logs out
 * - User manually revokes permission via Settings (future)
 * 
 * ❌ DO NOT call on:
 * - App reload
 * - App background
 * - Screen unmount
 */
export async function clearMediaPermissionMemory(): Promise<void> {
    try {
        await AsyncStorage.removeItem(MEDIA_PERMISSION_KEY);
        if (__DEV__) {
            console.log('[PermissionMemory] 🗑️ Media permission memory cleared');
        }
    } catch (error) {
        console.error('[PermissionMemory] Error clearing permission memory:', error);
    }
}
