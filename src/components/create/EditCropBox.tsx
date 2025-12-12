import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';
import type { CropParams } from '../../store/stores/useCreateFlowStore';
import { calculateMinScale } from '../../utils/cropMath';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EditCropBoxProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  cropWidth: number;
  cropHeight: number;
  initialParams: CropParams;
  onParamsChange: (params: CropParams) => void;
}

export default function EditCropBox({
  imageUri,
  imageWidth,
  imageHeight,
  cropWidth,
  cropHeight,
  initialParams,
  onParamsChange,
}: EditCropBoxProps) {
  const translateX = useSharedValue(initialParams.offsetX);
  const translateY = useSharedValue(initialParams.offsetY);
  const scale = useSharedValue(initialParams.zoom);
  const savedTranslateX = useSharedValue(initialParams.offsetX);
  const savedTranslateY = useSharedValue(initialParams.offsetY);
  const savedScale = useSharedValue(initialParams.zoom);

  // Update shared values when initialParams change (image switch)
  useEffect(() => {
    translateX.value = initialParams.offsetX;
    translateY.value = initialParams.offsetY;
    scale.value = initialParams.zoom;
    savedTranslateX.value = initialParams.offsetX;
    savedTranslateY.value = initialParams.offsetY;
    savedScale.value = initialParams.zoom;
  }, [initialParams.offsetX, initialParams.offsetY, initialParams.zoom]);

  // Calculate min scale to cover crop box
  const minScale = calculateMinScale(imageWidth, imageHeight, cropWidth, cropHeight);
  const maxScale = 5;

  // Notify parent of param changes
  const notifyParamsChange = useCallback(
    (zoom: number, offsetX: number, offsetY: number) => {
      onParamsChange({ zoom, offsetX, offsetY });
    },
    [onParamsChange]
  );

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      'worklet';
      // Clamp to bounds - inline calculation for worklet
      const scaledWidth = imageWidth * scale.value;
      const scaledHeight = imageHeight * scale.value;
      const maxTranslateX = Math.max(0, (scaledWidth - cropWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledHeight - cropHeight) / 2);
      
      const clampedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
      const clampedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));

      translateX.value = clampedX;
      translateY.value = clampedY;
      savedTranslateX.value = clampedX;
      savedTranslateY.value = clampedY;

      runOnJS(notifyParamsChange)(
        scale.value,
        clampedX,
        clampedY
      );
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.max(minScale, Math.min(maxScale, newScale));
    })
    .onEnd(() => {
      'worklet';
      savedScale.value = scale.value;

      // Re-clamp position after zoom - inline calculation for worklet
      const scaledWidth = imageWidth * scale.value;
      const scaledHeight = imageHeight * scale.value;
      const maxTranslateX = Math.max(0, (scaledWidth - cropWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledHeight - cropHeight) / 2);
      
      const clampedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
      const clampedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));

      translateX.value = clampedX;
      translateY.value = clampedY;
      savedTranslateX.value = clampedX;
      savedTranslateY.value = clampedY;

      runOnJS(notifyParamsChange)(
        scale.value,
        clampedX,
        clampedY
      );
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      // Reset to min scale and center
      scale.value = withSpring(minScale);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = minScale;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;

      runOnJS(notifyParamsChange)(minScale, 0, 0);
    });

  // Combined gestures
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    Gesture.Simultaneous(pinchGesture, doubleTapGesture)
  );

  // Animated image style
  const imageAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Inline clamping calculation for worklet
    const scaledWidth = imageWidth * scale.value;
    const scaledHeight = imageHeight * scale.value;
    const maxTranslateX = Math.max(0, (scaledWidth - cropWidth) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - cropHeight) / 2);
    
    const clampedX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
    const clampedY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));

    return {
      transform: [
        { translateX: clampedX },
        { translateY: clampedY },
        { scale: scale.value },
      ],
    };
  });

  if (imageWidth === 0 || imageHeight === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { width: cropWidth, height: cropHeight }]}>
      <View style={styles.cropArea}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.imageContainer}>
            <Animated.Image
              source={{ uri: imageUri }}
              style={[
                {
                  width: imageWidth,
                  height: imageHeight,
                },
                imageAnimatedStyle,
              ]}
              resizeMode="contain"
            />
          </Animated.View>
        </GestureDetector>
      </View>
      {/* Crop overlay */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlayLeft} />
          <View style={[styles.cropFrame, { width: cropWidth, height: cropHeight }]} />
          <View style={styles.overlayRight} />
        </View>
        <View style={styles.overlayBottom} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropArea: {
    width: '100%',
    height: '100%',
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
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cropFrame: {
    borderWidth: 2,
    borderColor: Colors.white.primary,
  },
  overlayRight: {
    flex: 1,
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
});

