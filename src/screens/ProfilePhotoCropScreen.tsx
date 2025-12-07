/**
 * Profile Photo Crop Screen
 * Instagram-style crop/adjust screen for profile photos
 * Uses rectangular ratio matching profile photo box (100x130)
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
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { exportProfilePhotoBitmap, PROFILE_PHOTO_ASPECT_RATIO, PROFILE_PHOTO_WIDTH, PROFILE_PHOTO_HEIGHT } from '../utils/profilePhotoCropUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_PADDING = 20;

interface ProfilePhotoCropScreenProps {
  navigation: any;
  route: {
    params: {
      imageUri: string;
    };
  };
}

export default function ProfilePhotoCropScreen({ navigation, route }: ProfilePhotoCropScreenProps) {
  const { imageUri } = route.params;

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [cropping, setCropping] = useState(false);

  // Calculate frame dimensions based on profile photo aspect ratio
  const getFrameDimensions = () => {
    const availableWidth = SCREEN_WIDTH - FRAME_PADDING * 2;
    const availableHeight = SCREEN_HEIGHT - 300; // Space for header and controls

    // Calculate frame dimensions maintaining profile photo aspect ratio
    let frameWidth: number;
    let frameHeight: number;

    // Try to fit width first
    frameWidth = Math.min(availableWidth, availableHeight * PROFILE_PHOTO_ASPECT_RATIO);
    frameHeight = frameWidth / PROFILE_PHOTO_ASPECT_RATIO;

    // If height exceeds available space, fit to height
    if (frameHeight > availableHeight) {
      frameHeight = availableHeight;
      frameWidth = frameHeight * PROFILE_PHOTO_ASPECT_RATIO;
    }

    return { frameWidth, frameHeight };
  };

  const { frameWidth, frameHeight } = getFrameDimensions();

  // Transform values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Load image
  useEffect(() => {
    if (!imageUri) return;

    setLoading(true);
    Image.getSize(
      imageUri,
      (width, height) => {
        setImageSize({ width, height });

        // Calculate initial scale to fill crop area
        const imageAspect = width / height;
        const cropAspect = frameWidth / frameHeight;

        let initialScale: number;
        if (imageAspect > cropAspect) {
          // Image is wider - scale to fit height
          initialScale = frameHeight / height;
        } else {
          // Image is taller - scale to fit width
          initialScale = frameWidth / width;
        }

        // Ensure image covers the frame
        initialScale = Math.max(initialScale, 1);

        savedScale.value = initialScale;
        scale.value = initialScale;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;

        setLoading(false);
      },
      (error) => {
        console.error('Error getting image size:', error);
        Alert.alert('Error', 'Failed to load image');
        setLoading(false);
      }
    );
  }, [imageUri, frameWidth, frameHeight]);

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

  const handleSave = async () => {
    if (!imageSize.width || !imageSize.height) {
      Alert.alert('Error', 'Image not loaded yet');
      return;
    }

    setCropping(true);

    try {
      console.log('🖼️ [ProfilePhotoCropScreen] Generating final profile photo bitmap...');

      // Generate final cropped bitmap
      const finalImageUri = await exportProfilePhotoBitmap({
        imageUri: imageUri,
        cropParams: {
          zoom: scale.value,
          offsetX: translateX.value,
          offsetY: translateY.value,
        },
        frameWidth,
        frameHeight,
      });

      console.log('✅ [ProfilePhotoCropScreen] Profile photo bitmap generated:', finalImageUri.substring(0, 50) + '...');

      // Return final image to EditProfileScreen
      // Navigate back and pass the final image URI
      navigation.navigate('EditProfile', {
        finalProfilePhoto: finalImageUri,
      });
    } catch (error: any) {
      setCropping(false);
      console.error('❌ [ProfilePhotoCropScreen] Error generating bitmap:', error);
      
      // If user cancelled, just go back
      if (error.message?.includes('cancelled') || error.message?.includes('cancel')) {
        navigation.goBack();
        return;
      }
      
      // Even if cropping fails, try to upload the original image
      console.log('⚠️ [ProfilePhotoCropScreen] Cropping failed, using original image for upload');
      try {
        navigation.navigate('EditProfile', {
          finalProfilePhoto: imageUri, // Use original image if cropping fails
        });
      } catch (navError) {
        Alert.alert('Error', error.message || 'Failed to process profile photo', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    }
  };

  const canProceed = imageSize.width > 0 && imageSize.height > 0 && !cropping;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={Colors.white.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: Fonts.medium }]}>Adjust Profile Photo</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleSave}
            disabled={!canProceed}
          >
            {cropping ? (
              <ActivityIndicator size="small" color={Colors.brand.primary} />
            ) : (
              <Text style={[styles.saveButton, !canProceed && styles.saveButtonDisabled]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Crop Area */}
        <View style={styles.cropContainer}>
          {loading || cropping ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.white.primary} />
              {cropping && <Text style={styles.croppingText}>Processing photo...</Text>}
            </View>
          ) : (
            <>
              <View style={styles.cropArea}>
                <View style={styles.cropAreaInner}>
                  <View style={styles.frameWrapper}>
                    <Animated.View
                      style={[styles.frameContainer, frameAnimatedStyle]}
                    >
                      <GestureDetector gesture={composedGesture}>
                        <Animated.View style={styles.imageContainer}>
                          {imageSize.width > 0 && (
                            <Animated.Image
                              source={{ uri: imageUri }}
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
                  </View>
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

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Pinch to zoom • Drag to adjust position
          </Text>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 18,
    color: Colors.white.primary,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
  },
  saveButtonDisabled: {
    color: Colors.white.qua,
    opacity: 0.5,
  },
  cropContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  croppingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.white.primary,
  },
  cropArea: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropAreaInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  frameWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlayLeft: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cropFrame: {
    borderWidth: 2,
    borderColor: Colors.white.primary,
    backgroundColor: 'transparent',
  },
  overlayRight: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  instructionsContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.white.qua,
    textAlign: 'center',
  },
});

