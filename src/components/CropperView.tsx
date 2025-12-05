import React, { memo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CropperViewProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  initialZoom?: number;
  initialOffsetX?: number;
  initialOffsetY?: number;
  onZoomChange?: (zoom: number) => void;
  onOffsetChange?: (offsetX: number, offsetY: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

const CropperView = memo<CropperViewProps>(({
  imageUri,
  imageWidth,
  imageHeight,
  frameWidth,
  frameHeight,
  initialZoom = 1,
  initialOffsetX = 0,
  initialOffsetY = 0,
  onZoomChange,
  onOffsetChange,
  minZoom = 1,
  maxZoom = 5,
}) => {
  const translateX = useSharedValue(initialOffsetX);
  const translateY = useSharedValue(initialOffsetY);
  const scale = useSharedValue(initialZoom);
  const savedTranslateX = useSharedValue(initialOffsetX);
  const savedTranslateY = useSharedValue(initialOffsetY);
  const savedScale = useSharedValue(initialZoom);

  // Update shared values when props change
  useEffect(() => {
    scale.value = initialZoom;
    savedScale.value = initialZoom;
    translateX.value = initialOffsetX;
    translateY.value = initialOffsetY;
    savedTranslateX.value = initialOffsetX;
    savedTranslateY.value = initialOffsetY;
  }, [initialZoom, initialOffsetX, initialOffsetY]);

  // Calculate minimum scale to fill frame
  const minScaleToFill = Math.max(
    frameWidth / imageWidth,
    frameHeight / imageHeight
  );

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      // Constrain to bounds
      const scaledWidth = imageWidth * scale.value;
      const scaledHeight = imageHeight * scale.value;

      const maxTranslateX = Math.max(0, (scaledWidth - frameWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledHeight - frameHeight) / 2);

      translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
      translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;

      if (onOffsetChange) {
        runOnJS(onOffsetChange)(translateX.value, translateY.value);
      }
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      const constrainedScale = Math.max(minScaleToFill, Math.min(maxZoom, newScale));
      scale.value = constrainedScale;
      
      if (onZoomChange) {
        runOnJS(onZoomChange)(constrainedScale);
      }
    })
    .onEnd(() => {
      savedScale.value = scale.value;

      // Re-constrain position after zoom
      const scaledWidth = imageWidth * scale.value;
      const scaledHeight = imageHeight * scale.value;

      const maxTranslateX = Math.max(0, (scaledWidth - frameWidth) / 2);
      const maxTranslateY = Math.max(0, (scaledHeight - frameHeight) / 2);

      translateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value));
      translateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value));

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;

      if (onOffsetChange) {
        runOnJS(onOffsetChange)(translateX.value, translateY.value);
      }
    });

  // Combined gestures
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Animated image style
  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scaledWidth = imageWidth * scale.value;
    const scaledHeight = imageHeight * scale.value;

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

  if (imageWidth === 0 || imageHeight === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.cropArea}>
        <Animated.View style={[styles.frameContainer, frameAnimatedStyle]}>
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
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.imageUri === nextProps.imageUri &&
    prevProps.imageWidth === nextProps.imageWidth &&
    prevProps.imageHeight === nextProps.imageHeight &&
    prevProps.frameWidth === nextProps.frameWidth &&
    prevProps.frameHeight === nextProps.frameHeight &&
    prevProps.initialZoom === nextProps.initialZoom &&
    prevProps.initialOffsetX === nextProps.initialOffsetX &&
    prevProps.initialOffsetY === nextProps.initialOffsetY
  );
});

CropperView.displayName = 'CropperView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black.primary,
  },
  cropArea: {
    width: SCREEN_WIDTH,
    flex: 1,
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

export default CropperView;

