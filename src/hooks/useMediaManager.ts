import { useCallback } from 'react';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { Platform, PermissionsAndroid } from 'react-native';

export interface MediaFile {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  size?: number;
  duration?: number; // For videos
}

interface UseMediaManagerReturn {
  requestPermissions: () => Promise<boolean>;
  pickImage: (options?: { fromCamera?: boolean }) => Promise<MediaFile | null>;
  pickVideo: (options?: { fromCamera?: boolean }) => Promise<MediaFile | null>;
  compressImage: (file: MediaFile) => Promise<MediaFile>;
  generateVideoThumbnail: (videoFile: MediaFile) => Promise<string>;
}

/**
 * Global hook for managing media operations
 * Handles image/video picking, compression, and thumbnails
 */
export function useMediaManager(): UseMediaManagerReturn {
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        
        return (
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (error) {
        console.error('Error requesting permissions:', error);
        return false;
      }
    }
    // iOS permissions are handled automatically by the picker
    return true;
  }, []);

  const pickImage = useCallback(async (options?: { fromCamera?: boolean }): Promise<MediaFile | null> => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      throw new Error('Camera or storage permissions not granted');
    }

    return new Promise((resolve, reject) => {
      const pickerOptions = {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
        includeBase64: false,
      };

      const callback = (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve(null);
          return;
        }

        if (response.errorCode) {
          reject(new Error(response.errorMessage || 'Image picker error'));
          return;
        }

        const asset = response.assets?.[0];
        if (!asset) {
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
  }, [requestPermissions]);

  const pickVideo = useCallback(async (options?: { fromCamera?: boolean }): Promise<MediaFile | null> => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      throw new Error('Camera or storage permissions not granted');
    }

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
  }, [requestPermissions]);

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
    requestPermissions,
    pickImage,
    pickVideo,
    compressImage,
    generateVideoThumbnail,
  };
}

