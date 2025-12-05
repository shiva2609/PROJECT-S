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
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera, Asset, MediaType } from 'react-native-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { navigateToScreen } from '../utils/navigationHelpers';
import { PermissionsAndroid, Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_SPACING = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_SPACING * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
const PREVIEW_HEIGHT = 350;

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
  const isMountedRef = useRef(true);

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
      } catch (err: any) {
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
          
          // Auto-select first image and show in preview
          if (photos.length > 0 && photos[0].uri) {
            const firstImage: SelectedImage = {
              uri: photos[0].uri,
              width: photos[0].width,
              height: photos[0].height,
              id: photos[0].uri,
              createdAt: photos[0].timestamp || Date.now(),
            };
            setSelectedImages([firstImage]);
            setPreviewImage(firstImage);
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

  const toggleImageSelection = (asset: Asset) => {
    if (!asset.uri) return;

    const imageId = asset.uri;
    const isSelected = selectedImages.some((img) => img.id === imageId);

    if (isSelected) {
      // Deselect
      setSelectedImages((prev) => prev.filter((img) => img.id !== imageId));
      // Update preview if this was the preview image
      if (previewImage?.id === imageId) {
        const remaining = selectedImages.filter((img) => img.id !== imageId);
        setPreviewImage(remaining.length > 0 ? remaining[remaining.length - 1] : null);
      }
    } else {
      // Select
      const newImage: SelectedImage = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        id: imageId,
        createdAt: asset.timestamp || Date.now(),
      };
      setSelectedImages((prev) => [...prev, newImage]);
      setPreviewImage(newImage);
    }
  };

  const handleZoom = () => {
    if (!previewImage || selectedImages.length === 0) return;

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
        
        // Add to selected images and set as preview
        setSelectedImages((prev) => {
          const exists = prev.some((img) => img.id === capturedImage.id);
          if (exists) return prev;
          return [...prev, capturedImage];
        });
        setPreviewImage(capturedImage);
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

    // Navigate to CropAdjustScreen with contentType and selectedImages
    navigateToScreen(navigation, 'CropAdjust', {
      contentType: contentType,
      selectedImages: selectedImages,
      imageUri: selectedImages[0].uri,
      currentImageIndex: 0,
      allowMultiple: selectedImages.length > 1,
    });
  };

  const getImageIndex = (asset: Asset): number => {
    if (!asset.uri) return -1;
    return selectedImages.findIndex((img) => img.id === asset.uri) + 1;
  };

  const isImageSelected = (asset: Asset): boolean => {
    if (!asset.uri) return false;
    return selectedImages.some((img) => img.id === asset.uri);
  };

  const renderPhotoItem = ({ item, index }: { item: Asset; index: number }) => {
    const isSelected = isImageSelected(item);
    const imageIndex = getImageIndex(item);

    return (
      <TouchableOpacity
        style={styles.photoItem}
        activeOpacity={0.9}
        onPress={() => {
          toggleImageSelection(item);
          if (item.uri) {
            const selectedImg: SelectedImage = {
              uri: item.uri,
              width: item.width,
              height: item.height,
              id: item.uri,
              createdAt: item.timestamp || Date.now(),
            };
            setPreviewImage(selectedImg);
          }
        }}
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
  };

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
          <TouchableOpacity style={styles.zoomButton} activeOpacity={0.8} onPress={handleZoom}>
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
        keyExtractor={(item, index) => item.uri || `photo-${index}`}
        numColumns={GRID_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
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

