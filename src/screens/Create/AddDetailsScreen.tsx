import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import storage from '@react-native-firebase/storage';
import { Platform, InteractionManager, AppState } from 'react-native';
import RNFS from 'react-native-fs'; // 🔐 IMPORT RNFS
import { useCreateFlowStore } from '../../store/stores/useCreateFlowStore';
import { processFinalCrops } from '../../utils/finalCropProcessor';
import { getCropBoxDimensions, getImageTransform } from '../../utils/cropMath';
import { db } from '../../core/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from '../../core/firebase/compat';
import { useAuth } from '../../providers/AuthProvider';
import { checkNetworkStatus } from '../../hooks/useNetworkState';
import { AppError, ErrorType, withTimeout } from '../../utils/AppError';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useSingleFlight } from '../../hooks/useSingleFlight';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AddDetailsScreen({ navigation }: any) {
  console.log('🔥🔥🔥 MOUNTED: AddDetailsScreen — src/screens/Create/AddDetailsScreen.tsx 🔥🔥🔥');
  console.log('🟢 [AddDetailsScreen] Component mounted/rendered');

  const { authReady, user, checkSession } = useAuth(); // 🔐 AUTH: Destructure checkSession
  const { handleError } = useErrorHandler();

  useEffect(() => {
    console.log('🟢 [AddDetailsScreen] useEffect - Component mounted');
    return () => {
      console.log('🔴 [AddDetailsScreen] useEffect cleanup - Component unmounting');
    };
  }, []);

  const {
    selectedImages,
    globalRatio,
    cropParams,
  } = useCreateFlowStore();

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [imageSizes, setImageSizes] = useState<{ [id: string]: { width: number; height: number } }>({});
  const [isMounted, setIsMounted] = useState(true);

  // 🔐 IDEMPOTENCY: Generate Post ID ONCE when component mounts
  // This ensures that even if 'handlePost' is called multiple times or retried,
  // we are operating on the same Post ID (Idempotency Key).
  const idempotencyKey = useMemo(() => `post_${Date.now()}_${Math.random().toString(36).substring(7)}`, []);

  // 🔐 SINGLE FLIGHT GUARD
  const singleFlight = useSingleFlight();

  // Prevent duplicate posts (legacy flag kept for UI disabling)
  const [isPosting, setIsPosting] = useState(false);

  const cropBoxDimensions = getCropBoxDimensions(globalRatio);

  // Calculate preview dimensions based on aspect ratio
  const previewDimensions = useMemo(() => {
    const previewWidth = SCREEN_WIDTH;
    let previewHeight: number;

    switch (globalRatio) {
      case '1:1':
        previewHeight = previewWidth;
        break;
      case '4:5':
        previewHeight = (previewWidth * 5) / 4;
        break;
      case '16:9':
        previewHeight = (previewWidth * 9) / 16;
        break;
      default:
        previewHeight = previewWidth;
    }

    return { width: previewWidth, height: previewHeight };
  }, [globalRatio]);

  // 🔐 SUCCESS GUARD: Bypass navigation warnings on successful post
  const isSuccessRef = React.useRef(false);

  // Track mount status
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // 🔐 NAVIGATION GUARD
  // Prevent accidental exit if "Dirty" or "Submitting"
  React.useEffect(() => {
    const isDirty = description.trim().length > 0 || location.trim().length > 0 || tags.trim().length > 0;
    const isBusy = uploading || processing || isPosting;

    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // 0. If this is a successful post navigation, bypass all guards
      if (isSuccessRef.current) {
        return;
      }

      // 1. If clean and not busy, allow exit
      if (!isDirty && !isBusy) {
        return;
      }

      // 2. If busy (uploading), Warn strongly
      if (isBusy) {
        e.preventDefault();
        Alert.alert(
          'Upload in Progress',
          'Your post is currently uploading. Leaving now will cancel the process.',
          [
            { text: 'Stay', style: 'cancel', onPress: () => { } },
            {
              text: 'Leave & Cancel',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]
        );
        return;
      }

      // 3. If dirty (unsaved changes), Warn
      if (isDirty) {
        e.preventDefault();
        Alert.alert(
          'Discard Post?',
          'You have unsaved details. Are you sure you want to discard them?',
          [
            { text: 'Keep Editing', style: 'cancel', onPress: () => { } },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]
        );
      }
    });

    return unsubscribe;
  }, [navigation, description, location, tags, uploading, processing, isPosting]);

  // 🔐 APP STATE GUARD (Background/Foreground)
  // Ensure we don't lose state if app is backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // App came to foreground
        // We could re-validate session here if needed, but AuthProvider handles that.
        // Just verifying we are still mounted and state is intact.
        console.log('🔄 [AddDetailsScreen] App foregrounded. Status:', { uploading, processing });
      }
    });
    return () => subscription.remove();
  }, [uploading, processing]);
  // Load image sizes
  useEffect(() => {
    const loadSizes = async () => {
      const sizes: { [id: string]: { width: number; height: number } } = {};

      for (const asset of selectedImages) {
        if (!asset || !asset.uri) continue;

        try {
          await new Promise<void>((resolve) => {
            Image.getSize(
              asset.uri,
              (width, height) => {
                if (isMounted) {
                  sizes[asset.id] = { width, height };
                }
                resolve();
              },
              () => {
                console.warn(`⚠️ [AddDetails] Failed to get size for: ${asset.uri}`);
                if (isMounted) {
                  sizes[asset.id] = { width: 0, height: 0 };
                }
                resolve();
              }
            );
          });
        } catch (error) {
          console.error(`❌ [AddDetails] size error for ${asset.uri}:`, error);
          if (isMounted) {
            sizes[asset.id] = { width: 0, height: 0 };
          }
        }
      }

      if (isMounted) {
        setImageSizes(sizes);
      }
    };

    if (selectedImages.length > 0 && isMounted) {
      loadSizes();
    }
  }, [selectedImages, isMounted]);

  const renderPreview = useMemo(() => {
    if (selectedImages.length === 0) return null;

    const asset = selectedImages[previewIndex];
    if (!asset) return null; // Safety check

    // 🔐 FIX 4: Use finalUri directly (Consistency)
    // No transforms, no re-applied math
    const imageUri = asset.finalUri || asset.uri;

    return (
      <View style={[styles.imagePreview, { height: previewDimensions.height }]}>
        <Image
          source={{ uri: imageUri }}
          style={{
            width: previewDimensions.width,
            height: previewDimensions.height,
          }}
          resizeMode="contain"
        />
      </View>
    );
  }, [selectedImages, previewIndex, previewDimensions]);

  const handlePost = async () => {
    // 🔐 AUTH GATE: Valid Session Check
    checkSession();

    if (!authReady || !user) {
      Alert.alert('Error', 'Authentication not ready.');
      return;
    }

    if (isPosting) return;

    // 🔐 1. NETWORK GATE: PRE-FLIGHT CHECK
    const isConnected = await checkNetworkStatus();
    if (!isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your network and try again. Your post draft is safe.'
      );
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('Error', 'No images to post');
      return;
    }

    // 🔐 2. SINGLE FLIGHT GUARD
    // Use the idempotency key to lock this specific post creation
    const result = await singleFlight.execute(`create_post:${idempotencyKey}`, async () => {
      // 🔐 RE-CHECK SESSION inside lock
      checkSession();

      setIsPosting(true);
      setUploading(true);
      setProcessing(true);
      setProgress(0);

      try {
        const uid = user.uid;

        // 🔐 FIX 4: REMOVED redundant processFinalCrops
        // Using finalUri already generated in CropAdjustScreen
        const finalImageUris = selectedImages
          .map(img => img.finalUri)
          .filter((uri): uri is string => !!uri);

        if (finalImageUris.length === 0) {
          throw new Error('No finalized images found. Please go back and crop.');
        }

        // STEP 2 — USE IDEMPOTENCY KEY (Generated on mount)
        const postId = idempotencyKey;

        // STEP 3 — UPLOAD IMAGES
        const uploadedUrls: string[] = [];
        const uploadedMedia: Array<{ url: string; storagePath: string; type: 'image' }> = [];

        for (let i = 0; i < finalImageUris.length; i++) {
          console.log(`\n📤 [AddDetails] ========== UPLOAD ${i + 1}/${finalImageUris.length} ==========`);

          const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const storagePath = `users/${uid}/posts/${postId}/${fileName}`;
          const reference = storage().ref(storagePath);

          let uploadUri = finalImageUris[i];

          console.log(`📤 [AddDetails] Original URI: ${uploadUri}`);

          // CRITICAL: Validate URI exists
          if (!uploadUri) {
            throw new Error(`Missing URI for image ${i + 1}`);
          }

          // Step 1: Normalize URI for file system check
          let fsCheckUri = uploadUri;
          if (fsCheckUri.startsWith('file://')) {
            fsCheckUri = fsCheckUri.replace('file://', '');
          }

          console.log(`📤 [AddDetails] FS Check URI: ${fsCheckUri}`);

          // Step 2: Verify file exists
          try {
            const exists = await RNFS.exists(fsCheckUri);
            console.log(`📤 [AddDetails] File exists: ${exists}`);

            if (!exists) {
              // Try decoding in case of URL encoding
              const decodedUri = decodeURIComponent(fsCheckUri);
              console.log(`📤 [AddDetails] Trying decoded URI: ${decodedUri}`);

              const decodedExists = await RNFS.exists(decodedUri);
              console.log(`📤 [AddDetails] Decoded file exists: ${decodedExists}`);

              if (!decodedExists) {
                throw new Error(`File not found at: ${fsCheckUri}`);
              }

              fsCheckUri = decodedUri;
            }

            // Get file stats
            const stats = await RNFS.stat(fsCheckUri);
            console.log(`📤 [AddDetails] File size: ${stats.size} bytes`);
            console.log(`📤 [AddDetails] File path: ${stats.path}`);

            if (stats.size === 0) {
              throw new Error(`File is empty (0 bytes): ${fsCheckUri}`);
            }

          } catch (fsError: any) {
            console.error(`❌ [AddDetails] File validation failed:`, fsError);
            throw new Error(`File validation failed: ${fsError.message}`);
          }

          // Step 3: Prepare URI for Firebase upload
          // Firebase Storage putFile() expects local file path
          // On iOS: can use file:// or absolute path
          // On Android: prefers absolute path
          let firebaseUploadUri = fsCheckUri; // Use the validated path

          console.log(`📤 [AddDetails] Firebase upload URI: ${firebaseUploadUri}`);

          // Step 4: Upload to Firebase
          try {
            console.log(`📤 [AddDetails] Starting Firebase upload...`);
            await reference.putFile(firebaseUploadUri);
            console.log(`✅ [AddDetails] Upload SUCCESS`);

          } catch (uploadError: any) {
            console.error(`❌ [AddDetails] Firebase upload FAILED`);
            console.error(`❌ [AddDetails] Error code:`, uploadError.code);
            console.error(`❌ [AddDetails] Error message:`, uploadError.message);
            console.error(`❌ [AddDetails] Error name:`, uploadError.name);
            console.error(`❌ [AddDetails] Error userInfo:`, uploadError.userInfo);
            console.error(`❌ [AddDetails] Error nativeErrorCode:`, uploadError.nativeErrorCode);
            console.error(`❌ [AddDetails] Error nativeErrorMessage:`, uploadError.nativeErrorMessage);

            // Log all error properties
            console.error(`❌ [AddDetails] All error keys:`, Object.keys(uploadError));
            for (const key of Object.keys(uploadError)) {
              console.error(`❌ [AddDetails] ${key}:`, uploadError[key]);
            }

            throw new Error(`Firebase upload failed [${uploadError.code}]: ${uploadError.message}`);
          }

          // Step 5: Get download URL
          const downloadUrl = await reference.getDownloadURL();
          console.log(`✅ [AddDetails] Download URL obtained`);

          uploadedUrls.push(downloadUrl);
          uploadedMedia.push({
            url: downloadUrl,
            storagePath: storagePath,
            type: 'image',
          });
          setProgress(Math.round(((i + 1) / finalImageUris.length) * 50));
        }

        if (uploadedUrls.length === 0) throw new Error('Failed to upload any images');

        // STEP 4 — PREPARE POST DATA
        const tagArray = tags
          .split(/[,\s]+/)
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
          .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

        const hasDetails = !!(description.trim() || location.trim() || tagArray.length > 0);
        const firstImageUrl = uploadedUrls[0];

        const mediaArray = uploadedMedia.map((item, index) => ({
          type: 'image' as const,
          url: item.url,
          uri: item.url,
          storagePath: item.storagePath, // CRITICAL: Store storagePath for deletion
          id: `media-${index}`,
        }));

        const postData: any = {
          type: 'post',
          postId: postId,
          id: postId,
          createdBy: uid,
          userId: uid,
          username: user.displayName || user.email || 'User',
          mediaUrls: uploadedUrls,
          finalCroppedUrl: firstImageUrl,
          imageUrl: firstImageUrl,
          media: mediaArray,
          likeCount: 0,
          commentCount: 0,
          shareCount: 0,
          likedBy: [],
          savedBy: [],
          ratio: globalRatio as '1:1' | '4:5' | '16:9',
          aspectRatio: globalRatio === '1:1' ? 1 : globalRatio === '4:5' ? 0.8 : 16 / 9,
          createdAt: serverTimestamp(),
        };

        if (description.trim()) postData.caption = description.trim();
        if (location.trim()) {
          postData.location = location.trim();
          postData.placeName = location.trim();
        }
        if (hasDetails) postData.details = description.trim();
        if (tagArray.length > 0) postData.tags = tagArray;

        // STEP 5 — CREATE FIRESTORE DOCUMENT
        await setDoc(doc(db, 'posts', postId), postData);

        // STEP 6 — NAVIGATE TO HOME
        // Set success flag to bypass navigation guard
        isSuccessRef.current = true;

        setTimeout(() => {
          try {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
            });
          } catch (navError) {
            console.error('❌ [AddDetailsScreen] Navigation error:', navError);
            // Fallback for unexpected nav structures
            navigation.navigate('MainTabs', { screen: 'Home' });
          }
        }, 100);

      } catch (error: any) {
        console.error('❌ [AddDetailsScreen] Error creating post:', error);
        handleError(error, { onRetry: handlePost });
      } finally {
        setUploading(false);
        setProcessing(false);
        setProgress(0);
        setIsPosting(false);
      }
    });

    if (result === undefined) {
      console.log('🔒 [AddDetailsScreen] Post creation blocked by single flight guard');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Details</Text>
        <TouchableOpacity
          style={[styles.headerButton, (isPosting || uploading || processing || !authReady) && styles.headerButtonDisabled]}
          onPress={handlePost}
          disabled={isPosting || uploading || processing || !authReady || !user}
          activeOpacity={0.7}
        >
          {isPosting || uploading || processing ? (
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          ) : !authReady ? (
            <Text style={[styles.postButton, { opacity: 0.6 }]}>Initializing…</Text>
          ) : (
            <Text style={styles.postButton}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Media Preview */}
        {selectedImages.length > 0 && renderPreview && (
          <>
            {/* Main Preview */}
            {renderPreview}

            {/* Thumbnail Strip for Multiple Images */}
            {selectedImages.length > 1 && (
              <View style={styles.thumbnailContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailList}>
                  {selectedImages.map((asset, index) => {
                    const size = imageSizes[asset.id] || { width: 0, height: 0 };
                    const params = cropParams[asset.id] || { zoom: 1, offsetX: 0, offsetY: 0 };

                    // Calculate thumbnail dimensions maintaining aspect ratio
                    const thumbnailSize = 60;
                    let thumbnailWidth: number;
                    let thumbnailHeight: number;

                    switch (globalRatio) {
                      case '1:1':
                        thumbnailWidth = thumbnailSize;
                        thumbnailHeight = thumbnailSize;
                        break;
                      case '4:5':
                        thumbnailWidth = thumbnailSize;
                        thumbnailHeight = (thumbnailSize * 5) / 4;
                        break;
                      case '16:9':
                        thumbnailWidth = thumbnailSize;
                        thumbnailHeight = (thumbnailSize * 9) / 16;
                        break;
                      default:
                        thumbnailWidth = thumbnailSize;
                        thumbnailHeight = thumbnailSize;
                    }

                    if (size.width === 0 || size.height === 0) {
                      return (
                        <TouchableOpacity
                          key={asset.id}
                          style={[
                            styles.thumbnail,
                            { width: thumbnailWidth, height: thumbnailHeight },
                            previewIndex === index && styles.thumbnailActive,
                          ]}
                          onPress={() => setPreviewIndex(index)}
                        >
                          <ActivityIndicator size="small" color={Colors.brand.primary} />
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={asset.id}
                        style={[
                          styles.thumbnail,
                          { width: thumbnailWidth, height: thumbnailHeight },
                          previewIndex === index && styles.thumbnailActive,
                        ]}
                        onPress={() => {
                          setPreviewIndex(index);
                        }}
                      >
                        <Image
                          source={{ uri: asset.finalUri || asset.uri }}
                          style={{ width: thumbnailWidth, height: thumbnailHeight }}
                          resizeMode="contain" // 🔐 FIX: Consistency
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Write a caption..."
            placeholderTextColor={Colors.black.qua}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.locationInputContainer}>
            <Icon name="location-outline" size={20} color={Colors.black.qua} />
            <TextInput
              style={styles.locationInput}
              placeholder="Add location"
              placeholderTextColor={Colors.black.qua}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.label}>Tags / Hashtags</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Add tags (e.g., travel, adventure, #kashmir)"
            placeholderTextColor={Colors.black.qua}
            value={tags}
            onChangeText={setTags}
            multiline
          />
          <Text style={styles.hint}>
            Separate tags with commas or spaces. Hashtags will be added automatically.
          </Text>
        </View>

        {/* Upload Progress */}
        {(uploading || processing) && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {processing ? 'Processing images...' : `Uploading... ${progress}%`}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  headerButton: {
    width: 60,
    alignItems: 'flex-start',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 18,
    color: Colors.black.primary,
  },
  postButton: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.brand.primary,
  },
  content: {
    flex: 1,
  },
  imagePreview: {
    width: '100%',
    backgroundColor: Colors.white.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCropBox: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: Colors.black.primary,
    marginBottom: 8,
  },
  textInput: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.black.primary,
    backgroundColor: Colors.white.secondary,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
  },
  charCount: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.black.qua,
    textAlign: 'right',
    marginTop: 4,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    gap: 8,
  },
  locationInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.black.primary,
    paddingVertical: 12,
  },
  hint: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.black.qua,
    marginTop: 4,
    lineHeight: 16,
  },
  progressContainer: {
    padding: 16,
    backgroundColor: Colors.white.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.white.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
  },
  progressText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.black.qua,
    textAlign: 'center',
  },
  thumbnailContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  thumbnailList: {
    gap: 8,
  },
  thumbnail: {
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbnailActive: {
    borderColor: Colors.brand.primary,
  },
  thumbnailCropBox: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
