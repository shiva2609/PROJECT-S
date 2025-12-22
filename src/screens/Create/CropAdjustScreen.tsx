/**
 * INSTAGRAM-STYLE CROP/ADJUST SCREEN
 * 
 * NEW FLOW: PhotoSelect → CropAdjust → AddPostDetails → Upload
 * 
 * KEY CHANGES (Instagram-style implementation):
 * 1. Ratio is LOCKED on first image selection (one ratio per post)
 * 2. Final bitmaps are generated IMMEDIATELY when user presses "Next"
 * 3. Each image gets a final rendered bitmap with exact dimensions:
 *    - 1:1 → 1080x1080
 *    - 4:5 → 1080x1350
 *    - 16:9 → 1920x1080
 * 4. All subsequent screens use ONLY final bitmaps (no original images, no transform re-application)
 * 5. Feed/PostCards display final bitmaps directly (no scaling logic, just aspect ratio matching)
 * 
 * OLD FLOW (removed):
 * - Original images reused after selection
 * - Cropping recalculated at preview/post time
 * - Transform params stored and re-applied later
 * - Feed cards applied transforms again
 * 
 * 🔐 INVARIANT ENFORCEMENT:
 * - Original image URIs are ILLEGAL after crop completion
 * - Only finalUri (exported bitmap) is used for preview/upload
 * - Navigation forward is BLOCKED unless all images are finalized
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import ImagePicker from 'react-native-image-crop-picker';
import { useColorScheme } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { navigateToScreen } from '../../utils/navigationHelpers';
import { exportFinalBitmap } from '../../utils/cropUtils';
import {
  getCropBoxDimensions,
  calculateMinScale,
  calculateFitScale,
  getImageTransform,
  clampTranslation,
} from '../../utils/cropMath';
import {
  assertIsFinalizedBitmap,
  assertAllImagesFinalized,
  sanitizeFinalMedia,
  logInvariantCheck,
} from '../../utils/imagePipelineInvariants';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { useCreateFlowStore } from '../../store/stores/useCreateFlowStore'; // 🔐 USE STORE

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_PADDING = 20;
const MAX_ITEMS = 5;

type AspectRatio = '1:1' | '4:5' | '16:9';

interface CropData {
  id: string;
  finalUri: string; // The actual cropped bitmap file
  ratio: AspectRatio;
  cropData: {
    ratio: AspectRatio;
    zoomScale: number;
    offsetX: number;
    offsetY: number;
    frameWidth: number;
    frameHeight: number;
  };
  type: 'image' | 'video';
}

interface CropAdjustScreenProps {
  navigation: any;
  route: {
    params: {
      contentType?: 'post' | 'reel';
      selectedImages?: Array<{
        uri: string;
        width?: number;
        height?: number;
        id: string;
        createdAt?: number;
        type?: 'image' | 'video';
      }>;
      imageUri?: string;
      currentImageIndex?: number;
      allowMultiple?: boolean;
      croppedMedia?: CropData[];
      lockedRatio?: AspectRatio; // NEW: Locked ratio from PhotoSelectScreen (Instagram-style)
    };
  };
}

export default function CropAdjustScreen({ navigation, route }: CropAdjustScreenProps) {
  const { selectedImages = [], contentType = 'post', currentImageIndex = 0, lockedRatio } = route.params;
  const { updateAsset, updateCropParams } = useCreateFlowStore();
  const theme = useColorScheme();
  const isDark = theme === 'dark';

  // Theme-aware colors
  const bgColor = isDark ? Colors.black.primary : Colors.white.primary;
  const textColor = isDark ? Colors.white.primary : Colors.black.primary;
  const subTextColor = isDark ? Colors.white.secondary : Colors.black.qua;

  // Validate max items
  useEffect(() => {
    if (selectedImages.length > MAX_ITEMS) {
      Alert.alert('Too Many Items', `You can only select up to ${MAX_ITEMS} items. Please select fewer.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [selectedImages.length]);

  // INSTAGRAM LOGIC: Use locked ratio from PhotoSelectScreen (one ratio per post)
  // If no locked ratio provided, default based on contentType
  const defaultRatio: AspectRatio = lockedRatio || (contentType === 'post' ? '4:5' : '16:9');

  const [currentIndex, setCurrentIndex] = useState(currentImageIndex);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(defaultRatio);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [savedCrops, setSavedCrops] = useState<CropData[]>([]);

  // INSTAGRAM LOGIC: Lock ratio - prevent changing it (all images in post use same ratio)
  // If lockedRatio is provided, aspect ratio cannot be changed
  const isRatioLocked = !!lockedRatio;

  // CRITICAL: Use ONLY final cropped bitmaps when editing existing crops
  // For new crops, use original image URI (will be replaced with final bitmap after export)
  const currentImage = selectedImages[currentIndex];
  // Check store for existing crops by ID
  const existingCrop = savedCrops[currentIndex];

  // 🔐 INVARIANT ENFORCEMENT: If editing existing crop, ONLY finalUri is allowed
  // Fallback chains (currentImage?.uri, route.params.imageUri) are FORBIDDEN after crop completion
  let currentImageUri: string;

  if (existingCrop?.finalUri) {
    // Editing existing crop - MUST use finalUri only
    currentImageUri = existingCrop.finalUri;

    // 🔐 INVARIANT CHECK: Validate that we're not accidentally using an original URI
    if (__DEV__) {
      assertIsFinalizedBitmap(
        currentImageUri,
        `CropAdjustScreen.preview[existingCrop ${currentIndex}]`
      );
      logInvariantCheck(
        `CropAdjustScreen.preview[${currentIndex}]`,
        true,
        `Using finalUri for existing crop`
      );
    }
  } else {
    // New crop - use original image URI (will be exported to final bitmap on "Next")
    // This is the ONLY place where original URIs are allowed (before first export)
    currentImageUri = currentImage?.uri || route.params.imageUri || '';

    if (__DEV__ && currentImageUri) {
      logInvariantCheck(
        `CropAdjustScreen.preview[${currentIndex}]`,
        true,
        `Using original URI for NEW crop (will be finalized on Next)`
      );
    }
  }

  // Calculate frame dimensions based on aspect ratio
  const getFrameDimensions = (ratio: AspectRatio) => {
    const availableWidth = SCREEN_WIDTH - FRAME_PADDING * 2;
    const availableHeight = SCREEN_HEIGHT - 300; // Space for header, tabs, and controls

    let frameWidth: number;
    let frameHeight: number;

    switch (ratio) {
      case '1:1':
        frameWidth = Math.min(availableWidth, availableHeight);
        frameHeight = frameWidth;
        break;
      case '4:5':
        frameWidth = Math.min(availableWidth, (availableHeight * 4) / 5);
        frameHeight = (frameWidth * 5) / 4;
        break;
      case '16:9':
        frameWidth = Math.min(availableWidth, (availableHeight * 16) / 9);
        frameHeight = (frameWidth * 9) / 16;
        break;
    }

    return { frameWidth, frameHeight };
  };

  const { frameWidth, frameHeight } = getFrameDimensions(aspectRatio);

  // Transform values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Load current image
  useEffect(() => {
    if (!currentImageUri) return;

    setLoading(true);
    Image.getSize(
      currentImageUri,
      (width, height) => {
        setImageSize({ width, height });

        // If editing existing crop, restore previous transform values
        if (existingCrop) {
          const prevCrop = existingCrop.cropData;
          savedScale.value = prevCrop.zoomScale;
          scale.value = prevCrop.zoomScale;
          savedTranslateX.value = prevCrop.offsetX;
          translateX.value = prevCrop.offsetX;
          savedTranslateY.value = prevCrop.offsetY;
          translateY.value = prevCrop.offsetY;
          setAspectRatio(prevCrop.ratio);
        } else {
          // 🔐 FIX 1: Default zoom = Fit (No unwanted zoom on entry)
          // fully visible, centered
          const fitScale = calculateFitScale(
            width,
            height,
            frameWidth,
            frameHeight
          );

          savedScale.value = fitScale;
          scale.value = fitScale;
          translateX.value = 0;
          translateY.value = 0;
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error getting image size:', error);
        Alert.alert('Error', 'Failed to load image');
        setLoading(false);
      }
    );
  }, [currentImageUri, frameWidth, frameHeight]);

  // Update scale when aspect ratio changes
  useEffect(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return;
    if (existingCrop) return; // Don't auto-adjust if editing existing crop

    // 🔐 FIX 1: Prevent auto-scale when ratio changes
    // Maintain scale = 1 or user-defined scale
    const newScale = savedScale.value;

    // Maintain position if possible, otherwise center
    const scaledWidth = imageSize.width * newScale;
    const scaledHeight = imageSize.height * newScale;

    if (scaledWidth < frameWidth || scaledHeight < frameHeight) {
      // If image is too small for the new frame, center it
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }

    savedScale.value = newScale;
    scale.value = newScale;
  }, [aspectRatio, frameWidth, frameHeight]);

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      // Constrain to bounds
      const scaledWidth = imageSize.width * scale.value;
      const scaledHeight = imageSize.height * scale.value;

      const maxTranslateX = Math.max(0, (scaledWidth - frameWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledHeight - frameHeight) / 2);

      translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
      translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      // Minimum scale to cover frame
      const minScale = Math.max(
        frameWidth / imageSize.width,
        frameHeight / imageSize.height
      );
      scale.value = Math.max(minScale, newScale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;

      // Re-constrain position after zoom
      const scaledWidth = imageSize.width * scale.value;
      const scaledHeight = imageSize.height * scale.value;

      const maxTranslateX = Math.max(0, (scaledWidth - frameWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledHeight - frameHeight) / 2);

      translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
      translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combined gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated image style
  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scaledWidth = imageSize.width * scale.value;
    const scaledHeight = imageSize.height * scale.value;

    const maxTranslateX = Math.max(0, (scaledWidth - frameWidth) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - frameHeight) / 2);

    const constrainedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
    const constrainedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));

    return {
      transform: [
        { translateX: constrainedX },
        { translateY: constrainedY },
        { scale: scale.value },
      ],
    };
  });

  // Animated frame style
  const frameAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(frameWidth),
      height: withSpring(frameHeight),
    };
  });

  const handleRatioChange = (ratio: AspectRatio) => {
    // INSTAGRAM LOGIC: If ratio is locked, don't allow changes
    if (isRatioLocked) {
      console.log('🔒 [CropAdjustScreen] Ratio is locked, cannot change');
      return;
    }
    setAspectRatio(ratio);
  };

  // Actual bitmap cropping function using react-native-image-crop-picker
  // This opens the native crop UI with the selected aspect ratio
  const performRealCrop = async (): Promise<string> => {
    if (!imageSize.width || !imageSize.height) {
      throw new Error('Image not loaded');
    }

    // Get output dimensions based on aspect ratio
    let outputWidth: number;
    let outputHeight: number;
    let cropAspectRatio: number;

    switch (aspectRatio) {
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
    }

    // Prepare image URI
    let imageUri = currentImageUri;
    if (Platform.OS === 'android' && imageUri.startsWith('file://')) {
      imageUri = imageUri.replace('file://', '');
    }
    if (Platform.OS === 'ios' && imageUri.startsWith('file://')) {
      imageUri = imageUri.replace('file://', '');
    }

    try {
      // Check if ImagePicker is available (native module linked)
      if (!ImagePicker || typeof ImagePicker.openCropper !== 'function') {
        console.warn('ImagePicker native module not available. Using original URI.');
        return currentImageUri;
      }

      // Use react-native-image-crop-picker to perform actual bitmap cropping
      // This library handles native module linking automatically
      // NOTE: This function is legacy - main flow now uses exportFinalBitmap
      const croppedImage = await ImagePicker.openCropper({
        path: imageUri,
        width: outputWidth,
        height: outputHeight,
        cropping: true,
        mediaType: 'photo',
        cropperToolbarTitle: 'Crop Image',
        cropperChooseText: 'Done',
        cropperCancelText: 'Cancel',
        compressImageQuality: 0.9,
        freeStyleCropEnabled: false,
        cropperActiveWidgetColor: '#FF7F4D',
        cropperStatusBarColor: '#FF7F4D',
        cropperToolbarColor: '#FF7F4D',
        cropperCircleOverlay: aspectRatio === '1:1',
        cropperToolbarWidgetColor: '#FFFFFF',
        showCropGuidelines: true,
        hideBottomControls: false,
        enableRotationGesture: false,
      });

      return croppedImage.path;
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error.message?.includes('cancel') || error.message?.includes('User cancelled') || error.code === 'E_PICKER_CANCELLED') {
        // User cancelled - return original URI
        return currentImageUri;
      }

      // iOS safe mode: If cropping fails (e.g., native module not linked), fallback to original
      if (Platform.OS === 'ios') {
        console.warn('ImagePicker crop failed on iOS (native module may not be linked). Using original URI. Run: cd ios && pod install');
        return currentImageUri;
      }

      // Android: Log error but still try to return original as fallback
      console.error('Crop error:', error);
      // Don't show alert on every error - just log and fallback
      return currentImageUri;
    }
  };

  const handleNext = async () => {
    if (!imageSize.width || !imageSize.height) {
      Alert.alert('Error', 'Image not loaded yet');
      return;
    }

    setCropping(true);

    try {
      // INSTAGRAM LOGIC: Save crop parameters and generate final bitmap IMMEDIATELY
      // This ensures we have a final rendered bitmap before moving to next screen
      const cropData: CropData = {
        id: currentImage?.id || currentImageUri,
        finalUri: currentImageUri, // Temporary - will be replaced with exported bitmap
        ratio: aspectRatio, // Use locked ratio (same for all images)
        cropData: {
          ratio: aspectRatio,
          zoomScale: scale.value,
          offsetX: translateX.value,
          offsetY: translateY.value,
          frameWidth,
          frameHeight,
        },
        type: currentImage?.type || 'image',
      };

      const updatedCrops = [...savedCrops];
      updatedCrops[currentIndex] = cropData;
      setSavedCrops(updatedCrops);

      // INSTAGRAM LOGIC: Generate final bitmap IMMEDIATELY for current image
      console.log(`🖼️ [CropAdjustScreen] Generating final bitmap for image ${currentIndex + 1}/${selectedImages.length}...`);

      const originalImage = selectedImages[currentIndex];
      if (!originalImage) {
        throw new Error('Original image not found');
      }

      // CRITICAL: Export final cropped bitmap from original image
      // After this, originalImage.uri is NEVER used again - only croppedBitmapPath
      const croppedBitmapPath = await exportFinalBitmap({
        imageUri: originalImage.uri, // Use original image URI for export (last time it's used)
        cropParams: {
          zoom: cropData.cropData.zoomScale,
          offsetX: cropData.cropData.offsetX,
          offsetY: cropData.cropData.offsetY,
        },
        frameWidth: cropData.cropData.frameWidth,
        frameHeight: cropData.cropData.frameHeight,
        ratio: cropData.ratio, // Use locked ratio
      });

      // After export, croppedBitmapPath is the ONLY image URI used going forward
      // originalImage.uri is NEVER used again in the pipeline

      console.log(`✅ [CropAdjustScreen] Bitmap ${currentIndex + 1} generated:`, croppedBitmapPath.substring(0, 50) + '...');

      // 🔐 INVARIANT ENFORCEMENT: Validate that exported bitmap is valid
      assertIsFinalizedBitmap(
        croppedBitmapPath,
        `CropAdjustScreen.handleNext[image ${currentIndex + 1}/${selectedImages.length}]`
      );

      // 🔐 FIX 4: Update STORE with finalUri (One source of truth)
      if (originalImage?.id) {
        updateAsset(originalImage.id, { finalUri: croppedBitmapPath });
        updateCropParams(originalImage.id, {
          zoom: cropData.cropData.zoomScale,
          offsetX: cropData.cropData.offsetX,
          offsetY: cropData.cropData.offsetY,
        });
      }

      // Update saved crop state
      updatedCrops[currentIndex] = {
        ...cropData,
        finalUri: croppedBitmapPath,
      };
      setSavedCrops(updatedCrops);

      // Check if there are more images to process
      if (currentIndex < selectedImages.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCropping(false);
        translateX.value = 0;
        translateY.value = 0;
        scale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        savedScale.value = 1;
      } else {
        console.log('✅ [CropAdjustScreen] All final bitmaps generated, navigating to AddDetails...');

        // 🔐 INVARIANT ENFORCEMENT: Validate ALL images before navigation
        assertAllImagesFinalized(
          updatedCrops,
          selectedImages.length,
          'CropAdjustScreen.handleNext.beforeNavigation'
        );

        setCropping(false);

        // 🔐 FIX 4: Navigate to AddDetails (Correct screen name from AppNavigator)
        navigateToScreen(navigation, 'AddDetails', {
          croppedMedia: updatedCrops,
          contentType: contentType,
        });
      }
    } catch (error: any) {
      setCropping(false);
      console.error('❌ [CropAdjustScreen] Error in handleNext:', error);

      // In development, show detailed error for invariant violations
      if (__DEV__ && error.message?.includes('INVARIANT VIOLATION')) {
        Alert.alert(
          'Development Error: Invariant Violation',
          error.message,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to process image');
      }
    }
  };

  const canProceed = imageSize.width > 0 && imageSize.height > 0 && !cropping;
  const progressText = selectedImages.length > 1
    ? `${currentIndex + 1} / ${selectedImages.length}`
    : '';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenLayout scrollable={false} includeBottomInset={false} backgroundColor={bgColor}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: bgColor }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: Fonts.medium, color: textColor }]}>Adjust {progressText}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleNext}
            disabled={!canProceed}
          >
            {cropping ? (
              <ActivityIndicator size="small" color={Colors.brand.primary} />
            ) : (
              <Text style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}>
                {currentIndex < selectedImages.length - 1 ? 'Next' : 'Done'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Crop Area */}
        <View style={[styles.cropContainer, { backgroundColor: bgColor }]}>
          {loading || cropping ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={textColor} />
              {cropping && <Text style={[styles.croppingText, { color: subTextColor }]}>Processing image...</Text>}
            </View>
          ) : (
            <>
              <View style={styles.cropArea}>
                <View style={styles.cropAreaInner}>
                  <Animated.View
                    style={[styles.frameContainer, frameAnimatedStyle]}
                  >
                    <GestureDetector gesture={composedGesture}>
                      <Animated.View style={styles.imageContainer}>
                        {imageSize.width > 0 && (
                          <Animated.Image
                            source={{ uri: currentImageUri }}
                            style={[
                              {
                                width: imageSize.width,
                                height: imageSize.height,
                              },
                              imageAnimatedStyle,
                            ]}
                            resizeMode="contain"
                          />
                        )}
                      </Animated.View>
                    </GestureDetector>
                  </Animated.View>
                  {/* Crop Overlay */}
                  <View style={styles.overlay} pointerEvents="none">
                    <View style={styles.overlayTop} />
                    <View style={styles.overlayMiddle}>
                      <View style={styles.overlayLeft} />
                      <Animated.View style={[styles.cropFrame, frameAnimatedStyle]} />
                      <View style={styles.overlayRight} />
                    </View>
                    <View style={styles.overlayBottom} />
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Ratio Selector - Disabled if ratio is locked (Instagram-style) */}
        <View style={[styles.ratioContainer, { backgroundColor: bgColor }]}>
          {(['1:1', '4:5', '16:9'] as AspectRatio[]).map((ratio) => (
            <TouchableOpacity
              key={ratio}
              style={[
                styles.ratioButton,
                aspectRatio === ratio && styles.ratioButtonActive,
                isRatioLocked && styles.ratioButtonLocked, // Visual indicator when locked
                { backgroundColor: aspectRatio === ratio ? Colors.brand.primary : isDark ? Colors.black.secondary : Colors.white.tertiary }
              ]}
              onPress={() => handleRatioChange(ratio)}
              disabled={isRatioLocked} // Disable if locked
            >
              <Text
                style={[
                  styles.ratioText,
                  aspectRatio === ratio && styles.ratioTextActive,
                  isRatioLocked && aspectRatio !== ratio && styles.ratioTextLocked,
                  { color: aspectRatio === ratio ? Colors.white.primary : textColor }
                ]}
              >
                {ratio}
              </Text>
            </TouchableOpacity>
          ))}
          {isRatioLocked && (
            <Text style={[styles.lockedRatioHint, { color: subTextColor }]}>
              Ratio locked for all images
            </Text>
          )}
        </View>
      </ScreenLayout>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.black.primary,
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: Fonts.medium,
    fontSize: 18,
    color: Colors.white.primary,
  },
  nextButton: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.brand.primary,
  },
  nextButtonDisabled: {
    opacity: 0.5,
    color: Colors.white.secondary,
  },
  cropContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  croppingText: {
    marginTop: 12,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.white.secondary,
  },
  cropArea: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cropAreaInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  frameContainer: {
    position: 'absolute',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  overlayLeft: {
    width: FRAME_PADDING,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cropFrame: {
    borderWidth: 2,
    borderColor: Colors.white.primary,
  },
  overlayRight: {
    width: FRAME_PADDING,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  ratioContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: Colors.black.primary,
  },
  ratioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratioButtonActive: {
    backgroundColor: '#FF7F4D',
  },
  ratioText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.black.primary,
  },
  ratioTextActive: {
    color: Colors.white.primary,
  },
  ratioButtonLocked: {
    opacity: 0.6, // Visual indicator when locked
  },
  ratioTextLocked: {
    opacity: 0.5,
  },
  lockedRatioHint: {
    marginTop: 8,
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.white.secondary,
    textAlign: 'center',
  },
});
