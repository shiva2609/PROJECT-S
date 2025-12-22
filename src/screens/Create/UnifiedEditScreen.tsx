import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import { useColorScheme } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { navigateToScreen } from '../../utils/navigationHelpers';
import { useCreateFlowStore, type AspectRatio } from '../../store/stores/useCreateFlowStore';
import EditCropBox from '../../components/create/EditCropBox';
import { getCropBoxDimensions, calculateMinScale, calculateFitScale, getImageTransform } from '../../utils/cropMath';
import { exportFinalBitmap } from '../../utils/cropUtils'; // 🔐 EXPORT UTIL
import { validateFinalMediaArray } from '../../utils/imagePipelineInvariants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_SIZE = 60;
const THUMBNAIL_SPACING = 8;
const FEED_PREVIEW_HEIGHT = 200;

export default function UnifiedEditScreen({ navigation }: any) {
  const {
    selectedImages,
    globalRatio,
    cropParams,
    setGlobalRatio,
    updateCropParams,
    updateAsset,
  } = useCreateFlowStore();

  const theme = useColorScheme();
  const isDark = theme === 'dark';

  // Theme-aware colors
  const bgColor = isDark ? Colors.black.primary : Colors.white.primary;
  const textColor = isDark ? Colors.white.primary : Colors.black.primary;
  const subTextColor = isDark ? Colors.white.secondary : Colors.black.qua;
  const overlayColor = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageSizes, setImageSizes] = useState<{ [id: string]: { width: number; height: number } }>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false); // 🔐 EXPORTING STATE
  const [sliderValue, setSliderValue] = useState(0);

  const currentAsset = selectedImages[currentIndex];
  const cropBoxDimensions = getCropBoxDimensions(globalRatio);

  // Load image sizes
  useEffect(() => {
    if (selectedImages.length === 0) {
      navigation.goBack();
      return;
    }

    const loadSizes = async () => {
      const sizes: { [id: string]: { width: number; height: number } } = {};

      for (const asset of selectedImages) {
        try {
          await new Promise<void>((resolve) => {
            Image.getSize(
              asset.uri,
              (width, height) => {
                sizes[asset.id] = { width, height };
                resolve();
              },
              () => {
                sizes[asset.id] = { width: 0, height: 0 };
                resolve();
              }
            );
          });
        } catch (error) {
          sizes[asset.id] = { width: 0, height: 0 };
        }
      }

      setImageSizes(sizes);
      setLoading(false);
    };

    loadSizes();
  }, [selectedImages, navigation]);

  // Initialize crop params for current image if not exists
  useEffect(() => {
    // 🔐 CHECK FOR SENTINEL (zoom === 0)
    if (!currentAsset) return;
    const currentParams = cropParams[currentAsset.id];
    if (currentAsset && (!currentParams || currentParams.zoom === 0)) {
      const size = imageSizes[currentAsset.id];
      if (size && size.width > 0) {
        // 🔐 FIX 1: Default zoom = Fit (No unwanted zoom on entry)
        // Image should be fully visible by default
        const fitScale = calculateFitScale(
          size.width,
          size.height,
          cropBoxDimensions.width,
          cropBoxDimensions.height
        );

        console.log(`🎯 [UnifiedEditScreen] Initializing zoom to fitScale: ${fitScale} for ${currentAsset.id}`);
        updateCropParams(currentAsset.id, {
          zoom: fitScale,
          offsetX: 0,
          offsetY: 0,
        });
      }
    }
  }, [currentAsset, imageSizes, cropParams, updateCropParams, cropBoxDimensions]);

  // Update slider value when crop params change
  useEffect(() => {
    if (currentAsset) {
      const size = imageSizes[currentAsset.id];
      if (size && size.width > 0) {
        const params = cropParams[currentAsset.id] || { zoom: 0, offsetX: 0, offsetY: 0 };

        // 🔐 FIX: Use fitScale as the BASE for the slider
        const fitScale = calculateFitScale(
          size.width,
          size.height,
          cropBoxDimensions.width,
          cropBoxDimensions.height
        );
        const maxScale = Math.max(5, fitScale * 2);

        // If not initialized yet, slider at 0
        if (params.zoom === 0) {
          setSliderValue(0);
          return;
        }

        const normalizedValue = (params.zoom - fitScale) / (maxScale - fitScale);
        setSliderValue(Math.max(0, Math.min(1, normalizedValue)));
      }
    }
  }, [currentAsset, cropParams, imageSizes, cropBoxDimensions]);

  const handleRatioChange = useCallback((ratio: AspectRatio) => {
    setGlobalRatio(ratio);
  }, [setGlobalRatio]);

  const handleCropParamsChange = useCallback((params: { zoom: number; offsetX: number; offsetY: number }) => {
    if (currentAsset) {
      updateCropParams(currentAsset.id, params);
    }
  }, [currentAsset, updateCropParams]);

  const handleSliderChange = useCallback((value: number) => {
    if (!currentAsset) return;

    const size = imageSizes[currentAsset.id];
    if (!size || size.width === 0) return;

    const fitScale = calculateFitScale(
      size.width,
      size.height,
      cropBoxDimensions.width,
      cropBoxDimensions.height
    );
    const maxScale = Math.max(5, fitScale * 2);
    const newZoom = fitScale + (maxScale - fitScale) * value;

    const currentParams = cropParams[currentAsset.id] || { zoom: fitScale, offsetX: 0, offsetY: 0 };
    updateCropParams(currentAsset.id, {
      zoom: newZoom,
      offsetX: currentParams.offsetX,
      offsetY: currentParams.offsetY,
    });
  }, [currentAsset, imageSizes, cropBoxDimensions, cropParams, updateCropParams]);

  const handleNext = useCallback(async () => {
    if (selectedImages.length === 0) return;

    setExporting(true);
    try {
      console.log('🖼️ [UnifiedEditScreen] Exporting all bitmaps before navigation...');

      const updatedMedia = [];

      for (let i = 0; i < selectedImages.length; i++) {
        const asset = selectedImages[i];
        const params = cropParams[asset.id] || { zoom: 1, offsetX: 0, offsetY: 0 };

        const croppedBitmapPath = await exportFinalBitmap({
          imageUri: asset.uri,
          cropParams: params,
          frameWidth: cropBoxDimensions.width,
          frameHeight: cropBoxDimensions.height,
          ratio: globalRatio,
        });

        // Update STORE with finalUri
        updateAsset(asset.id, { finalUri: croppedBitmapPath });

        updatedMedia.push({
          ...asset,
          finalUri: croppedBitmapPath,
          ratio: globalRatio,
          cropData: {
            ratio: globalRatio,
            zoomScale: params.zoom,
            offsetX: params.offsetX,
            offsetY: params.offsetY,
            frameWidth: cropBoxDimensions.width,
            frameHeight: cropBoxDimensions.height,
          },
          type: 'image' as const,
        });
      }

      console.log('✅ [UnifiedEditScreen] All bitmaps exported, navigating to AddDetails...');
      setExporting(false);

      // Navigate to AddDetailsScreen
      navigateToScreen(navigation, 'AddDetails');
    } catch (error: any) {
      setExporting(false);
      console.error('❌ [UnifiedEditScreen] Export error:', error);
      Alert.alert('Error', 'Failed to process images: ' + error.message);
    }
  }, [selectedImages, cropParams, globalRatio, cropBoxDimensions, navigation, updateAsset]);

  const handleThumbnailPress = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Feed Preview Component
  const renderFeedPreview = useCallback(() => {
    // Calculate preview size maintaining aspect ratio
    const previewWidth = Math.min(120, cropBoxDimensions.width * 0.4);
    const previewHeight = (previewWidth / cropBoxDimensions.width) * cropBoxDimensions.height;

    return (
      <View style={styles.feedPreviewContainer}>
        <Text style={[styles.feedPreviewLabel, { color: subTextColor }]}>Feed Preview</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedPreviewList}>
          {selectedImages.map((asset, index) => {
            const size = imageSizes[asset.id];
            const params = cropParams[asset.id] || { zoom: 1, offsetX: 0, offsetY: 0 };

            if (!size || size.width === 0) {
              return (
                <View key={asset.id} style={[styles.feedPreviewItem, { width: previewWidth, height: previewHeight }]}>
                  <ActivityIndicator size="small" color={Colors.white.secondary} />
                </View>
              );
            }

            // 🔐 FIX 3: LIVE PREVIEW MATCHING
            // If finalUri is available, use it (pixel perfect)
            // If not, use original URI with a correctly scaled live transform
            const scaleFactor = previewWidth / cropBoxDimensions.width;

            if (asset.finalUri) {
              return (
                <View key={asset.id} style={[styles.feedPreviewItem, { width: previewWidth, height: previewHeight, backgroundColor: isDark ? Colors.black.secondary : Colors.white.tertiary }]}>
                  <Image
                    source={{ uri: asset.finalUri }}
                    style={{ width: previewWidth, height: previewHeight }}
                    resizeMode="contain"
                  />
                </View>
              );
            }

            // Live transform for thumbnail
            const thumbParams = {
              zoom: params.zoom,
              offsetX: params.offsetX * scaleFactor,
              offsetY: params.offsetY * scaleFactor,
            };

            const thumbTransform = getImageTransform(
              thumbParams,
              size.width * scaleFactor,
              size.height * scaleFactor,
              previewWidth,
              previewHeight
            );

            return (
              <View
                key={asset.id}
                style={[
                  styles.feedPreviewItem,
                  {
                    width: previewWidth,
                    height: previewHeight,
                    backgroundColor: isDark ? Colors.black.secondary : Colors.white.tertiary,
                  },
                ]}
              >
                <View style={[styles.feedPreviewImageContainer, { width: previewWidth, height: previewHeight }]}>
                  <View style={styles.feedPreviewCropBox}>
                    <Image
                      source={{ uri: asset.uri }}
                      style={[
                        {
                          width: size.width * scaleFactor,
                          height: size.height * scaleFactor,
                        },
                        thumbTransform,
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [selectedImages, imageSizes, cropParams, cropBoxDimensions, isDark]);

  if (loading || selectedImages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.white.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const currentSize = imageSizes[currentAsset.id] || { width: 0, height: 0 };
  const currentParams = cropParams[currentAsset.id] || { zoom: 1, offsetX: 0, offsetY: 0 };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        {/* Header - Fixed at top */}
        <View style={[styles.header, { backgroundColor: bgColor }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          {/* Ratio Picker */}
          <View style={styles.ratioPicker}>
            {(['1:1', '4:5', '16:9'] as AspectRatio[]).map((ratio) => (
              <TouchableOpacity
                key={ratio}
                style={[
                  styles.ratioButton,
                  globalRatio === ratio && styles.ratioButtonActive,
                  { backgroundColor: globalRatio === ratio ? Colors.brand.primary : isDark ? Colors.black.secondary : Colors.white.tertiary }
                ]}
                onPress={() => handleRatioChange(ratio)}
              >
                <Text
                  style={[
                    styles.ratioText,
                    globalRatio === ratio && styles.ratioTextActive,
                    { color: globalRatio === ratio ? Colors.white.primary : textColor }
                  ]}
                >
                  {ratio === '1:1' ? 'Square' : ratio === '4:5' ? '4:5' : 'Landscape'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleNext}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={Colors.brand.primary} />
            ) : (
              <Text style={styles.nextButton}>Next</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Scrollable Content Area */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={[styles.scrollContentContainer, { backgroundColor: bgColor }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Crop Area */}
          <View style={[styles.cropContainer, { minHeight: cropBoxDimensions.height, backgroundColor: bgColor }]}>
            {currentSize.width > 0 ? (
              <EditCropBox
                imageUri={currentAsset.uri}
                imageWidth={currentSize.width}
                imageHeight={currentSize.height}
                cropWidth={cropBoxDimensions.width}
                cropHeight={cropBoxDimensions.height}
                initialParams={currentParams}
                onParamsChange={handleCropParamsChange}
              />
            ) : (
              <View style={[styles.cropPlaceholder, { width: cropBoxDimensions.width, height: cropBoxDimensions.height }]}>
                <ActivityIndicator size="large" color={Colors.white.secondary} />
              </View>
            )}
          </View>

          {/* Zoom Slider */}
          {currentSize.width > 0 && (
            <View style={[styles.sliderContainer, { backgroundColor: bgColor }]}>
              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: isDark ? Colors.black.secondary : Colors.white.tertiary }]}
                onPress={() => {
                  const fitScale = calculateFitScale(
                    currentSize.width,
                    currentSize.height,
                    cropBoxDimensions.width,
                    cropBoxDimensions.height
                  );
                  const step = 0.1;
                  const newZoom = Math.max(fitScale, currentParams.zoom - step);
                  updateCropParams(currentAsset.id, {
                    zoom: newZoom,
                    offsetX: currentParams.offsetX,
                    offsetY: currentParams.offsetY,
                  });
                }}
              >
                <Icon name="remove-outline" size={24} color={textColor} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sliderWrapper}
                activeOpacity={1}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  const sliderWidth = SCREEN_WIDTH - 120; // Account for buttons and padding
                  const newValue = Math.max(0, Math.min(1, locationX / sliderWidth));
                  handleSliderChange(newValue);
                }}
              >
                <View style={[styles.sliderTrack, { backgroundColor: isDark ? Colors.black.tertiary : Colors.white.tertiary }]}>
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${sliderValue * 100}%` },
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      { left: `${sliderValue * 100}%` },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.zoomButton, { backgroundColor: isDark ? Colors.black.secondary : Colors.white.tertiary }]}
                onPress={() => {
                  const fitScale = calculateFitScale(
                    currentSize.width,
                    currentSize.height,
                    cropBoxDimensions.width,
                    cropBoxDimensions.height
                  );
                  const maxScale = Math.max(5, fitScale * 2);
                  const step = 0.1;
                  const newZoom = Math.min(maxScale, currentParams.zoom + step);
                  updateCropParams(currentAsset.id, {
                    zoom: newZoom,
                    offsetX: currentParams.offsetX,
                    offsetY: currentParams.offsetY,
                  });
                }}
              >
                <Icon name="add-outline" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
          )}

          {/* Feed Preview */}
          {renderFeedPreview()}
        </ScrollView>

        {/* Thumbnail Strip - Fixed at bottom */}
        <View style={[styles.thumbnailContainer, { backgroundColor: bgColor, borderTopColor: isDark ? Colors.black.tertiary : Colors.white.tertiary }]}>
          <FlatList
            horizontal
            data={selectedImages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isActive = index === currentIndex;
              return (
                <TouchableOpacity
                  style={[
                    styles.thumbnail,
                    isActive && styles.thumbnailActive,
                    { backgroundColor: isDark ? Colors.black.secondary : Colors.white.tertiary }
                  ]}
                  onPress={() => handleThumbnailPress(index)}
                >
                  <Image
                    source={{ uri: item.finalUri || item.uri }}
                    style={styles.thumbnailImage}
                    resizeMode="contain" // 🔐 FIX: Consistency
                  />
                  <View style={styles.thumbnailBadge}>
                    <Text style={styles.thumbnailBadgeText}>{index + 1}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.thumbnailList}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.black.primary,
    zIndex: 10,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'flex-start',
  },
  ratioPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  ratioButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  ratioButtonActive: {
    backgroundColor: Colors.brand.primary,
  },
  ratioText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.white.secondary,
  },
  ratioTextActive: {
    color: Colors.white.primary,
    fontFamily: Fonts.semibold,
  },
  nextButton: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.brand.primary,
  },
  cropContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black.primary,
    paddingVertical: 20,
    minHeight: 200,
  },
  cropPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.black.primary,
    gap: 12,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderWrapper: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: Colors.white.tertiary,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.brand.primary,
    marginLeft: -10,
    marginTop: -8,
  },
  feedPreviewContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  feedPreviewLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginBottom: 8,
  },
  feedPreviewList: {
    gap: 8,
  },
  feedPreviewItem: {
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.black.secondary,
  },
  feedPreviewImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedPreviewCropBox: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.black.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.black.secondary,
    zIndex: 10,
  },
  thumbnailList: {
    gap: THUMBNAIL_SPACING,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: THUMBNAIL_SPACING,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbnailActive: {
    borderColor: Colors.brand.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    color: Colors.white.primary,
  },
});

