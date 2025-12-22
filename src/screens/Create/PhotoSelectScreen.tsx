import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
  InteractionManager,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Asset } from 'react-native-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { navigateToScreen } from '../../utils/navigationHelpers';
import { Platform } from 'react-native';
import {
  resolveMediaPermissionState,
  requestMediaPermission,
  showPermissionDialog,
  MediaPermissionType,
  MediaPermissionState,
  PermissionAction,
} from '../../utils/mediaPermissions';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_SPACING = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_SPACING * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
const PREVIEW_HEIGHT = 350;
const MAX_SELECTION = 5; // Maximum number of images that can be selected

interface SelectedImage {
  uri: string;
  width?: number;
  height?: number;
  id: string;
  createdAt?: number;
}

interface PhotoSelectScreenProps {
  navigation: any;
  route?: {
    params?: {
      mode?: 'post' | 'story' | 'reel';
    };
  };
}

type TabType = 'Post' | 'Reel';
type ContentType = 'post' | 'reel';

export default function PhotoSelectScreen({ navigation, route }: PhotoSelectScreenProps) {
  const [photos, setPhotos] = useState<Asset[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<ContentType>('post');
  const [previewImage, setPreviewImage] = useState<SelectedImage | null>(null);
  const [lockedRatio, setLockedRatio] = useState<'1:1' | '4:5' | '16:9' | null>(null);
  const [permissionState, setPermissionState] = useState<MediaPermissionState>(MediaPermissionState.GRANTED);
  const isMountedRef = useRef(true);
  const hasNavigatedFromCreateFlowRef = useRef(false);

  // 🔐 DEPRECATED: Custom permission logic removed
  // ALL permission handling now delegated to mediaPermissions.ts
  // See loadPhotos() for canonical permission flow

  // CRITICAL: Reset selection when screen is opened from outside (not from within create flow)
  // This ensures fresh state when user enters PhotoSelect screen, but preserves state when navigating back
  // SELECTION BEHAVIOR:
  // - When user enters PhotoSelect screen from outside (e.g., from Create tab), selection is cleared
  // - When user navigates back from crop/edit screens, selection is preserved
  // - This provides a clean slate for new posts while maintaining workflow continuity
  useFocusEffect(
    useCallback(() => {
      // Check if we're coming from within the create flow
      if (hasNavigatedFromCreateFlowRef.current) {
        console.log('🔄 [PhotoSelectScreen] Preserving selection - navigating back from create flow');
        hasNavigatedFromCreateFlowRef.current = false;
        return;
      }

      // Otherwise, reset selection (user entered from outside)
      console.log('🔄 [PhotoSelectScreen] Resetting selection - entering from outside create flow');
      setSelectedImages([]);
      setPreviewImage(null);
      setLockedRatio(null);

      // 🔄 RELOAD: Always reload photos on focus to ensure sync with OS
      loadPhotos();
    }, [])
  );

  // Load photos from gallery - delay to ensure screen is attached to Activity
  useEffect(() => {
    isMountedRef.current = true;

    // Use InteractionManager to wait until screen is ready
    const task = InteractionManager.runAfterInteractions(() => {
      // Add a small delay to ensure Activity is attached
      setTimeout(() => {
        if (isMountedRef.current) {
          loadPhotos();
        }
      }, 100);
    });

    return () => {
      isMountedRef.current = false;
      task.cancel();
    };
  }, []);

  const loadPhotos = async (retryCount = 0) => {
    if (!isMountedRef.current) return;

    try {
      // 🔐 STEP 1: Resolve permission state through canonical resolver
      const resolution = await resolveMediaPermissionState(MediaPermissionType.GALLERY);
      if (!isMountedRef.current) return;

      // 🔐 STEP 2: Handle permission state
      if (!resolution.canAccess) {
        if (resolution.action === PermissionAction.REQUEST) {
          const requestResult = await requestMediaPermission(MediaPermissionType.GALLERY);

          if (!requestResult.canAccess) {
            // Still no access - show recovery dialog
            if (isMountedRef.current) {
              showPermissionDialog(requestResult);
              setLoading(false);
            }
            return;
          }
          // Permission granted - proceed
        } else {
          // Blocked or other state - show recovery dialog
          if (isMountedRef.current) {
            showPermissionDialog(resolution);
            setLoading(false);
          }
          return;
        }
      }

      // 🔐 STEP 3: Load photos with mandatory MIME-ONLY query (NO folder filtering)
      const PAGE_SIZE = 500;
      const result = await CameraRoll.getPhotos({
        first: PAGE_SIZE,
        assetType: 'Photos', // 🔐 STRIZCT VIDEO EXCLUSION
        include: ['filename', 'fileSize', 'imageSize', 'location'],
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], // Allow all standard image types
      });

      if (result.edges && result.edges.length > 0) {
        // Convert CameraRoll format to Asset format
        const photos = result.edges.map((edge) => {
          const photo = edge.node.image;
          return {
            uri: photo.uri,
            width: photo.width || 0,
            height: photo.height || 0,
            timestamp: String(edge.node.timestamp || Date.now()),
            type: 'image/jpeg',
            fileName: photo.filename || `photo_${edge.node.timestamp || Date.now()}.jpg`,
          } as any as Asset;
        });

        if (isMountedRef.current) {
          setPhotos(photos);
          setPermissionState(resolution.state);

          // 🛠️ REGRESSION PROTECTION: Dev-only logging
          if (__DEV__) {
            console.log('📸 MEDIA FETCH COUNT:', photos.length);
            console.log(
              '📁 SAMPLE FILES:',
              photos.slice(0, 5).map(a => a.fileName || (a.uri ? a.uri.split('/').pop() : 'unknown'))
            );
          }
        }
      } else {
        if (isMountedRef.current) {
          setPhotos([]);
        }
      }
    } catch (error: any) {
      console.error('Error loading photos:', error);
      if (isMountedRef.current) {
        Alert.alert('Error', 'Failed to load photos. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // TOGGLE SELECTION: First tap = select, second tap = deselect
  // Instagram-like toggle selection with max 5 images limit
  // Lock aspect ratio on first selection (Instagram-style)
  const toggleImageSelection = useCallback((asset: Asset) => {
    if (!asset.uri) {
      console.log('⚠️ [PhotoSelectScreen] toggleImageSelection: No URI');
      return;
    }

    const imageId = asset.uri;
    console.log('🖼️ [PhotoSelectScreen] toggleImageSelection:', imageId.substring(0, 50) + '...');

    setSelectedImages((prev) => {
      // Check if image is already selected
      const exists = prev.find((img) => img.id === imageId);

      if (exists) {
        // DESELECT: Remove from selection (always allowed, even at max limit)
        console.log('❌ [PhotoSelectScreen] Deselecting image');
        const updated = prev.filter((img) => img.id !== imageId);

        // If all images deselected, unlock ratio
        if (updated.length === 0) {
          setLockedRatio(null);
        }

        // Update preview if this was the preview image (use functional update to avoid stale closure)
        setPreviewImage(((currentPreview: SelectedImage | null) => {
          if (currentPreview?.id === imageId) {
            // If deselected image was preview, switch to last remaining image or null
            const newPreview = updated.length > 0 ? updated[updated.length - 1] : null;
            return newPreview;
          }
          return currentPreview || null;
        }) as any);

        return updated;
      } else {
        // SELECT: Add to selection (check max limit first)
        if (prev.length >= MAX_SELECTION) {
          // Show non-blocking warning (toast-like alert)
          Alert.alert(
            'Maximum Selection',
            `You can select up to ${MAX_SELECTION} images only.`,
            [{ text: 'OK' }]
          );
          return prev; // Don't add - return previous state
        }

        console.log('✅ [PhotoSelectScreen] Selecting image');
        const newImage: SelectedImage = {
          uri: asset.uri!,
          width: asset.width,
          height: asset.height,
          id: imageId,
          createdAt: asset.timestamp ? Number(asset.timestamp) : Date.now(),
        };

        // INSTAGRAM LOGIC: Lock ratio on FIRST selection (default to 4:5 for posts)
        if (prev.length === 0 && !lockedRatio) {
          const defaultRatio: '1:1' | '4:5' | '16:9' = contentType === 'post' ? '4:5' : '16:9';
          setLockedRatio(defaultRatio);
          console.log('🔒 [PhotoSelectScreen] Ratio locked to:', defaultRatio, '(Instagram-style)');
        }

        // Set as preview when selected (only if no preview exists or this is first selection)
        setPreviewImage((currentPreview) => {
          if (!currentPreview || prev.length === 0) {
            console.log('🖼️ [PhotoSelectScreen] Setting new preview image');
            return newImage;
          }
          console.log('🔄 [PhotoSelectScreen] Keeping existing preview');
          return currentPreview; // Keep existing preview
        });

        return [...prev, newImage];
      }
    });
  }, [lockedRatio, contentType]);

  const handleZoom = () => {
    if (!previewImage || selectedImages.length === 0) {
      Alert.alert('No Selection', 'Please select at least one image to crop');
      return;
    }

    // Navigate to CropAdjustScreen with all selected images
    navigateToScreen(navigation, 'CropAdjust', {
      contentType: contentType,
      selectedImages: selectedImages,
      imageUri: previewImage.uri,
      currentImageIndex: selectedImages.findIndex((img) => img.id === previewImage.id),
      allowMultiple: selectedImages.length > 1,
    });
  };


  const handleNext = () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Selection', 'Please select at least one image');
      return;
    }

    hasNavigatedFromCreateFlowRef.current = true;
    const ratioToUse = lockedRatio || (contentType === 'post' ? '4:5' : '16:9');

    navigateToScreen(navigation, 'CropAdjust', {
      contentType: contentType,
      selectedImages: selectedImages,
      imageUri: selectedImages[0]?.uri || '',
      currentImageIndex: 0,
      allowMultiple: selectedImages.length > 1,
      lockedRatio: ratioToUse,
    });
  };

  // Memoized helper functions for better performance
  const getImageIndex = useCallback((asset: Asset): number => {
    if (!asset.uri) return -1;
    const uri = asset.uri as string;
    return selectedImages.findIndex((img) => img.id === uri) + 1;
  }, [selectedImages]);

  const isImageSelected = useCallback((asset: Asset): boolean => {
    if (!asset.uri) return false;
    return selectedImages.some((img) => img.id === asset.uri);
  }, [selectedImages]);

  const renderPhotoItem = useCallback(({ item, index }: { item: Asset; index: number }) => {
    const isSelected = isImageSelected(item);
    const imageIndex = getImageIndex(item);

    return (
      <TouchableOpacity
        style={styles.photoItem}
        activeOpacity={0.9}
        onPress={() => toggleImageSelection(item)}
      // Remove long press to avoid interference with toggle
      >
        {item.uri ? (
          <Image source={{ uri: item.uri }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <View style={[styles.photoImage, styles.photoPlaceholder]}>
            <Icon name="image-outline" size={24} color="#C8C8C8" />
          </View>
        )}
        {isSelected && (
          <>
            <View style={styles.overlay} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{imageIndex}</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  }, [selectedImages, toggleImageSelection, isImageSelected, getImageIndex]);

  if (loading) {
    return (
      <ScreenLayout scrollable={false} includeBottomInset={false}>
        <LoadingState message="Loading photos..." fullScreen />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scrollable={false} includeBottomInset={false}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#FF7F4D" />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { fontFamily: Fonts.medium }]}>New Post</Text>
        <TouchableOpacity
          style={styles.topBarButton}
          activeOpacity={0.7}
          onPress={handleNext}
          disabled={selectedImages.length === 0}
        >
          <Text
            style={[
              styles.nextButton,
              selectedImages.length === 0 && styles.nextButtonDisabled,
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🔐 iOS LIMITED ACCESS BANNER */}
      {Platform.OS === 'ios' && permissionState === MediaPermissionState.LIMITED && (
        <View style={styles.limitedBanner}>
          <View style={styles.limitedTextContainer}>
            <Icon name="information-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.limitedText}>You've allowed access to only some photos</Text>
          </View>
          <TouchableOpacity
            style={styles.limitedButton}
            onPress={async () => {
              await requestMediaPermission(MediaPermissionType.GALLERY);
              loadPhotos();
            }}
          >
            <Text style={styles.limitedButtonText}>Select More</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Preview Section */}
      {previewImage && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: previewImage.uri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          {selectedImages.length > 1 && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>
                {selectedImages.findIndex((img) => img.id === previewImage.id) + 1} /{' '}
                {selectedImages.length}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.zoomButton}
            activeOpacity={0.8}
            onPress={handleZoom}
            disabled={selectedImages.length === 0}
          >
            <View style={styles.zoomButtonBackground}>
              <Icon name="crop-outline" size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Selector Tabs */}
      <View style={styles.tabContainer}>
        {(['Post', 'Reel'] as TabType[]).map((tab) => {
          const isActive = contentType === tab.toLowerCase();
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => {
                setContentType(tab.toLowerCase() as ContentType);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Photo Grid */}
      <FlatList
        data={photos}
        renderItem={renderPhotoItem}
        keyExtractor={(item, index) => item.uri || `photo-${item.timestamp || index}`}
        numColumns={GRID_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        extraData={selectedImages} // Force re-render when selection changes
        ListEmptyComponent={
          <EmptyState
            icon="images-outline"
            title="No photos found"
            subtitle="Take some photos or allow access to your gallery"
          />
        }
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F3F3',
  },
  topBarButton: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 18,
    color: '#000000',
  },
  nextButton: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: '#FF7F4D',
  },
  nextButtonDisabled: {
    color: '#C8C8C8',
  },
  previewContainer: {
    width: '100%',
    height: PREVIEW_HEIGHT,
    backgroundColor: '#000000',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  previewBadgeText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  zoomButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  zoomButtonBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FF7F4D',
  },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: '#FFFFFF',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextDisabled: {
    opacity: 0.5,
  },
  limitedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3C3C3C',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1C',
  },
  limitedTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  limitedText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  limitedButton: {
    backgroundColor: '#FF7F4D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  limitedButtonText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  gridContainer: {
    padding: GRID_SPACING,
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: GRID_SPACING / 2,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F3F3',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF7F4D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});

