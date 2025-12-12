import { Platform, Image } from 'react-native';
import type { AspectRatio } from '../hooks/useCropState';
import { computeCropRect } from './cropMath';
import type { CropParams } from '../store/stores/useCreateFlowStore';

// ImagePicker is optional - only used for legacy performNativeCrop function
let ImagePicker: any;
try {
  ImagePicker = require('react-native-image-crop-picker');
} catch (e) {
  // ImagePicker not available - that's okay, we use exportFinalBitmap instead
}

export interface CropOptions {
  uri: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  cropWidth: number;
  cropHeight: number;
  targetRatio: AspectRatio;
}

export interface ExportBitmapOptions {
  imageUri: string;
  cropParams: CropParams;
  frameWidth: number;
  frameHeight: number;
  ratio: AspectRatio;
}

/**
 * Performs native cropping using react-native-image-crop-picker
 * Returns the path to the cropped image file
 */
export async function performNativeCrop({
  uri,
  zoom,
  offsetX,
  offsetY,
  cropWidth,
  cropHeight,
  targetRatio,
}: CropOptions): Promise<string> {
  // Prepare image URI (remove file:// prefix if present)
  let imageUri = uri;
  if (Platform.OS === 'android' && imageUri.startsWith('file://')) {
    imageUri = imageUri.replace('file://', '');
  }
  if (Platform.OS === 'ios' && imageUri.startsWith('file://')) {
    imageUri = imageUri.replace('file://', '');
  }

  // Calculate output dimensions based on aspect ratio
  let outputWidth: number;
  let outputHeight: number;
  let cropAspectRatio: number;

  switch (targetRatio) {
    case '1:1':
      outputWidth = 1080;
      outputHeight = 1080;
      cropAspectRatio = 1;
      break;
    case '4:5':
      outputWidth = 1080;
      outputHeight = 1350;
      cropAspectRatio = 4 / 5;
      break;
    case '16:9':
      outputWidth = 1920;
      outputHeight = 1080;
      cropAspectRatio = 16 / 9;
      break;
    default:
      outputWidth = 1080;
      outputHeight = 1350;
      cropAspectRatio = 4 / 5;
  }

  try {
    // Check if ImagePicker is available
    if (!ImagePicker || typeof ImagePicker.openCropper !== 'function') {
      console.warn('ImagePicker native module not available. Using original URI.');
      return uri;
    }

    // Use react-native-image-crop-picker to perform actual bitmap cropping
    const croppedImage = await ImagePicker.openCropper({
      path: imageUri,
      width: outputWidth,
      height: outputHeight,
      cropping: true,
      cropperToolbarTitle: 'Crop Image',
      cropperChooseText: 'Done',
      cropperCancelText: 'Cancel',
      compressImageQuality: 0.9,
      freeStyleCropEnabled: false,
      cropperActiveWidgetColor: '#FF7F4D',
      cropperStatusBarColor: '#FF7F4D',
      cropperToolbarColor: '#FF7F4D',
      cropperCircleOverlay: targetRatio === '1:1',
      aspectRatioPreserved: true,
      cropperToolbarWidgetColor: '#FFFFFF',
      showCropGuidelines: true,
      hideBottomControls: false,
      enableRotationGesture: false,
    });

    return croppedImage.path;
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (
      error.message?.includes('cancel') ||
      error.message?.includes('User cancelled') ||
      error.code === 'E_PICKER_CANCELLED'
    ) {
      // User cancelled - return original URI
      return uri;
    }

    // iOS safe mode: If cropping fails, fallback to original
    if (Platform.OS === 'ios') {
      console.warn(
        'ImagePicker crop failed on iOS (native module may not be linked). Using original URI. Run: cd ios && pod install'
      );
      return uri;
    }

    // Android: Log error but still try to return original as fallback
    console.error('Crop error:', error);
    return uri;
  }
}

/**
 * Export final cropped bitmap programmatically (Instagram-like)
 * This creates a REAL bitmap file that matches exactly what the user saw in preview
 * NO native UI - completely silent programmatic cropping
 */
export async function exportFinalBitmap({
  imageUri,
  cropParams,
  frameWidth,
  frameHeight,
  ratio,
}: ExportBitmapOptions): Promise<string> {
  console.log('🖼️ [exportFinalBitmap] Starting programmatic bitmap export');
  console.log('🖼️ [exportFinalBitmap] Params:', {
    imageUri: imageUri.substring(0, 50) + '...',
    zoom: cropParams.zoom,
    offsetX: cropParams.offsetX,
    offsetY: cropParams.offsetY,
    frameWidth,
    frameHeight,
    ratio,
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

    console.log('🖼️ [exportFinalBitmap] Image size:', imageSize);

    if (imageSize.width === 0 || imageSize.height === 0) {
      throw new Error('Invalid image dimensions');
    }

    // Calculate the exact crop rectangle based on user's adjustments
    const cropRect = computeCropRect(
      imageSize.width,
      imageSize.height,
      cropParams,
      frameWidth,
      frameHeight,
      ratio
    );

    console.log('🖼️ [exportFinalBitmap] Crop rect:', cropRect);

    // Calculate output dimensions based on ratio
    let outputWidth: number;
    let outputHeight: number;
    switch (ratio) {
      case '1:1':
        outputWidth = 1080;
        outputHeight = 1080;
        break;
      case '4:5':
        outputWidth = 1080;
        outputHeight = 1350;
        break;
      case '16:9':
        outputWidth = 1920;
        outputHeight = 1080;
        break;
      default:
        outputWidth = 1080;
        outputHeight = 1350;
    }

    // Prepare image URI (remove file:// prefix)
    let processedUri = imageUri;
    if (Platform.OS === 'android' && processedUri.startsWith('file://')) {
      processedUri = processedUri.replace('file://', '');
    }
    if (Platform.OS === 'ios' && processedUri.startsWith('file://')) {
      processedUri = processedUri.replace('file://', '');
    }

    // CRITICAL: Use image manipulation library that supports x/y crop coordinates
    // This ensures offsetX/offsetY adjustments (e.g., moving person to left corner) are preserved
    let finalImageUri: string;
    
    // Try multiple image manipulation libraries in order of preference (React Native CLI compatible)
    let manipulationSuccess = false;
    
    // Method 1: Try react-native-photo-manipulator (React Native CLI - supports precise x/y crop)
    try {
      const RNPhotoManipulator = require('react-native-photo-manipulator').default;
      
      console.log('🖼️ [exportFinalBitmap] Using react-native-photo-manipulator for precise cropping...');
      console.log('🖼️ [exportFinalBitmap] Crop rect (x, y, width, height):', {
        x: Math.round(cropRect.x),
        y: Math.round(cropRect.y),
        width: Math.round(cropRect.width),
        height: Math.round(cropRect.height),
      });
      
      // Ensure crop rect is within image bounds
      const safeCropRect = {
        x: Math.max(0, Math.min(Math.round(cropRect.x), imageSize.width - 1)),
        y: Math.max(0, Math.min(Math.round(cropRect.y), imageSize.height - 1)),
        width: Math.min(Math.round(cropRect.width), imageSize.width - Math.max(0, Math.round(cropRect.x))),
        height: Math.min(Math.round(cropRect.height), imageSize.height - Math.max(0, Math.round(cropRect.y))),
      };

      // Ensure width and height are positive and valid
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
      
      console.log('🖼️ [exportFinalBitmap] Safe crop rect:', safeCropRect);
      
      // react-native-photo-manipulator API: crop(imageUri, cropRegion, targetSize)
      const targetSize = { width: outputWidth, height: outputHeight };
      const croppedImageUri = await RNPhotoManipulator.crop(processedUri, safeCropRect, targetSize);

      finalImageUri = croppedImageUri;
      manipulationSuccess = true;
      console.log('✅ [exportFinalBitmap] react-native-photo-manipulator crop complete:', finalImageUri.substring(0, 50) + '...');
      console.log('✅ [exportFinalBitmap] EXACT adjusted frame exported (offsetX/offsetY preserved)');
    } catch (photoManipError: any) {
      console.log('⚠️ [exportFinalBitmap] react-native-photo-manipulator not available:', photoManipError.message);
      
      // Method 2: Try expo-image-manipulator (if using Expo)
      try {
        const ImageManipulator = require('expo-image-manipulator').default;
        
        console.log('🖼️ [exportFinalBitmap] Trying expo-image-manipulator...');
        
        const safeCropRect = {
          originX: Math.max(0, Math.min(Math.round(cropRect.x), imageSize.width - 1)),
          originY: Math.max(0, Math.min(Math.round(cropRect.y), imageSize.height - 1)),
          width: Math.min(Math.round(cropRect.width), imageSize.width - Math.max(0, Math.round(cropRect.x))),
          height: Math.min(Math.round(cropRect.height), imageSize.height - Math.max(0, Math.round(cropRect.y))),
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
        console.log('✅ [exportFinalBitmap] expo-image-manipulator crop complete');
      } catch (expoError: any) {
        console.log('⚠️ [exportFinalBitmap] expo-image-manipulator not available:', expoError.message);
      }
    }
    
    // Method 3: If no image manipulator available, throw error (don't use inaccurate fallback)
    if (!manipulationSuccess) {
      throw new Error(
        'Image manipulation library not available. ' +
        'For React Native CLI, please install: npm install react-native-photo-manipulator && npx pod-install. ' +
        'For Expo, install: npx expo install expo-image-manipulator. ' +
        'This is required for precise cropping with position adjustments (offsetX/offsetY).'
      );
    }

    return finalImageUri;
  } catch (error: any) {
    console.error('❌ [exportFinalBitmap] Error exporting bitmap:', error);
    console.error('❌ [exportFinalBitmap] Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 200),
    });
    
    // If export fails, throw error - don't fallback to original
    // This ensures we know when cropping failed
    throw new Error(`Failed to export cropped bitmap: ${error.message || 'Unknown error'}`);
  }
}

