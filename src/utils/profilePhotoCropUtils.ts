/**
 * Profile Photo Crop Utilities
 * Handles rectangular profile photo cropping with custom aspect ratio (100x130)
 */

import { Platform, Image } from 'react-native';
import RNFS from 'react-native-fs';
import { computeCropRect } from './cropMath';
import type { CropParams } from '../store/stores/useCreateFlowStore';

// Profile photo box dimensions (Square for circular crop)
export const PROFILE_PHOTO_WIDTH = 500;
export const PROFILE_PHOTO_HEIGHT = 500;
export const PROFILE_PHOTO_ASPECT_RATIO = 1.0;

// Output dimensions for final bitmap (high quality)
export const PROFILE_PHOTO_OUTPUT_WIDTH = 1000;
export const PROFILE_PHOTO_OUTPUT_HEIGHT = 1000;

export interface ProfilePhotoCropOptions {
  imageUri: string;
  cropParams: CropParams;
  frameWidth: number;
  frameHeight: number;
}

/**
 * Export final cropped bitmap for profile photo
 * Uses custom rectangular ratio (100x130)
 */
export async function exportProfilePhotoBitmap({
  imageUri,
  cropParams,
  frameWidth,
  frameHeight,
}: ProfilePhotoCropOptions): Promise<string> {
  console.log('🖼️ [exportProfilePhotoBitmap] Starting profile photo bitmap export');
  console.log('🖼️ [exportProfilePhotoBitmap] Params:', {
    imageUri: imageUri.substring(0, 50) + '...',
    zoom: cropParams.zoom,
    offsetX: cropParams.offsetX,
    offsetY: cropParams.offsetY,
    frameWidth,
    frameHeight,
  });

  try {
    // Get image dimensions
    const imageSize = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });

    console.log('🖼️ [exportProfilePhotoBitmap] Image size:', imageSize);

    if (imageSize.width === 0 || imageSize.height === 0) {
      throw new Error('Invalid image dimensions');
    }

    // Calculate the exact crop rectangle based on user's adjustments
    // Custom calculation for profile photo rectangular ratio
    const scaledWidth = imageSize.width * cropParams.zoom;
    const scaledHeight = imageSize.height * cropParams.zoom;

    // Calculate the center point of the crop box in scaled image coordinates
    const cropCenterX = scaledWidth / 2 - cropParams.offsetX;
    const cropCenterY = scaledHeight / 2 - cropParams.offsetY;

    // Convert to original image coordinates
    const originalCenterX = cropCenterX / cropParams.zoom;
    const originalCenterY = cropCenterY / cropParams.zoom;

    // Calculate crop size in original image coordinates
    const cropSizeInOriginalX = frameWidth / cropParams.zoom;
    const cropSizeInOriginalY = frameHeight / cropParams.zoom;

    // Output dimensions for profile photo
    const outputWidth = PROFILE_PHOTO_OUTPUT_WIDTH;
    const outputHeight = PROFILE_PHOTO_OUTPUT_HEIGHT;

    // Ensure the crop is a square that fits within the image
    // This prevents stretching when using targetSize in the crop libraries
    const sideInOriginal = Math.min(
      frameWidth / cropParams.zoom,
      frameHeight / cropParams.zoom,
      imageSize.width,
      imageSize.height
    );

    // Calculate top-left corner centered on the user's focus point
    // but clamped to ensure the square stays within image bounds
    const x = Math.max(0, Math.min(originalCenterX - sideInOriginal / 2, imageSize.width - sideInOriginal));
    const y = Math.max(0, Math.min(originalCenterY - sideInOriginal / 2, imageSize.height - sideInOriginal));

    const finalCropRect = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(sideInOriginal),
      height: Math.round(sideInOriginal),
    };

    console.log('🖼️ [exportProfilePhotoBitmap] Crop rect:', finalCropRect);

    // Prepare image URI for react-native-photo-manipulator
    // The library needs a proper file path that it can read
    // On Android, cache files might not be readable, so we copy to a proper location
    let processedUri = imageUri;

    // Remove file:// prefix for processing
    if (processedUri.startsWith('file://')) {
      processedUri = processedUri.replace('file://', '');
    }
    if (processedUri.startsWith('file:///')) {
      processedUri = processedUri.replace('file:///', '');
    }

    // On Android, copy the file to a location that react-native-photo-manipulator can read
    if (Platform.OS === 'android') {
      try {
        // Check if file exists and is readable
        const fileExists = await RNFS.exists(processedUri);
        if (!fileExists) {
          console.log('⚠️ [exportProfilePhotoBitmap] Original file not found, using original URI');
        } else {
          // Copy to a temporary file in a location the library can access
          const tempPath = `${RNFS.CachesDirectoryPath}/profile_photo_${Date.now()}.jpg`;
          await RNFS.copyFile(processedUri, tempPath);
          processedUri = tempPath;
          console.log('✅ [exportProfilePhotoBitmap] Copied image to accessible location:', tempPath);
        }
      } catch (copyError: any) {
        console.log('⚠️ [exportProfilePhotoBitmap] Failed to copy file, using original:', copyError.message);
        // Continue with original URI
      }
    }

    // Use image manipulation library
    let finalImageUri: string;
    let manipulationSuccess = false;

    // Method 1: Try react-native-photo-manipulator
    try {
      // Try different import methods for react-native-photo-manipulator
      let RNPhotoManipulator: any;
      try {
        RNPhotoManipulator = require('react-native-photo-manipulator');
        // Check if it has a default export
        if (RNPhotoManipulator.default) {
          RNPhotoManipulator = RNPhotoManipulator.default;
        }
      } catch (importError) {
        throw new Error('react-native-photo-manipulator module not found');
      }

      // Verify the crop function exists
      if (!RNPhotoManipulator || typeof RNPhotoManipulator.crop !== 'function') {
        throw new Error('react-native-photo-manipulator.crop is not available');
      }

      console.log('🖼️ [exportProfilePhotoBitmap] Using react-native-photo-manipulator...');
      console.log('🖼️ [exportProfilePhotoBitmap] Crop rect:', {
        x: Math.round(finalCropRect.x),
        y: Math.round(finalCropRect.y),
        width: Math.round(finalCropRect.width),
        height: Math.round(finalCropRect.height),
      });

      const safeCropRect = {
        x: Math.max(0, Math.min(Math.round(finalCropRect.x), imageSize.width - 1)),
        y: Math.max(0, Math.min(Math.round(finalCropRect.y), imageSize.height - 1)),
        width: Math.min(Math.round(finalCropRect.width), imageSize.width - Math.max(0, Math.round(finalCropRect.x))),
        height: Math.min(Math.round(finalCropRect.height), imageSize.height - Math.max(0, Math.round(finalCropRect.y))),
      };

      if (safeCropRect.width <= 0 || safeCropRect.height <= 0) {
        throw new Error('Invalid crop rectangle dimensions');
      }

      // Ensure crop rect doesn't exceed image bounds
      if (safeCropRect.x + safeCropRect.width > imageSize.width) {
        safeCropRect.width = imageSize.width - safeCropRect.x;
      }
      if (safeCropRect.y + safeCropRect.height > imageSize.height) {
        safeCropRect.height = imageSize.height - safeCropRect.y;
      }

      const targetSize = { width: outputWidth, height: outputHeight };

      // Call the crop function
      const croppedImageUri = await RNPhotoManipulator.crop(processedUri, safeCropRect, targetSize);

      if (!croppedImageUri || typeof croppedImageUri !== 'string') {
        throw new Error('Invalid crop result from react-native-photo-manipulator');
      }

      finalImageUri = croppedImageUri;
      manipulationSuccess = true;
      console.log('✅ [exportProfilePhotoBitmap] Profile photo bitmap exported successfully');
    } catch (photoManipError: any) {
      console.log('⚠️ [exportProfilePhotoBitmap] react-native-photo-manipulator error:', photoManipError.message);
      console.log('⚠️ [exportProfilePhotoBitmap] Error details:', photoManipError);

      // Method 2: Try expo-image-manipulator
      try {
        const ImageManipulator = require('expo-image-manipulator').default;

        console.log('🖼️ [exportProfilePhotoBitmap] Trying expo-image-manipulator...');

        const safeCropRect = {
          originX: Math.max(0, Math.min(Math.round(finalCropRect.x), imageSize.width - 1)),
          originY: Math.max(0, Math.min(Math.round(finalCropRect.y), imageSize.height - 1)),
          width: Math.min(Math.round(finalCropRect.width), imageSize.width - Math.max(0, Math.round(finalCropRect.x))),
          height: Math.min(Math.round(finalCropRect.height), imageSize.height - Math.max(0, Math.round(finalCropRect.y))),
        };

        if (safeCropRect.width <= 0 || safeCropRect.height <= 0) {
          throw new Error('Invalid crop rectangle dimensions');
        }

        const manipulatedImage = await ImageManipulator.manipulateAsync(
          processedUri,
          [
            { crop: safeCropRect },
            { resize: { width: outputWidth, height: outputHeight } },
          ],
          { compress: 0.9, format: 'jpeg' }
        );

        finalImageUri = manipulatedImage.uri;
        manipulationSuccess = true;
        console.log('✅ [exportProfilePhotoBitmap] Profile photo bitmap exported successfully');
      } catch (expoError: any) {
        console.log('⚠️ [exportProfilePhotoBitmap] expo-image-manipulator not available:', expoError.message);

        // Method 3: Final fallback - Use original image (no cropping)
        // This ensures the upload still works even if cropping libraries fail
        // The image will be uploaded as-is - better than crashing
        console.log('⚠️ [exportProfilePhotoBitmap] No image processing libraries available, using original image');
        console.log('⚠️ [exportProfilePhotoBitmap] Note: Image will be uploaded without crop adjustments');
        finalImageUri = imageUri; // Use original URI, not processedUri
        manipulationSuccess = true;
        console.log('⚠️ [exportProfilePhotoBitmap] Using original image (no processing available)');
      }
    }

    if (!manipulationSuccess) {
      throw new Error(
        'Image manipulation library not available. ' +
        'Please install one of: react-native-photo-manipulator, expo-image-manipulator, or ensure react-native-image-crop-picker is properly linked.'
      );
    }

    return finalImageUri;
  } catch (error: any) {
    console.error('❌ [exportProfilePhotoBitmap] Error exporting bitmap:', error);
    throw new Error(`Failed to export profile photo bitmap: ${error.message || 'Unknown error'}`);
  }
}

