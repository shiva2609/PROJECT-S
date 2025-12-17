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
import auth from '@react-native-firebase/auth';
import { Platform, InteractionManager } from 'react-native';
import { useCreateFlowStore } from '../../store/stores/useCreateFlowStore';
import { processFinalCrops } from '../../utils/finalCropProcessor';
import { getCropBoxDimensions, getImageTransform } from '../../utils/cropMath';
import { db } from '../../services/auth/authService';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AddDetailsScreen({ navigation }: any) {
  console.log('🔥🔥🔥 MOUNTED: AddDetailsScreen — src/screens/Create/AddDetailsScreen.tsx 🔥🔥🔥');
  console.log('🟢 [AddDetailsScreen] Component mounted/rendered');

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
  const [isPosting, setIsPosting] = useState(false); // Prevent duplicate posts

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

  // Track mount status
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Load image sizes
  useEffect(() => {
    const loadSizes = async () => {
      const sizes: { [id: string]: { width: number; height: number } } = {};

      for (const asset of selectedImages) {
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
                if (isMounted) {
                  sizes[asset.id] = { width: 0, height: 0 };
                }
                resolve();
              }
            );
          });
        } catch (error) {
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
    const params = cropParams[asset.id] || { zoom: 1, offsetX: 0, offsetY: 0 };
    const size = imageSizes[asset.id] || { width: 0, height: 0 };

    if (size.width === 0 || size.height === 0) {
      return (
        <View style={[styles.imagePreview, { height: previewDimensions.height }]}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      );
    }

    const transform = getImageTransform(
      params,
      size.width,
      size.height,
      previewDimensions.width,
      previewDimensions.height
    );

    return (
      <View style={[styles.imagePreview, { height: previewDimensions.height }]}>
        <View style={[styles.previewCropBox, { width: previewDimensions.width, height: previewDimensions.height }]}>
          <Image
            source={{ uri: asset.uri }}
            style={[
              {
                width: size.width,
                height: size.height,
              },
              transform,
            ]}
            resizeMode="contain"
          />
        </View>
      </View>
    );
  }, [selectedImages, previewIndex, cropParams, imageSizes, previewDimensions]);

  const handlePost = async () => {
    console.warn('🔵 [AddDetailsScreen] POST button clicked - START');

    if (isPosting) return;
    if (!isMounted) return;

    if (selectedImages.length === 0) {
      if (isMounted) Alert.alert('Error', 'No images to post');
      return;
    }

    setIsPosting(true);
    setUploading(true);
    setProcessing(true);
    setProgress(0);

    try {
      // STEP 1 — MANDATORY AUTH GATE (NO SHORTCUTS)
      const { requireAuthUser } = await import('@/services/auth/requireAuthUser');
      console.warn('🔐 Requiring authenticated user...');
      const authUser = await requireAuthUser() as import('@react-native-firebase/auth').FirebaseAuthTypes.User;
      const uid = authUser.uid;
      console.warn('✅ Auth user verified. UID:', uid);

      // STEP 2 — PROCESS FINAL CROPS
      console.warn('🟢 [AddDetailsScreen] Step 1: Processing final crops...');
      const finalImageUris = await processFinalCrops(
        selectedImages,
        cropParams,
        globalRatio,
        cropBoxDimensions.width,
        cropBoxDimensions.height
      );

      if (finalImageUris.length === 0) throw new Error('No images processed');
      console.warn('✅ Processed', finalImageUris.length, 'images');

      // STEP 3 — GENERATE POST ID UPFRONT
      const postId = `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      console.warn('🟢 [AddDetailsScreen] Generated postId:', postId);

      // STEP 4 — UPLOAD IMAGES
      console.warn('🟢 [AddDetailsScreen] Step 2: Uploading images...');
      const uploadedUrls: string[] = [];
      for (let i = 0; i < finalImageUris.length; i++) {
        console.warn(`📤 Uploading image ${i + 1}/${finalImageUris.length}...`);

        const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storagePath = `users/${uid}/posts/${postId}/${fileName}`;
        const reference = storage().ref(storagePath);

        let uploadUri = finalImageUris[i];
        if (!uploadUri) {
          console.warn(`⚠️ Skipping image ${i + 1} - no URI`);
          continue;
        }

        if (Platform.OS === 'ios' && uploadUri.startsWith('file://')) {
          uploadUri = uploadUri.replace('file://', '');
        }

        // Token already refreshed by requireAuthUser, but add settle delay
        await new Promise(resolve => setTimeout(resolve, 300));

        await reference.putFile(uploadUri);
        const downloadUrl = await reference.getDownloadURL();

        uploadedUrls.push(downloadUrl);
        setProgress(Math.round(((i + 1) / finalImageUris.length) * 50));
        console.warn(`✅ Image ${i + 1} uploaded`);
      }

      if (uploadedUrls.length === 0) throw new Error('Failed to upload any images');

      // STEP 5 — PREPARE POST DATA
      const tagArray = tags
        .split(/[,\s]+/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      const hasDetails = !!(description.trim() || location.trim() || tagArray.length > 0);
      const firstImageUrl = uploadedUrls[0];

      const mediaArray = uploadedUrls.map((url, index) => ({
        type: 'image' as const,
        url: url,
        uri: url,
        id: `media-${index}`,
      }));

      const postData: any = {
        type: 'post',
        postId: postId,
        id: postId,
        createdBy: uid,
        userId: uid,
        username: authUser.displayName || authUser.email || 'User',
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

      // STEP 6 — CREATE FIRESTORE DOCUMENT
      console.warn('🟢 [AddDetailsScreen] Step 3: Creating Firestore document...');
      await setDoc(doc(db, 'posts', postId), postData);
      console.warn('✅ Post document created successfully');

      // STEP 7 — NAVIGATE TO HOME
      if (isMounted) {
        setTimeout(() => {
          if (isMounted) {
            try {
              const rootNav = (navigation as any).getParent?.() || (navigation as any).getParent?.('Stack') || navigation;
              rootNav.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
              });
            } catch (navError) {
              console.error('❌ [AddDetailsScreen] Navigation error:', navError);
            }
          }
        }, 100);
      }
    } catch (error: any) {
      console.error('❌ [AddDetailsScreen] Error creating post:', error);
      if (isMounted) {
        setTimeout(() => {
          if (isMounted) {
            const errorMessage = error.message === 'AUTH_NOT_READY'
              ? 'Authentication is still initializing. Please wait and try again.'
              : error.message || 'Failed to create post';
            Alert.alert('Error', errorMessage);
          }
        }, 500);
      }
    } finally {
      // STEP 5 — ENSURE FINALLY BLOCK (MANDATORY)
      if (isMounted) {
        setUploading(false);
        setProcessing(false);
        setProgress(0);
        setIsPosting(false);
      }
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
          style={[styles.headerButton, (isPosting || uploading || processing) && styles.headerButtonDisabled]}
          onPress={handlePost}
          disabled={isPosting || uploading || processing}
          activeOpacity={0.7}
        >
          {isPosting || uploading || processing ? (
            <ActivityIndicator size="small" color={Colors.brand.primary} />
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

                    // Apply transform for thumbnail
                    const thumbnailTransform = getImageTransform(
                      params,
                      size.width,
                      size.height,
                      thumbnailWidth,
                      thumbnailHeight
                    );

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
                        <View style={[styles.thumbnailCropBox, { width: thumbnailWidth, height: thumbnailHeight }]}>
                          <Image
                            source={{ uri: asset.uri }}
                            style={[
                              {
                                width: size.width,
                                height: size.height,
                              },
                              thumbnailTransform,
                            ]}
                            resizeMode="contain"
                          />
                        </View>
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
