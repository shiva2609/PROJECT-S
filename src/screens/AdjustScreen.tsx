import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { navigateToScreen } from '../utils/navigationHelpers';
import type { AspectRatio } from '../hooks/useCropState';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_PADDING = 20;

interface Asset {
  uri: string;
  width?: number;
  height?: number;
  id: string;
  createdAt?: number;
}

interface AdjustScreenProps {
  navigation: any;
  route: {
    params: {
      assets: Asset[];
      index?: number;
      ratios?: { [key: string]: AspectRatio };
    };
  };
}

export default function AdjustScreen({ navigation, route }: AdjustScreenProps) {
  const { assets, index: initialIndex = 0, ratios: initialRatios = {} } = route.params;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [ratios, setRatios] = useState<{ [key: string]: AspectRatio }>(initialRatios);

  const currentAsset = assets[currentIndex];
  const currentImageUri = currentAsset?.uri || '';
  const currentRatio = ratios[currentAsset?.id || ''] || '4:5';

  // Calculate frame dimensions based on aspect ratio
  const getFrameDimensions = useCallback((ratio: AspectRatio) => {
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
  }, []);

  const { frameWidth, frameHeight } = getFrameDimensions(currentRatio);

  // Load current image
  useEffect(() => {
    if (!currentImageUri) return;

    setLoading(true);
    Image.getSize(
      currentImageUri,
      (width, height) => {
        setImageSize({ width, height });
        setLoading(false);
      },
      (error) => {
        console.error('Error getting image size:', error);
        setLoading(false);
      }
    );
  }, [currentImageUri]);

  const handleRatioChange = useCallback((ratio: AspectRatio) => {
    if (!currentAsset) return;
    setRatios((prev) => ({
      ...prev,
      [currentAsset.id]: ratio,
    }));
  }, [currentAsset]);

  const handleNext = useCallback(() => {
    if (!currentAsset) return;

    // Navigate to CropScreen with current asset and ratio
    navigateToScreen(navigation, 'Crop', {
      assets,
      index: currentIndex,
      ratio: currentRatio,
      ratios,
    });
  }, [assets, currentIndex, currentRatio, ratios, navigation, currentAsset]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      navigation.goBack();
    }
  }, [currentIndex, navigation]);

  // Calculate image style to fill frame without black bars
  const imageStyle = useMemo(() => {
    if (imageSize.width === 0 || imageSize.height === 0) {
      return { width: frameWidth, height: frameHeight };
    }

    const imageAspect = imageSize.width / imageSize.height;
    const cropAspect = frameWidth / frameHeight;

    let width: number;
    let height: number;

    if (imageAspect > cropAspect) {
      // Image is wider - fit to height
      height = frameHeight;
      width = height * imageAspect;
    } else {
      // Image is taller - fit to width
      width = frameWidth;
      height = width / imageAspect;
    }

    return {
      width,
      height,
    };
  }, [imageSize, frameWidth, frameHeight]);

  const progressText = assets.length > 1 ? `Adjust ${currentIndex + 1} / ${assets.length}` : 'Adjust';

  return (
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
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={[styles.nextButton, loading && styles.nextButtonDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preview Area */}
      <View style={styles.previewContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.white.primary} />
          </View>
        ) : (
          <View style={styles.previewWrapper}>
            <View style={[styles.frameContainer, { width: frameWidth, height: frameHeight }]}>
              <Image
                source={{ uri: currentImageUri }}
                style={[imageStyle, styles.previewImage]}
                resizeMode="cover"
              />
            </View>
          </View>
        )}
      </View>

      {/* Ratio Selector */}
      <View style={styles.ratioContainer}>
        {(['1:1', '4:5', '16:9'] as AspectRatio[]).map((ratio) => (
          <TouchableOpacity
            key={ratio}
            style={[
              styles.ratioButton,
              currentRatio === ratio && styles.ratioButtonActive,
            ]}
            onPress={() => handleRatioChange(ratio)}
          >
            <Text
              style={[
                styles.ratioText,
                currentRatio === ratio && styles.ratioTextActive,
              ]}
            >
              {ratio}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
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
  nextButton: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.brand.primary,
  },
  nextButtonDisabled: {
    opacity: 0.5,
    color: Colors.white.secondary,
  },
  previewContainer: {
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
  previewWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.black.primary,
  },
  previewImage: {
    backgroundColor: Colors.black.primary,
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
    backgroundColor: Colors.brand.primary,
  },
  ratioText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.black.primary,
  },
  ratioTextActive: {
    color: Colors.white.primary,
  },
});

