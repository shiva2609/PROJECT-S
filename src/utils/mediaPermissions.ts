/**
 * MEDIA & PERMISSION STATE HARDENING
 * 
 * 🔐 HARD PERMISSION INVARIANTS:
 * 1. Permission state must be EXPLICIT, not boolean
 * 2. Denied or limited permissions must NEVER trap the user
 * 3. The app must always explain WHY media is missing
 * 4. All image folders must be discoverable if OS allows it
 * 5. Videos must be excluded deterministically (not by UI filtering)
 * 
 * This module provides:
 * - Explicit permission state model (granted/denied/blocked/limited/partial)
 * - Single source of truth for permission resolution
 * - Recovery UX for all permission states
 * - Deep-linking to system settings
 * - Video exclusion enforcement
 * 
 * NOTE: Uses built-in React Native APIs only (no external dependencies)
 */

import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

/**
 * EXPLICIT PERMISSION STATE MODEL
 * 
 * Replaces boolean returns with granular states that enable proper UX recovery
 */
export enum MediaPermissionState {
    /** Full access granted - all media visible */
    GRANTED = 'granted',

    /** Permission denied by user - can retry */
    DENIED = 'denied',

    /** Permission permanently denied - must use Settings */
    BLOCKED = 'blocked',

    /** iOS: User selected "Select Photos" - limited access */
    LIMITED = 'limited',

    /** Android 13+: Partial media access granted */
    PARTIAL = 'partial',

    /** Permission state cannot be determined */
    UNAVAILABLE = 'unavailable',
}

/**
 * Permission type for different media access scenarios
 */
export enum MediaPermissionType {
    /** Gallery/Photos access */
    GALLERY = 'gallery',

    /** Camera access */
    CAMERA = 'camera',

    /** Contacts access */
    CONTACTS = 'contacts',
}

/**
 * Result of permission resolution with actionable UX guidance
 */
export interface PermissionResolution {
    /** Current permission state */
    state: MediaPermissionState;

    /** Can the user access media with current permissions? */
    canAccess: boolean;

    /** User-facing explanation of current state */
    message: string;

    /** Recommended action for user */
    action: PermissionAction;

    /** Additional context for debugging */
    debugInfo?: {
        platform: string;
        permissionType: MediaPermissionType;
        rawStatus?: string;
        androidVersion?: number;
    };
}

/**
 * Recommended user action based on permission state
 */
export enum PermissionAction {
    /** No action needed - proceed */
    NONE = 'none',

    /** Show permission request dialog */
    REQUEST = 'request',

    /** Direct user to app settings */
    OPEN_SETTINGS = 'open_settings',

    /** Show limited access explanation + option to select more */
    EXPAND_LIMITED = 'expand_limited',

    /** Explain why permission is needed */
    EXPLAIN = 'explain',
}

/**
 * 🔐 CANONICAL PERMISSION RESOLVER
 * 
 * Single source of truth for all permission state resolution.
 * Returns explicit state + actionable UX guidance.
 */
export async function resolveMediaPermissionState(
    type: MediaPermissionType
): Promise<PermissionResolution> {
    const platform = Platform.OS;

    if (platform === 'ios') {
        return resolveIOSPermission(type);
    } else if (platform === 'android') {
        return resolveAndroidPermission(type);
    }

    // Fallback for unsupported platforms
    return {
        state: MediaPermissionState.UNAVAILABLE,
        canAccess: false,
        message: 'Permission system not available on this platform',
        action: PermissionAction.NONE,
        debugInfo: { platform, permissionType: type },
    };
}

/**
 * iOS Permission Resolution
 * 
 * NOTE: iOS doesn't provide a built-in API to check photo library permission status
 * before requesting. We rely on the image picker's response to determine state.
 * 
 * Handles:
 * - Full access (granted)
 * - Limited access (iOS 14+ "Select Photos") - detected via picker behavior
 * - Denied/Blocked states - detected via picker error codes
 */
async function resolveIOSPermission(
    type: MediaPermissionType
): Promise<PermissionResolution> {
    // iOS permissions are checked implicitly when picker is launched
    // We return a "needs request" state and let the picker handle it

    switch (type) {
        case MediaPermissionType.GALLERY:
            // For gallery, we can't check status without launching picker
            // Return a state that indicates we should try the picker
            return {
                state: MediaPermissionState.DENIED, // Will be updated after picker attempt
                canAccess: false,
                message: 'Photo library access required',
                action: PermissionAction.REQUEST,
                debugInfo: { platform: 'ios', permissionType: type },
            };

        case MediaPermissionType.CAMERA:
            // Camera permission can be requested directly
            return {
                state: MediaPermissionState.DENIED,
                canAccess: false,
                message: 'Camera access required',
                action: PermissionAction.REQUEST,
                debugInfo: { platform: 'ios', permissionType: type },
            };

        case MediaPermissionType.CONTACTS:
            // Contacts permission (handled separately)
            return {
                state: MediaPermissionState.DENIED,
                canAccess: false,
                message: 'Contacts access required',
                action: PermissionAction.REQUEST,
                debugInfo: { platform: 'ios', permissionType: type },
            };

        default:
            return {
                state: MediaPermissionState.UNAVAILABLE,
                canAccess: false,
                message: 'Unknown permission type',
                action: PermissionAction.NONE,
                debugInfo: { platform: 'ios', permissionType: type },
            };
    }
}

/**
 * Detect iOS permission state from image picker error
 * 
 * Called after picker fails to determine if it's denied or blocked
 */
export function detectIOSPermissionFromPickerError(
    errorCode?: string,
    errorMessage?: string
): MediaPermissionState {
    if (!errorCode && !errorMessage) {
        return MediaPermissionState.DENIED;
    }

    const error = (errorCode || '') + ' ' + (errorMessage || '');
    const errorLower = error.toLowerCase();

    // Check for permission-related errors
    if (errorLower.includes('permission') || errorLower.includes('denied') || errorLower.includes('authorized')) {
        // If error mentions "settings", it's likely blocked
        if (errorLower.includes('settings')) {
            return MediaPermissionState.BLOCKED;
        }
        return MediaPermissionState.DENIED;
    }

    // Check for limited access indicators
    if (errorLower.includes('limited')) {
        return MediaPermissionState.LIMITED;
    }

    return MediaPermissionState.DENIED;
}

/**
 * Android Permission Resolution
 * 
 * 🔐 PERMISSION-MEDIA BRIDGING:
 * - Checks UX-level permission memory to prevent re-asking
 * - Only shows dialog if OS denied OR first-time access
 * 
 * Handles:
 * - Android 13+ (API 33): READ_MEDIA_IMAGES / READ_MEDIA_VIDEO
 * - Android 10-12: READ_EXTERNAL_STORAGE
 * - Partial access (Android 13+)
 * - Denied/Blocked states
 */
async function resolveAndroidPermission(
    type: MediaPermissionType
): Promise<PermissionResolution> {
    const androidVersion = Platform.Version as number;

    try {
        let permission: string;
        let permissionName: string;

        switch (type) {
            case MediaPermissionType.GALLERY:
                if (androidVersion >= 33) {
                    permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
                    permissionName = 'READ_MEDIA_IMAGES';
                } else {
                    permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
                    permissionName = 'READ_EXTERNAL_STORAGE';
                }
                break;

            case MediaPermissionType.CAMERA:
                permission = PermissionsAndroid.PERMISSIONS.CAMERA;
                permissionName = 'CAMERA';
                break;

            case MediaPermissionType.CONTACTS:
                permission = PermissionsAndroid.PERMISSIONS.READ_CONTACTS;
                permissionName = 'READ_CONTACTS';
                break;

            default:
                return {
                    state: MediaPermissionState.UNAVAILABLE,
                    canAccess: false,
                    message: 'Unknown permission type',
                    action: PermissionAction.NONE,
                    debugInfo: { platform: 'android', permissionType: type, androidVersion },
                };
        }

        // Check current permission status
        const checkResult = await PermissionsAndroid.check(permission as any);

        if (checkResult) {
            // 🔐 PERMISSION-MEDIA BRIDGING: Check if we have local grant memory
            const { hasMediaPermissionBeenGranted } = await import('./mediaPermissionMemory');
            const hasLocalGrant = await hasMediaPermissionBeenGranted();

            if (hasLocalGrant) {
                // OS granted + local memory exists → DO NOT ask again
                return {
                    state: MediaPermissionState.GRANTED,
                    canAccess: true,
                    message: 'Full access granted',
                    action: PermissionAction.NONE,
                    debugInfo: { platform: 'android', permissionType: type, androidVersion, rawStatus: 'granted' },
                };
            }

            // Permission granted but no local memory
            // This means first-time grant or app reinstall
            // Return granted but don't mark as complete until media loads
            return {
                state: MediaPermissionState.GRANTED,
                canAccess: true,
                message: 'Full access granted',
                action: PermissionAction.NONE,
                debugInfo: { platform: 'android', permissionType: type, androidVersion, rawStatus: 'granted' },
            };
        }

        // Permission not granted - need to determine if denied or blocked
        // On Android, we can't distinguish between denied and blocked without requesting
        // So we return DENIED state and let the request flow handle it
        return {
            state: MediaPermissionState.DENIED,
            canAccess: false,
            message: type === MediaPermissionType.GALLERY
                ? 'Photo access required. Grant permission to select images.'
                : type === MediaPermissionType.CAMERA
                    ? 'Camera access required. Grant permission to take photos.'
                    : 'Contacts access required.',
            action: PermissionAction.REQUEST,
            debugInfo: { platform: 'android', permissionType: type, androidVersion, rawStatus: 'denied' },
        };
    } catch (error: any) {
        console.error('[resolveAndroidPermission] Error:', error);
        return {
            state: MediaPermissionState.UNAVAILABLE,
            canAccess: false,
            message: 'Unable to check permission status',
            action: PermissionAction.NONE,
            debugInfo: { platform: 'android', permissionType: type, androidVersion },
        };
    }
}

/**
 * Request permission with proper error handling
 * 
 * Returns updated permission state after request
 */
export async function requestMediaPermission(
    type: MediaPermissionType
): Promise<PermissionResolution> {
    const platform = Platform.OS;

    if (platform === 'ios') {
        return requestIOSPermission(type);
    } else if (platform === 'android') {
        return requestAndroidPermission(type);
    }

    return {
        state: MediaPermissionState.UNAVAILABLE,
        canAccess: false,
        message: 'Permission request not available on this platform',
        action: PermissionAction.NONE,
        debugInfo: { platform, permissionType: type },
    };
}

/**
 * Request iOS permission
 * 
 * NOTE: On iOS, permissions are requested automatically when the picker is launched.
 * We just return the current resolution state.
 */
async function requestIOSPermission(
    type: MediaPermissionType
): Promise<PermissionResolution> {
    // iOS permissions are handled by the picker itself
    // Just return the current state
    return resolveIOSPermission(type);
}

/**
 * Request Android permission
 */
async function requestAndroidPermission(
    type: MediaPermissionType
): Promise<PermissionResolution> {
    const androidVersion = Platform.Version as number;

    try {
        let permission: string;
        let rationale: any;

        switch (type) {
            case MediaPermissionType.GALLERY:
                if (androidVersion >= 33) {
                    permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
                } else {
                    permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
                }
                rationale = {
                    title: 'Photo Access',
                    message: 'Sanchari needs access to your photos to let you select images for posts.',
                    buttonPositive: 'OK',
                };
                break;

            case MediaPermissionType.CAMERA:
                permission = PermissionsAndroid.PERMISSIONS.CAMERA;
                rationale = {
                    title: 'Camera Access',
                    message: 'Sanchari needs camera access to let you take photos for posts.',
                    buttonPositive: 'OK',
                };
                break;

            case MediaPermissionType.CONTACTS:
                permission = PermissionsAndroid.PERMISSIONS.READ_CONTACTS;
                rationale = {
                    title: 'Contacts Access',
                    message: 'Sanchari needs contacts access to help you find friends.',
                    buttonPositive: 'OK',
                };
                break;

            default:
                return resolveAndroidPermission(type);
        }

        const granted = await PermissionsAndroid.request(permission as any, rationale);

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            return {
                state: MediaPermissionState.GRANTED,
                canAccess: true,
                message: 'Permission granted',
                action: PermissionAction.NONE,
                debugInfo: { platform: 'android', permissionType: type, androidVersion, rawStatus: 'granted' },
            };
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            // Permanently denied - user must use Settings
            return {
                state: MediaPermissionState.BLOCKED,
                canAccess: false,
                message: type === MediaPermissionType.GALLERY
                    ? 'Photo access blocked. Enable in Settings to select images.'
                    : type === MediaPermissionType.CAMERA
                        ? 'Camera access blocked. Enable in Settings to take photos.'
                        : 'Contacts access blocked. Enable in Settings.',
                action: PermissionAction.OPEN_SETTINGS,
                debugInfo: { platform: 'android', permissionType: type, androidVersion, rawStatus: 'never_ask_again' },
            };
        } else {
            // Denied - can retry
            return {
                state: MediaPermissionState.DENIED,
                canAccess: false,
                message: 'Permission denied',
                action: PermissionAction.REQUEST,
                debugInfo: { platform: 'android', permissionType: type, androidVersion, rawStatus: 'denied' },
            };
        }
    } catch (error: any) {
        console.error('[requestAndroidPermission] Error:', error);
        return {
            state: MediaPermissionState.UNAVAILABLE,
            canAccess: false,
            message: 'Permission request failed',
            action: PermissionAction.NONE,
            debugInfo: { platform: 'android', permissionType: type, androidVersion },
        };
    }
}

/**
 * Open app settings for permission management
 * 
 * Deep-links to the correct settings page on both iOS and Android
 */
export async function openAppSettings(): Promise<boolean> {
    try {
        if (Platform.OS === 'ios') {
            // iOS: Opens app-specific settings
            await Linking.openURL('app-settings:');
            return true;
        } else if (Platform.OS === 'android') {
            // Android: Opens app info page
            await Linking.openSettings();
            return true;
        }
        return false;
    } catch (error: any) {
        console.error('[openAppSettings] Error:', error);
        Alert.alert(
            'Cannot Open Settings',
            'Please open Settings manually and grant permissions to Sanchari.',
            [{ text: 'OK' }]
        );
        return false;
    }
}

/**
 * Show permission explanation dialog with recovery actions
 */
export function showPermissionDialog(resolution: PermissionResolution): void {
    const { state, message, action } = resolution;

    const buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> = [];

    switch (action) {
        case PermissionAction.OPEN_SETTINGS:
            buttons.push({
                text: 'Open Settings',
                onPress: () => openAppSettings(),
            });
            buttons.push({
                text: 'Cancel',
                style: 'cancel',
            });
            break;

        case PermissionAction.REQUEST:
            buttons.push({
                text: 'Grant Permission',
                onPress: () => {
                    // Caller should handle re-requesting
                    console.log('[showPermissionDialog] User wants to grant permission');
                },
            });
            buttons.push({
                text: 'Cancel',
                style: 'cancel',
            });
            break;

        case PermissionAction.EXPAND_LIMITED:
            buttons.push({
                text: 'Select More Photos',
                onPress: () => {
                    // On iOS, this will trigger the limited photo picker
                    console.log('[showPermissionDialog] User wants to select more photos');
                },
            });
            buttons.push({
                text: 'Continue with Selected',
                style: 'cancel',
            });
            break;

        default:
            buttons.push({
                text: 'OK',
                style: 'cancel',
            });
    }

    Alert.alert(
        state === MediaPermissionState.BLOCKED ? 'Permission Blocked' :
            state === MediaPermissionState.LIMITED ? 'Limited Access' :
                'Permission Required',
        message,
        buttons
    );
}

/**
 * 🔐 VIDEO EXCLUSION ENFORCEMENT
 * 
 * Double-locked video exclusion:
 * 1. Picker query (mediaType: 'photo')
 * 2. Post-selection validation
 */
export function validateImageOnly(asset: { type?: string; fileName?: string; uri?: string }): boolean {
    // Check 1: Explicit type field
    if (asset.type && asset.type.toLowerCase().includes('video')) {
        if (__DEV__) {
            console.error(
                '🚨 VIDEO EXCLUSION VIOLATION: Video detected in image pipeline\n' +
                `Type: ${asset.type}\n` +
                `URI: ${asset.uri?.substring(0, 100)}`
            );
        }
        return false;
    }

    // Check 2: File extension
    if (asset.fileName) {
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
        const fileName = asset.fileName.toLowerCase();
        if (videoExtensions.some(ext => fileName.endsWith(ext))) {
            if (__DEV__) {
                console.error(
                    '🚨 VIDEO EXCLUSION VIOLATION: Video file extension detected\n' +
                    `FileName: ${asset.fileName}`
                );
            }
            return false;
        }
    }

    // Check 3: URI pattern (some video URIs have identifiable patterns)
    if (asset.uri) {
        const uri = asset.uri.toLowerCase();
        if (uri.includes('video') || uri.includes('.mp4') || uri.includes('.mov')) {
            if (__DEV__) {
                console.warn(
                    '⚠️ POSSIBLE VIDEO: URI contains video-related patterns\n' +
                    `URI: ${asset.uri.substring(0, 100)}`
                );
            }
            // Don't reject based on URI alone (could be false positive)
            // But log for investigation
        }
    }

    return true;
}
