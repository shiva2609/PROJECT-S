import { Platform, Image } from 'react-native';
import ImageResizer from 'react-native-image-resizer';
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
  console.log('🖼️ [exportFinalBitmap] ========== START ==========');
  console.log('🖼️ [exportFinalBitmap] Input URI:', imageUri);
  console.log('🖼️ [exportFinalBitmap] Crop params:', cropParams);
  console.log('🖼️ [exportFinalBitmap] Frame:', { frameWidth, frameHeight, ratio });

  try {
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

    console.log('🖼️ [exportFinalBitmap] Target output:', { outputWidth, outputHeight });

    // Use ImageResizer to create a new file
    // ImageResizer handles file:// prefix automatically
    const response = await ImageResizer.createResizedImage(
      imageUri, // Pass original URI as-is
      outputWidth,
      outputHeight,
      'JPEG',
      90, // quality
      0, // rotation
      undefined, // outputPath - let it generate
      false, // keepMeta
      {
        mode: 'contain',
        onlyScaleDown: false,
      }
    );

    console.log('✅ [exportFinalBitmap] Resizer SUCCESS');
    console.log('✅ [exportFinalBitmap] Output URI:', response.uri);
    console.log('✅ [exportFinalBitmap] Output size:', response.size);
    console.log('✅ [exportFinalBitmap] Output dimensions:', { width: response.width, height: response.height });

    // Validate output
    if (!response.uri) {
      throw new Error('ImageResizer returned empty URI');
    }

    if (response.size === 0) {
      throw new Error('ImageResizer created empty file (0 bytes)');
    }

    // Return the URI exactly as ImageResizer provides it
    // Do NOT strip file:// here - let the upload function handle it
    return response.uri;

  } catch (error: any) {
    console.error('❌ [exportFinalBitmap] FAILED');
    console.error('❌ [exportFinalBitmap] Error:', error);
    console.error('❌ [exportFinalBitmap] Error code:', error.code);
    console.error('❌ [exportFinalBitmap] Error message:', error.message);
    console.error('❌ [exportFinalBitmap] Error stack:', error.stack);

    throw new Error(`Failed to export bitmap: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Normalize image orientation and dimensions
 * This creates a new file with standard orientation (1) and correct pixel dimensions
 * helping to avoid issues with EXIF rotation on different devices (post-MIUI/WhatsApp)
 */
export async function normalizeImage(uri: string): Promise<{ uri: string; width: number; height: number }> {
  try {
    // Basic cleanup of URI
    let imageUri = uri;
    if (Platform.OS === 'android' && imageUri.startsWith('file://')) {
      imageUri = imageUri.replace('file://', '');
    }

    // 1. Get original dimensions to establish baseline
    // Note: Image.getSize might return swapped/unswapped dimensions depending on OS/version
    // but the key is consistent behavior from ImageResizer
    const originalSize = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });

    // 2. Create a normalized copy using ImageResizer
    // This forcibly applies EXIF orientation to the pixel data and resets the EXIF tag
    // We use a large dimension to avoid quality loss, but 'onlyScaleDown' ensures we don't upscale
    // Note: older ImageResizer versions might not support onlyScaleDown, so we use a safe large max
    const MAX_DIMENSION = 4096; // 4K is sufficient for mobile uploads

    // Calculate target dimensions that respect aspect ratio but stay within MAX_DIMENSION
    let targetWidth = originalSize.width;
    let targetHeight = originalSize.height;

    // Optional: downscale if huge (saves memory during crop)
    if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
      const aspectRatio = targetWidth / targetHeight;
      if (targetWidth > targetHeight) {
        targetWidth = MAX_DIMENSION;
        targetHeight = MAX_DIMENSION / aspectRatio;
      } else {
        targetHeight = MAX_DIMENSION;
        targetWidth = MAX_DIMENSION * aspectRatio;
      }
    }

    // Use JPEG format with high quality to preserve details
    // rotation=0 signals "don't add extra rotation", but createResizedImage SHOULD respect existing EXIF
    const response = await ImageResizer.createResizedImage(
      imageUri,
      targetWidth,
      targetHeight,
      'JPEG', // Format
      95,     // Quality
      0,      // Rotation (we rely on auto-orientation of the library)
      undefined, // Output path
      false,  // Keep meta? NO -> We want to strip EXIF orientation by baking it in
      {       // Options
        mode: 'contain',
        onlyScaleDown: true
      }
    );

    // 3. Get exact dimensions of the NEW normalized file
    // These are the dimensions we MUST use for all crop math
    const normalizedSize = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(
        response.uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });

    console.log('✅ [normalizeImage] Normalized:', {
      original: originalSize,
      normalized: normalizedSize,
      uri: response.uri.substring(response.uri.length - 20)
    });

    return {
      uri: response.uri,
      width: normalizedSize.width,
      height: normalizedSize.height
    };
  } catch (error) {
    console.error('❌ [normalizeImage] Failed:', error);
    // Fallback: Return original info if normalization fails, but warn
    // This risks the crop drift bug, but prevents app crash
    const fallbackSize = await new Promise<{ width: number; height: number }>((resolve) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), () => resolve({ width: 0, height: 0 }));
    });
    return { uri, width: fallbackSize.width, height: fallbackSize.height };
  }
}

