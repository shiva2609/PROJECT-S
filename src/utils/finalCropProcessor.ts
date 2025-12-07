// ImagePicker removed - was causing ghost "Processing" screen
// Using ImageResizer instead for silent processing
import { Platform } from 'react-native';
import type { Asset, CropParams, AspectRatio } from '../store/useCreateFlowStore';
import { computeCropRect } from './cropMath';

/**
 * Process final cropping for all selected images
 * This performs ACTUAL native cropping based on user's pan/zoom/ratio adjustments
 * CRITICAL: This ensures the uploaded image matches exactly what the user saw in preview
 */
export async function processFinalCrops(
  assets: Asset[],
  cropParams: { [id: string]: CropParams },
  globalRatio: AspectRatio,
  cropBoxWidth: number,
  cropBoxHeight: number
): Promise<string[]> {
  console.log('🟡 [finalCropProcessor] processFinalCrops called - processing', assets.length, 'images');
  const finalUris: string[] = [];

  for (const asset of assets) {
    const params = cropParams[asset.id];
    if (!params) {
      // CRITICAL: No crop params - this should not happen in the new flow
      // In the new flow, CropAdjustScreen generates final bitmaps immediately
      // This function is only used by legacy AddDetailsScreen flow
      // Throw error instead of using original image
      console.error(`❌ [finalCropProcessor] No crop params for asset ${asset.id} - cannot generate final bitmap`);
      throw new Error(`Missing crop parameters for image ${asset.id}. Cannot generate final cropped bitmap.`);
    }

    try {
      // Get image dimensions
      const imageSize = await getImageSize(asset.uri);
      
      if (imageSize.width === 0 || imageSize.height === 0) {
        // CRITICAL: Invalid image size - cannot generate final bitmap
        // Throw error instead of using original image
        console.error(`❌ [finalCropProcessor] Invalid image size for ${asset.id} - cannot generate final bitmap`);
        throw new Error(`Invalid image dimensions for ${asset.id}. Cannot generate final cropped bitmap.`);
      }

      // Compute the exact crop rectangle based on user's adjustments
      const cropRect = computeCropRect(
        imageSize.width,
        imageSize.height,
        params,
        cropBoxWidth,
        cropBoxHeight,
        globalRatio
      );

      // Calculate output dimensions based on ratio
      let outputWidth: number;
      let outputHeight: number;
      switch (globalRatio) {
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
      }

      // Prepare image URI
      let imageUri = asset.uri;
      if (Platform.OS === 'android' && imageUri.startsWith('file://')) {
        imageUri = imageUri.replace('file://', '');
      }
      if (Platform.OS === 'ios' && imageUri.startsWith('file://')) {
        imageUri = imageUri.replace('file://', '');
      }

      // CRITICAL: Use the same cropping logic as exportFinalBitmap to actually CROP the image
      // ImageResizer only resizes - it doesn't crop. We need to use a library that supports x/y crop coordinates
      console.log('🟡 [finalCropProcessor] Using image manipulation library for precise cropping...');
      console.log('🟡 [finalCropProcessor] Crop rect (x, y, width, height):', {
        x: Math.round(cropRect.x),
        y: Math.round(cropRect.y),
        width: Math.round(cropRect.width),
        height: Math.round(cropRect.height),
      });
      
      // Prepare image URI (remove file:// prefix)
      let processedUri = imageUri;
      if (Platform.OS === 'android' && processedUri.startsWith('file://')) {
        processedUri = processedUri.replace('file://', '');
      }
      if (Platform.OS === 'ios' && processedUri.startsWith('file://')) {
        processedUri = processedUri.replace('file://', '');
      }
      
      let finalImageUri: string;
      let manipulationSuccess = false;
      
      // Method 1: Try react-native-photo-manipulator (React Native CLI - supports precise x/y crop)
      try {
        const RNPhotoManipulator = require('react-native-photo-manipulator').default;
        
        console.log('🟡 [finalCropProcessor] Using react-native-photo-manipulator for precise cropping...');
        
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
        
        console.log('🟡 [finalCropProcessor] Safe crop rect:', safeCropRect);
        
        // react-native-photo-manipulator API: crop(imageUri, cropRegion, targetSize)
        const targetSize = { width: outputWidth, height: outputHeight };
        const croppedImageUri = await RNPhotoManipulator.crop(processedUri, safeCropRect, targetSize);

        finalImageUri = croppedImageUri;
        manipulationSuccess = true;
        console.log('✅ [finalCropProcessor] react-native-photo-manipulator crop complete:', finalImageUri.substring(0, 50) + '...');
      } catch (photoManipError: any) {
        console.log('⚠️ [finalCropProcessor] react-native-photo-manipulator not available:', photoManipError.message);
        
        // Method 2: Try expo-image-manipulator (if using Expo)
        try {
          const ImageManipulator = require('expo-image-manipulator').default;
          
          console.log('🟡 [finalCropProcessor] Trying expo-image-manipulator...');
          
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
          console.log('✅ [finalCropProcessor] expo-image-manipulator crop complete');
        } catch (expoError: any) {
          console.log('⚠️ [finalCropProcessor] expo-image-manipulator not available:', expoError.message);
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
      
      console.log('✅ [finalCropProcessor] Final cropped bitmap generated:', finalImageUri.substring(0, 50) + '...');
      finalUris.push(finalImageUri);
    } catch (error: any) {
      // CRITICAL: Any error during processing - cannot use original image
      // Re-throw error instead of falling back to original
      console.error(`❌ [finalCropProcessor] Error processing ${asset.id}:`, error.message || error);
      throw new Error(`Failed to process image ${asset.id}: ${error.message || 'Unknown error'}`);
    }
  }

  return finalUris;
}

/**
 * Get image dimensions
 */
function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const Image = require('react-native').Image;
    Image.getSize(
      uri,
      (width: number, height: number) => {
        resolve({ width, height });
      },
      (error: any) => {
        reject(error);
      }
    );
  });
}

