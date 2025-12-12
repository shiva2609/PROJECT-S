import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  PermissionsAndroid,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera, Asset, MediaType } from 'react-native-image-picker';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import ImageTile from '../../components/create/ImageTile';
import { navigateToScreen } from '../../utils/navigationHelpers';
import { useCreateFlowStore } from '../../store/stores/useCreateFlowStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_SPACING = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_SPACING * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
const PREVIEW_HEIGHT = 350;
const MAX_SELECTION = 5;

interface CreatePostScreenProps {
  navigation: any;
  route?: {
    params?: {
      mode?: 'post' | 'story' | 'reel';
    };
  };
}

export default function CreatePostScreen({ navigation, route }: CreatePostScreenProps) {
  const { selectedImages, toggleSelectImage, setSelectedImages, resetCreateFlow } = useCreateFlowStore();
  const [photos, setPhotos] = useState<Asset[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  const hasNavigatedFromCreateFlowRef = useRef(false); // Track if we're navigating within create flow

  // Request storage permission for Android
  const requestStoragePermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        let permission: string;
        if (Platform.Version >= 33) {
          permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        } else {
          permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        }

        const checkResult = await PermissionsAndroid.check(permission);
        if (checkResult) {
          return true;
        }

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
        if (error?.code === 'E_INVALID_ACTIVITY' || error?.message?.includes('not attached to an Activity')) {
          console.warn('Permission request called before Activity attached, will retry');
          return false;
        }
        console.error('Permission request error:', error);
        return false;
      }
    }
    return true;
  }, []);

  // CRITICAL: Reset selection when screen is opened from outside (not from within create flow)
  // This ensures fresh state when user enters Create screen, but preserves state when navigating back
  // SELECTION BEHAVIOR:
  // - When user enters Create screen from outside (e.g., from Home tab), selection is cleared
  // - When user navigates back from crop/edit screens, selection is preserved
  // - This provides a clean slate for new posts while maintaining workflow continuity
  useFocusEffect(
    useCallback(() => {
      // Check if we're coming from within the create flow
      // If flag is set, we're navigating back from a create flow screen - preserve state
      if (hasNavigatedFromCreateFlowRef.current) {
        console.log('🔄 [CreatePostScreen] Preserving selection - navigating back from create flow');
        hasNavigatedFromCreateFlowRef.current = false; // Reset flag after check
        return;
      }
      
      // Otherwise, reset selection (user entered from outside)
      console.log('🔄 [CreatePostScreen] Resetting selection - entering from outside create flow');
      resetCreateFlow();
      setSelectedIndex(0);
    }, [resetCreateFlow])
  );

  // Load photos from gallery
  useEffect(() => {
    isMountedRef.current = true;
    loadPhotos();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadPhotos = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const granted = await requestStoragePermission();
      if (!isMountedRef.current) return;

      if (!granted) {
        if (isMountedRef.current) {
          Alert.alert('Permission Required', 'Please allow access to photos to select images.');
          setLoading(false);
        }
        return;
      }

      const result = await CameraRoll.getPhotos({
        first: 100,
        assetType: 'Photos',
        ...(Platform.OS === 'ios' ? {} : { groupTypes: 'All' }),
      });

      if (result.edges && result.edges.length > 0) {
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
  }, [requestStoragePermission]);

  // TOGGLE SELECTION: First tap = select, second tap = deselect
  // This ensures proper toggle behavior for image selection
  const handleImagePress = useCallback((asset: Asset) => {
    if (!asset.uri) return;

    const imageId = asset.uri;
    const index = selectedImages.findIndex((img) => img.id === imageId);

    if (index >= 0) {
      // DESELECT: Image is already selected - remove it
      console.log('❌ [CreatePostScreen] Deselecting image:', imageId.substring(0, 50) + '...');
      toggleSelectImage({
        id: imageId,
        uri: imageId,
        width: asset.width,
        height: asset.height,
        createdAt: asset.timestamp || Date.now(),
      });
      
      // Update selected index if needed
      const updatedImages = selectedImages.filter((img) => img.id !== imageId);
      if (updatedImages.length > 0) {
        // If there are still images, show the last one or adjust index
        const newIndex = Math.min(index, updatedImages.length - 1);
        setSelectedIndex(newIndex);
      } else {
        // No images left
        setSelectedIndex(0);
      }
    } else {
      // SELECT: Image is not selected - add it (if under limit)
      if (selectedImages.length >= MAX_SELECTION) {
        // Show non-blocking warning (toast-like alert)
        Alert.alert(
          'Maximum Selection',
          `You can select up to ${MAX_SELECTION} images only.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log('✅ [CreatePostScreen] Selecting image:', imageId.substring(0, 50) + '...');
      toggleSelectImage({
        id: imageId,
        uri: imageId,
        width: asset.width,
        height: asset.height,
        createdAt: asset.timestamp || Date.now(),
      });
      // Set as preview after selection
      const newIndex = selectedImages.length;
      setSelectedIndex(newIndex);
    }
  }, [selectedImages, toggleSelectImage]);

  const handleCamera = useCallback(async () => {
    try {
      const options = {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
      };

      const result = await launchCamera(options);
      if (result.assets && result.assets[0] && result.assets[0].uri) {
        const capturedImage = {
          id: result.assets[0].uri,
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          createdAt: result.assets[0].timestamp || Date.now(),
        };

        // Check if already selected (toggle behavior)
        const exists = selectedImages.some((img) => img.id === capturedImage.id);
        
        if (exists) {
          // Deselect if already selected
          toggleSelectImage(capturedImage);
          const updatedImages = selectedImages.filter((img) => img.id !== capturedImage.id);
          setSelectedIndex(updatedImages.length > 0 ? updatedImages.length - 1 : 0);
        } else {
          // Select if not selected (check max limit)
          if (selectedImages.length >= MAX_SELECTION) {
            Alert.alert(
              'Maximum Selection',
              `You can select up to ${MAX_SELECTION} images only.`,
              [{ text: 'OK' }]
            );
            return;
          }
          toggleSelectImage(capturedImage);
          setSelectedIndex(selectedImages.length);
        }
      }
    } catch (error: any) {
      if (error.code !== 'E_CAMERA_CANCELLED') {
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  }, [selectedImages, toggleSelectImage]);

  const handleNext = useCallback(() => {
    if (selectedImages.length === 0) {
      Alert.alert('No Selection', 'Please select at least one image');
      return;
    }

    // Mark that we're navigating within create flow (preserve state on back)
    hasNavigatedFromCreateFlowRef.current = true;
    
    // Navigate to UnifiedEditScreen
    navigateToScreen(navigation, 'UnifiedEdit');
  }, [selectedImages.length, navigation]);

  const previewImage = useMemo(() => {
    if (selectedImages.length === 0) return null;
    return selectedImages[selectedIndex] || selectedImages[0];
  }, [selectedImages, selectedIndex]);

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
      <ImageTile
        uri={item.uri || ''}
        id={item.uri || `photo-${index}`}
        isSelected={isSelected}
        index={imageIndex}
        onPress={() => handleImagePress(item)}
        size={ITEM_SIZE}
      />
    );
  }, [isImageSelected, getImageIndex, handleImagePress]);

  const keyExtractor = useCallback((item: Asset, index: number) => {
    return item.uri || `photo-${index}`;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
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
          <Icon name="close" size={24} color={Colors.brand.primary} />
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
          <View style={styles.previewImageWrapper}>
            <Image
              source={{ uri: previewImage.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
          {selectedImages.length > 1 && (
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>
                {selectedIndex + 1} / {selectedImages.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Photo Grid */}
      <FlatList
        data={photos}
        renderItem={renderPhotoItem}
        keyExtractor={keyExtractor}
        numColumns={GRID_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity
            style={[styles.photoItem, { width: ITEM_SIZE, height: ITEM_SIZE }]}
            activeOpacity={0.9}
            onPress={handleCamera}
          >
            <View style={[styles.cameraTile, { width: ITEM_SIZE, height: ITEM_SIZE }]}>
              <Icon name="camera" size={28} color={Colors.brand.primary} />
            </View>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="images-outline" size={64} color={Colors.black.qua} />
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
    backgroundColor: Colors.white.primary,
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
    color: Colors.black.primary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  topBarButton: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: Fonts.medium,
    fontSize: 18,
    color: Colors.black.primary,
  },
  nextButton: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.brand.primary,
  },
  nextButtonDisabled: {
    color: Colors.black.qua,
    opacity: 0.5,
  },
  previewContainer: {
    width: '100%',
    height: PREVIEW_HEIGHT,
    backgroundColor: Colors.black.primary,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageWrapper: {
    width: '100%',
    height: '100%',
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
    color: Colors.white.primary,
  },
  gridContainer: {
    padding: GRID_SPACING,
  },
  photoItem: {
    margin: GRID_SPACING / 2,
  },
  cameraTile: {
    backgroundColor: Colors.white.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
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
    color: Colors.black.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.black.qua,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
