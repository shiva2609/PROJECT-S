import ImagePicker from 'react-native-image-crop-picker';
import { Platform } from 'react-native';
import type { AspectRatio } from '../hooks/useCropState';

export interface CropOptions {
  uri: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  cropWidth: number;
  cropHeight: number;
  targetRatio: AspectRatio;
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

