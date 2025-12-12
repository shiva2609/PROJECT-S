import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { navigateToScreen } from '../../utils/navigationHelpers';
import CropperView from '../../components/create/CropperView';
import { useCropState } from '../../hooks/useCropState';
import { performNativeCrop } from '../../utils/cropUtils';
import type { AspectRatio } from '../../hooks/useCropState';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_PADDING = 20;

interface Asset {
  uri: string;
  width?: number;
  height?: number;
  id: string;
  createdAt?: number;
}

interface CropScreenProps {
  navigation: any;
  route: {
    params: {
      assets: Asset[];
      index: number;
      ratio: AspectRatio;
      ratios?: { [key: string]: AspectRatio };
    };
  };
}

export default function CropScreen({ navigation, route }: CropScreenProps) {
  const { assets, index, ratio, ratios: initialRatios = {} } = route.params;
  const { saveCropParams, getCropParams } = useCropState();

  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [cropping, setCropping] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const currentAsset = assets[index];
  const currentImageUri = currentAsset?.uri || '';

  // Calculate frame dimensions based on aspect ratio
  const getFrameDimensions = useCallback((ratio: AspectRatio) => {
    const availableWidth = SCREEN_WIDTH - FRAME_PADDING * 2;
    const availableHeight = SCREEN_HEIGHT - 350; // Space for header, slider, and controls

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
  }, []);

  const { frameWidth, frameHeight } = getFrameDimensions(ratio);

  // Load current image and restore crop params if available
  useEffect(() => {
    if (!currentImageUri) return;

    setLoading(true);
    Image.getSize(
      currentImageUri,
      (width, height) => {
        setImageSize({ width, height });

        // Restore saved crop params if available
        const savedParams = getCropParams(currentAsset.id);
        if (savedParams) {
          setZoom(savedParams.zoom);
          setOffsetX(savedParams.offsetX);
          setOffsetY(savedParams.offsetY);
        } else {
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
          setZoom(initialScale);
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error getting image size:', error);
        Alert.alert('Error', 'Failed to load image');
        setLoading(false);
      }
    );
  }, [currentImageUri, currentAsset.id, frameWidth, frameHeight, getCropParams]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleOffsetChange = useCallback((newOffsetX: number, newOffsetY: number) => {
    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);
  }, []);

  const handleZoomIn = useCallback(() => {
    const minZoom = Math.max(
      frameWidth / imageSize.width,
      frameHeight / imageSize.height
    );
    const maxZoom = 5;
    const step = (maxZoom - minZoom) / 10;
    setZoom((prev) => Math.min(maxZoom, prev + step));
  }, [frameWidth, frameHeight, imageSize]);

  const handleZoomOut = useCallback(() => {
    const minZoom = Math.max(
      frameWidth / imageSize.width,
      frameHeight / imageSize.height
    );
    const step = (5 - minZoom) / 10;
    setZoom((prev) => Math.max(minZoom, prev - step));
  }, [frameWidth, frameHeight, imageSize]);

  const handleDone = useCallback(async () => {
    if (!imageSize.width || !imageSize.height) {
      Alert.alert('Error', 'Image not loaded yet');
      return;
    }

    setCropping(true);

    try {
      // Save crop params to state
      saveCropParams(currentAsset.id, {
        zoom,
        offsetX,
        offsetY,
        ratio,
      });

      // Perform native crop
      const croppedUri = await performNativeCrop({
        uri: currentImageUri,
        zoom,
        offsetX,
        offsetY,
        cropWidth: frameWidth,
        cropHeight: frameHeight,
        targetRatio: ratio,
      });

      // Check if there are more images to process
      if (index < assets.length - 1) {
        // Move to next AdjustScreen item
        setCropping(false);
        navigateToScreen(navigation, 'Adjust', {
          assets,
          index: index + 1,
          ratios: { ...initialRatios, [currentAsset.id]: ratio },
        });
      } else {
        // All images processed, perform final cropping for all
        setCropping(false);

        // Collect all crop params and perform cropping
        const finalImages: string[] = [];
        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i];
          const savedParams = getCropParams(asset.id);
          const assetRatio = initialRatios[asset.id] || ratio;

          if (savedParams) {
            // Calculate frame dimensions for this ratio
            const availableWidth = SCREEN_WIDTH - FRAME_PADDING * 2;
            const availableHeight = SCREEN_HEIGHT - 350;
            let fw: number;
            let fh: number;
            switch (assetRatio) {
              case '1:1':
                fw = Math.min(availableWidth, availableHeight);
                fh = fw;
                break;
              case '4:5':
                fw = Math.min(availableWidth, (availableHeight * 4) / 5);
                fh = (fw * 5) / 4;
                break;
              case '16:9':
                fw = Math.min(availableWidth, (availableHeight * 16) / 9);
                fh = (fw * 9) / 16;
                break;
            }
            const finalCroppedUri = await performNativeCrop({
              uri: asset.uri,
              zoom: savedParams.zoom,
              offsetX: savedParams.offsetX,
              offsetY: savedParams.offsetY,
              cropWidth: fw,
              cropHeight: fh,
              targetRatio: assetRatio,
            });
            finalImages.push(finalCroppedUri);
          } else {
            // Use current crop for last image
            if (i === index) {
              finalImages.push(croppedUri);
            } else {
              finalImages.push(asset.uri);
            }
          }
        }

        // Navigate to AddDetailsScreen with final cropped images
        navigateToScreen(navigation, 'AddDetails', {
          finalImages,
        });
      }
    } catch (error: any) {
      setCropping(false);
      console.error('Error cropping image:', error);
      Alert.alert('Error', error.message || 'Failed to crop image');
    }
  }, [
    imageSize,
    currentAsset,
    zoom,
    offsetX,
    offsetY,
    ratio,
    frameWidth,
    frameHeight,
    index,
    assets,
    initialRatios,
    saveCropParams,
    getCropParams,
    navigation,
    currentImageUri,
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const progressText = assets.length > 1 ? `Crop ${index + 1} / ${assets.length}` : 'Crop';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
          >
            <Icon name="arrow-back" size={24} color={Colors.white.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontFamily: Fonts.medium }]}>{progressText}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDone}
            disabled={!imageSize.width || !imageSize.height || cropping}
          >
            {cropping ? (
              <ActivityIndicator size="small" color={Colors.brand.primary} />
            ) : (
              <Text style={[styles.doneButton, (!imageSize.width || !imageSize.height) && styles.doneButtonDisabled]}>
                Done
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Crop Area */}
        {loading || cropping ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.white.primary} />
            {cropping && <Text style={styles.croppingText}>Processing image...</Text>}
          </View>
        ) : (
          <CropperView
            imageUri={currentImageUri}
            imageWidth={imageSize.width}
            imageHeight={imageSize.height}
            frameWidth={frameWidth}
            frameHeight={frameHeight}
            initialZoom={zoom}
            initialOffsetX={offsetX}
            initialOffsetY={offsetY}
            onZoomChange={handleZoomChange}
            onOffsetChange={handleOffsetChange}
            minZoom={Math.max(frameWidth / imageSize.width, frameHeight / imageSize.height)}
            maxZoom={5}
          />
        )}

        {/* Zoom Controls */}
        {!loading && !cropping && imageSize.width > 0 && (
          <View style={styles.zoomContainer}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <Icon name="remove-outline" size={24} color={Colors.white.primary} />
            </TouchableOpacity>
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomText}>
                {Math.round(((zoom - Math.max(frameWidth / imageSize.width, frameHeight / imageSize.height)) / (5 - Math.max(frameWidth / imageSize.width, frameHeight / imageSize.height))) * 100)}%
              </Text>
            </View>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <Icon name="add-outline" size={24} color={Colors.white.primary} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black.primary,
  },
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
  doneButton: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.brand.primary,
  },
  doneButtonDisabled: {
    opacity: 0.5,
    color: Colors.white.secondary,
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
  zoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.black.primary,
    gap: 16,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomIndicator: {
    minWidth: 60,
    alignItems: 'center',
  },
  zoomText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.white.primary,
  },
});

