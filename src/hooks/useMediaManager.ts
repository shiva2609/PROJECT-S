import { useCallback } from 'react';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { Platform, Alert } from 'react-native';
import {
  resolveMediaPermissionState,
  requestMediaPermission,
  showPermissionDialog,
  validateImageOnly,
  MediaPermissionType,
  MediaPermissionState,
  PermissionAction,
} from '../utils/mediaPermissions';

export interface MediaFile {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  size?: number;
  duration?: number; // For videos
}

interface UseMediaManagerReturn {
  pickImage: (options?: { fromCamera?: boolean }) => Promise<MediaFile | null>;
  pickVideo: (options?: { fromCamera?: boolean }) => Promise<MediaFile | null>;
  compressImage: (file: MediaFile) => Promise<MediaFile>;
  generateVideoThumbnail: (videoFile: MediaFile) => Promise<string>;
}

/**
 * 🔐 CONSOLIDATED MEDIA MANAGER
 * 
 * ALL permission handling delegated to mediaPermissions.ts
 * 
 * Responsibilities:
 * - Media picking orchestration
 * - Image-only validation (video exclusion)
 * - Clean asset returns
 * 
 * NOT responsible for:
 * - Permission requests (delegated to resolveMediaPermissionState)
 * - Permission checks (delegated to requestMediaPermission)
 * - Recovery UX (delegated to showPermissionDialog)
 */
export function useMediaManager(): UseMediaManagerReturn {
  /**
   * Pick image with canonical permission handling
   * 
   * 🔐 INVARIANT: NO direct permission checks
   * ALL permission logic delegated to mediaPermissions.ts
   */
  const pickImage = useCallback(async (options?: { fromCamera?: boolean }): Promise<MediaFile | null> => {
    // 🔐 STEP 1: Resolve permission state through canonical resolver
    const permissionType = options?.fromCamera
      ? MediaPermissionType.CAMERA
      : MediaPermissionType.GALLERY;

    const resolution = await resolveMediaPermissionState(permissionType);

    // 🔐 STEP 2: If no access, show recovery UX and BLOCK
    if (!resolution.canAccess) {
      // Check if we should request permission
      if (resolution.action === PermissionAction.REQUEST) {
        const requestResult = await requestMediaPermission(permissionType);

        if (!requestResult.canAccess) {
          // Still no access - show recovery dialog
          showPermissionDialog(requestResult);
          return null;
        }
        // Permission granted - proceed
      } else {
        // Blocked or other state - show recovery dialog
        showPermissionDialog(resolution);
        return null;
      }
    }

    // 🔐 STEP 3: Permission granted - proceed with picker
    return new Promise((resolve, reject) => {
      const pickerOptions = {
        mediaType: 'photo' as MediaType, // 🔐 PRIMARY VIDEO EXCLUSION
        quality: 0.8,
        includeBase64: false,
      };

      const callback = (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve(null);
          return;
        }

        if (response.errorCode) {
          // Handle permission errors from picker
          if (response.errorCode === 'permission' || response.errorCode === 'camera_unavailable') {
            if (__DEV__) {
              console.error('[useMediaManager] Picker permission error:', response.errorMessage);
            }

            // Show recovery UX
            Alert.alert(
              'Permission Required',
              response.errorMessage || 'Unable to access media. Please check permissions in Settings.',
              [
                { text: 'OK' }
              ]
            );
            resolve(null);
            return;
          }

          reject(new Error(response.errorMessage || 'Image picker error'));
          return;
        }

        const asset = response.assets?.[0];
        if (!asset) {
          resolve(null);
          return;
        }

        // 🔐 SECONDARY VIDEO EXCLUSION: Validate asset is image-only
        if (!validateImageOnly(asset)) {
          Alert.alert(
            'Invalid Selection',
            'Videos are not supported. Please select an image.',
            [{ text: 'OK' }]
          );
          resolve(null);
          return;
        }

        resolve({
          uri: asset.uri || '',
          type: 'image',
          width: asset.width,
          height: asset.height,
          size: asset.fileSize,
        });
      };

      if (options?.fromCamera) {
        launchCamera(pickerOptions, callback);
      } else {
        launchImageLibrary(pickerOptions, callback);
      }
    });
  }, []);

  /**
   * Pick video with canonical permission handling
   * 
   * 🔐 INVARIANT: NO direct permission checks
   */
  const pickVideo = useCallback(async (options?: { fromCamera?: boolean }): Promise<MediaFile | null> => {
    // 🔐 STEP 1: Resolve permission state through canonical resolver
    const permissionType = options?.fromCamera
      ? MediaPermissionType.CAMERA
      : MediaPermissionType.GALLERY;

    const resolution = await resolveMediaPermissionState(permissionType);

    // 🔐 STEP 2: If no access, show recovery UX and BLOCK
    if (!resolution.canAccess) {
      if (resolution.action === PermissionAction.REQUEST) {
        const requestResult = await requestMediaPermission(permissionType);

        if (!requestResult.canAccess) {
          showPermissionDialog(requestResult);
          return null;
        }
      } else {
        showPermissionDialog(resolution);
        return null;
      }
    }

    // 🔐 STEP 3: Permission granted - proceed with picker
    return new Promise((resolve, reject) => {
      const pickerOptions = {
        mediaType: 'video' as MediaType,
        quality: 0.8,
        videoQuality: 'high',
        includeBase64: false,
      };

      const callback = (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve(null);
          return;
        }

        if (response.errorCode) {
          if (response.errorCode === 'permission' || response.errorCode === 'camera_unavailable') {
            if (__DEV__) {
              console.error('[useMediaManager] Picker permission error:', response.errorMessage);
            }

            Alert.alert(
              'Permission Required',
              response.errorMessage || 'Unable to access media. Please check permissions in Settings.',
              [{ text: 'OK' }]
            );
            resolve(null);
            return;
          }

          reject(new Error(response.errorMessage || 'Video picker error'));
          return;
        }

        const asset = response.assets?.[0];
        if (!asset) {
          resolve(null);
          return;
        }

        resolve({
          uri: asset.uri || '',
          type: 'video',
          width: asset.width,
          height: asset.height,
          size: asset.fileSize,
          duration: asset.duration,
        });
      };

      if (options?.fromCamera) {
        launchCamera(pickerOptions, callback);
      } else {
        launchImageLibrary(pickerOptions, callback);
      }
    });
  }, []);

  const compressImage = useCallback(async (file: MediaFile): Promise<MediaFile> => {
    // Placeholder for compression logic
    // Will be implemented in Phase 3 with react-native-image-resizer
    // For now, return the file as-is
    return file;
  }, []);

  const generateVideoThumbnail = useCallback(async (videoFile: MediaFile): Promise<string> => {
    // Placeholder for thumbnail generation
    // Will be implemented in Phase 3 with react-native-video or similar
    // For now, return empty string
    return '';
  }, []);

  return {
    pickImage,
    pickVideo,
    compressImage,
    generateVideoThumbnail,
  };
}

// 🔐 DEPRECATED: Legacy permission API
// This function is DEPRECATED and should NOT be used
// Use resolveMediaPermissionState() from mediaPermissions.ts instead
export function requestPermissions(): never {
  if (__DEV__) {
    throw new Error(
      '🚨 DEPRECATED API VIOLATION: requestPermissions() is deprecated.\n' +
      'Use resolveMediaPermissionState() from mediaPermissions.ts instead.\n' +
      'This ensures consistent permission handling across the app.'
    );
  }
  throw new Error('Deprecated API');
}
