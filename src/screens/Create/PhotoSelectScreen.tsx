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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera, Asset, MediaType } from 'react-native-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { navigateToScreen } from '../../utils/navigationHelpers';
import { PermissionsAndroid, Platform } from 'react-native';

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
  const [lockedRatio, setLockedRatio] = useState<'1:1' | '4:5' | '16:9' | null>(null); // Lock ratio on first selection (Instagram-style)
  const isMountedRef = useRef(true);
  const hasNavigatedFromCreateFlowRef = useRef(false); // Track if we're navigating within create flow

  // Request storage permission for Android
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // Check if we have permission first (for Android 6.0+)
        let permission: string;
        if (Platform.Version >= 33) {
          permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        } else {
          permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        }

        // Check current permission status
        const checkResult = await PermissionsAndroid.check(permission);
        if (checkResult) {
          return true;
        }

        // Request permission only if screen is mounted
        if (!isMountedRef.current) {
          return false;
        }

        const granted = await PermissionsAndroid.request(permission, {
          title: 'Access Photos',
          message: 'Sanchari needs access to your gallery to upload photos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error: any) {
        // Handle the "not attached to Activity" error gracefully
        if (err?.code === 'E_INVALID_ACTIVITY' || err?.message?.includes('not attached to an Activity')) {
          console.warn('Permission request called before Activity attached, will retry');
          // Return false and let the component retry later
          return false;
        }
        console.error('Permission request error:', err);
        return false;
      }
    }
    return true;
  };

  // CRITICAL: Reset selection when screen is opened from outside (not from within create flow)
  // This ensures fresh state when user enters PhotoSelect screen, but preserves state when navigating back
  // SELECTION BEHAVIOR:
  // - When user enters PhotoSelect screen from outside (e.g., from Create tab), selection is cleared
  // - When user navigates back from crop/edit screens, selection is preserved
  // - This provides a clean slate for new posts while maintaining workflow continuity
  useFocusEffect(
    useCallback(() => {
      // Check if we're coming from within the create flow
      // If flag is set, we're navigating back from a create flow screen - preserve state
      if (hasNavigatedFromCreateFlowRef.current) {
        console.log('🔄 [PhotoSelectScreen] Preserving selection - navigating back from create flow');
        hasNavigatedFromCreateFlowRef.current = false; // Reset flag after check
        return;
      }
      
      // Otherwise, reset selection (user entered from outside)
      console.log('🔄 [PhotoSelectScreen] Resetting selection - entering from outside create flow');
      setSelectedImages([]);
      setPreviewImage(null);
      setLockedRatio(null);
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
      const granted = await requestStoragePermission();
      if (!isMountedRef.current) return;
      
      // If permission request failed due to Activity not attached, retry once after delay
      if (!granted && retryCount === 0) {
        setTimeout(() => {
          if (isMountedRef.current) {
            loadPhotos(1);
          }
        }, 500);
        return;
      }
      
      if (!granted) {
        if (isMountedRef.current) {
          Alert.alert('Permission Required', 'Please allow access to photos to select images.');
          setLoading(false);
        }
        return;
      }

      // Get photos from camera roll
      const result = await CameraRoll.getPhotos({
        first: 100, // Load first 100 photos
        assetType: 'Photos',
        ...(Platform.OS === 'ios' ? {} : { groupTypes: 'All' }),
      });

      if (result.edges && result.edges.length > 0) {
        // Convert CameraRoll format to Asset format
        const photos = result.edges.map((edge) => {
          const photo = edge.node.image;
          return {
            uri: photo.uri,
            width: photo.width || 0,
            height: photo.height || 0,
            timestamp: edge.node.timestamp || Date.now(),
            type: 'image/jpeg',
            fileName: photo.filename || `photo_${edge.node.timestamp || Date.now()}.jpg`,
          } as Asset;
        });

        if (isMountedRef.current) {
          setPhotos(photos);
          // Don't auto-select - let user select manually (Instagram-like behavior)
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
        setPreviewImage((currentPreview) => {
          if (currentPreview?.id === imageId) {
            // If deselected image was preview, switch to last remaining image or null
            const newPreview = updated.length > 0 ? updated[updated.length - 1] : null;
            console.log('🔄 [PhotoSelectScreen] Preview updated after deselect:', newPreview ? 'new image' : 'null');
            return newPreview;
          }
          return currentPreview;
        });
        
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
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          id: imageId,
          createdAt: asset.timestamp || Date.now(),
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

  const handleCamera = async () => {
    try {
      const options = {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
      };

      const result = await launchCamera(options);
      if (result.assets && result.assets[0] && result.assets[0].uri) {
        const capturedImage: SelectedImage = {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          id: result.assets[0].uri,
          createdAt: result.assets[0].timestamp || Date.now(),
        };
        
        // Toggle selection for captured image (Instagram-like behavior) with max limit check
        setSelectedImages((prev) => {
          const exists = prev.find((img) => img.id === capturedImage.id);
          if (exists) {
            // Deselect if already selected (always allowed)
            setPreviewImage((currentPreview) => {
              const updated = prev.filter((img) => img.id !== capturedImage.id);
              if (updated.length === 0) {
                setLockedRatio(null);
              }
              return currentPreview?.id === capturedImage.id 
                ? (updated.length > 0 ? updated[updated.length - 1] : null)
                : currentPreview;
            });
            return prev.filter((img) => img.id !== capturedImage.id);
          } else {
            // Select if not selected (check max limit first)
            if (prev.length >= MAX_SELECTION) {
              Alert.alert(
                'Maximum Selection',
                `You can select up to ${MAX_SELECTION} images only.`,
                [{ text: 'OK' }]
              );
              return prev; // Don't add - return previous state
            }
            
            // Lock ratio on first selection
            if (prev.length === 0 && !lockedRatio) {
              const defaultRatio: '1:1' | '4:5' | '16:9' = contentType === 'post' ? '4:5' : '16:9';
              setLockedRatio(defaultRatio);
            }
            
            setPreviewImage(capturedImage);
            return [...prev, capturedImage];
          }
        });
      }
    } catch (error: any) {
      if (error.code !== 'E_CAMERA_CANCELLED') {
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  };

  const handleNext = () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Selection', 'Please select at least one image');
      return;
    }

    // Mark that we're navigating within create flow (preserve state on back)
    hasNavigatedFromCreateFlowRef.current = true;

    // INSTAGRAM LOGIC: Pass locked ratio to crop screen (all images use same ratio)
    const ratioToUse = lockedRatio || (contentType === 'post' ? '4:5' : '16:9');
    
    // Navigate to CropAdjustScreen with contentType, selectedImages, and LOCKED ratio
    navigateToScreen(navigation, 'CropAdjust', {
      contentType: contentType,
      selectedImages: selectedImages,
      imageUri: selectedImages[0].uri,
      currentImageIndex: 0,
      allowMultiple: selectedImages.length > 1,
      lockedRatio: ratioToUse, // Pass locked ratio (Instagram-style: one ratio per post)
    });
  };

  // Memoized helper functions for better performance
  const getImageIndex = useCallback((asset: Asset): number => {
    if (!asset.uri) return -1;
    return selectedImages.findIndex((img) => img.id === asset.uri) + 1;
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7F4D" />
          <Text style={styles.loadingText}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.photoItem}
            activeOpacity={0.9}
            onPress={handleCamera}
          >
            <View style={[styles.photoImage, styles.cameraTile]}>
              <Icon name="camera" size={28} color="#FF7F4D" />
            </View>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="images-outline" size={64} color="#C8C8C8" />
            <Text style={styles.emptyText}>No photos found</Text>
            <Text style={styles.emptySubtext}>
              Take some photos or allow access to your gallery
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: '#1C1C1C',
  },
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
  cameraTile: {
    backgroundColor: '#F2F2F2',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: Fonts.semibold,
    fontSize: 18,
    color: '#1C1C1C',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: '#C8C8C8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

