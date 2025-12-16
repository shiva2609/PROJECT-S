import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useAuth } from '../../providers/AuthProvider';
import { navigateToScreen } from '../../utils/navigationHelpers';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';

interface CropData {
  id: string;
  finalUri: string; // The actual cropped bitmap file
  ratio: '1:1' | '4:5' | '16:9';
  cropData: {
    ratio: '1:1' | '4:5' | '16:9';
    zoomScale: number;
    offsetX: number;
    offsetY: number;
    frameWidth: number;
    frameHeight: number;
  };
  type: 'image' | 'video';
}

interface AddPostDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      finalMedia?: CropData[]; // REAL cropped bitmaps - no fallbacks
      croppedMedia?: CropData[]; // Legacy - will be removed
      contentType?: 'post' | 'reel';
      // Removed: croppedImageUri, originalImageUri, selectedImages - no longer used
    };
  };
}

export default function AddPostDetailsScreen({
  navigation,
  route,
}: AddPostDetailsScreenProps) {
  console.log('🟢 [AddPostDetailsScreen] Component mounted/rendered');
  console.log('🟢 [AddPostDetailsScreen] Route params:', {
    hasFinalMedia: !!route.params?.finalMedia,
    finalMediaLength: route.params?.finalMedia?.length || 0,
    hasCroppedMedia: !!route.params?.croppedMedia,
    croppedMediaLength: route.params?.croppedMedia?.length || 0,
    contentType: route.params?.contentType,
  });

  const { user } = useAuth();
  const { finalMedia = [], croppedMedia = [], contentType = 'post' } = route.params;

  useEffect(() => {
    console.log('🟢 [AddPostDetailsScreen] useEffect - Component mounted');
    return () => {
      console.log('🔴 [AddPostDetailsScreen] useEffect cleanup - Component unmounting');
    };
  }, []);

  // Use finalMedia (REAL cropped bitmaps) - NO fallbacks to original URIs
  const [mediaItems, setMediaItems] = useState<CropData[]>(() => {
    // Prefer finalMedia (new format with real bitmaps)
    if (finalMedia && finalMedia.length > 0) {
      console.log('🟢 [AddPostDetailsScreen] Using finalMedia:', finalMedia.length, 'items');
      return finalMedia;
    }

    // Legacy support for croppedMedia (will be removed)
    if (croppedMedia && croppedMedia.length > 0) {
      console.log('⚠️ [AddPostDetailsScreen] Using legacy croppedMedia format');
      return croppedMedia;
    }

    // NO fallback - if no media, return empty array
    console.warn('⚠️ [AddPostDetailsScreen] No media provided - empty array');
    return [];
  });

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Update mediaItems when route params change (from CropAdjustScreen)
  useEffect(() => {
    if (finalMedia && finalMedia.length > 0) {
      console.log('🟢 [AddPostDetailsScreen] finalMedia updated:', finalMedia.length, 'items');
      setMediaItems(finalMedia);
    } else if (croppedMedia && croppedMedia.length > 0) {
      console.log('⚠️ [AddPostDetailsScreen] Using legacy croppedMedia');
      setMediaItems(croppedMedia);
    }
  }, [finalMedia, croppedMedia]);

  const getAspectRatioValue = (ratio: string): number => {
    switch (ratio) {
      case '1:1': return 1;
      case '4:5': return 0.8;
      case '16:9': return 16 / 9;
      default: return 1;
    }
  };

  const uploadImage = async (imageUri: string, postId: string): Promise<string> => {
    console.log('📤 [AddPostDetailsScreen] uploadImage called');
    console.log('📤 [AddPostDetailsScreen] Upload params:', {
      imageUri: imageUri.substring(0, 50) + '...',
      userId: user?.uid,
      postId,
      platform: Platform.OS,
    });

    // V1 Canonical Path: users/{userId}/posts/{postId}/{mediaId}
    const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storagePath = `users/${user?.uid}/posts/${postId}/${fileName}`;
    console.warn(`[UPLOAD] Storage path: ${storagePath}`);

    const reference = storage().ref(storagePath);

    let uploadUri = imageUri;
    if (Platform.OS === 'ios' && uploadUri.startsWith('file://')) {
      uploadUri = uploadUri.replace('file://', '');
    }

    // FORCE TOKEN HYDRATION (MANDATORY)
    const currentUser = auth().currentUser;
    console.warn('[UPLOAD] auth.currentUser:', currentUser?.uid);

    if (!currentUser) {
      console.error('[UPLOAD ERROR] No authenticated user found before upload');
      throw new Error('User not authenticated - cannot upload');
    }

    try {
      console.warn('[UPLOAD] Forcing token refresh before upload...');
      const token = await currentUser.getIdToken(true);
      console.warn(`[UPLOAD] Token refreshed successfully. User: ${currentUser.uid}`);
      console.warn(`[UPLOAD] Has Token: ${!!token}`);
    } catch (tokenError) {
      console.error('[UPLOAD ERROR] Failed to refresh token:', tokenError);
      throw new Error('Failed to refresh auth token before upload');
    }

    console.warn('[UPLOAD] Starting putFile upload...');
    const task = reference.putFile(uploadUri);

    return new Promise((resolve, reject) => {
      task.on(
        'state_changed',
        (taskSnapshot) => {
          const percent = Math.round(
            (taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) * 100
          );
          setProgress(percent);
          if (percent % 25 === 0) { // Log every 25% to avoid spam
            console.warn(`[UPLOAD] Progress: ${percent}%`);
          }
        },
        (error) => {
          console.error('[UPLOAD ERROR FULL]', error);
          reject(error);
        },
        async () => {
          try {
            console.warn('[UPLOAD] Upload complete, getting download URL...');
            const url = await reference.getDownloadURL();
            console.warn(`[UPLOAD] Download URL obtained: ${url.substring(0, 50)}...`);
            resolve(url);
          } catch (urlError: any) {
            console.error('[UPLOAD ERROR] Error getting download URL:', urlError);
            reject(urlError);
          }
        }
      );
    });
  };

  const handleAdjustImage = (index: number) => {
    const item = mediaItems[index];
    if (!item) return;

    // Navigate to CropAdjustScreen for re-editing
    // Pass the finalUri as the image to edit (it's already a cropped bitmap)
    navigateToScreen(navigation, 'CropAdjust', {
      contentType,
      selectedImages: mediaItems.map(m => ({
        uri: m.finalUri, // Use finalUri (cropped bitmap) for re-editing
        id: m.id,
        type: m.type,
      })),
      imageUri: item.finalUri, // Use finalUri (cropped bitmap) for editing
      currentImageIndex: index,
      allowMultiple: mediaItems.length > 1,
      croppedMedia: mediaItems, // Pass current media for context
    });
  };

  const handlePreviewImage = (index: number) => {
    // Preview is now handled inline - no navigation to separate preview screen
    // This prevents the ghost "Processing" screen from appearing
    setPreviewIndex(index);
  };

  const handlePost = async () => {
    console.log('🔵 [AddPostDetailsScreen] POST button clicked - START');
    console.log('🔵 [AddPostDetailsScreen] Current screen state:', {
      mediaItemsCount: mediaItems.length,
      hasUser: !!user,
      currentScreen: 'AddPostDetailsScreen',
    });

    if (!user) {
      console.log('❌ [AddPostDetailsScreen] No user, aborting');
      Alert.alert('Error', 'Please log in to create a post');
      return;
    }

    if (mediaItems.length === 0) {
      console.log('❌ [AddPostDetailsScreen] No media items, aborting');
      Alert.alert('Error', 'No media to post');
      return;
    }

    console.log('🔵 [AddPostDetailsScreen] Setting uploading state to true');
    setUploading(true);
    setProgress(0);

    try {
      if (mediaItems.length === 0) {
        console.log('❌ [AddPostDetailsScreen] No media items, aborting');
        Alert.alert('Error', 'No media to upload');
        return;
      }

      const firstItem = mediaItems[0];
      if (!firstItem) {
        console.log('❌ [AddPostDetailsScreen] First item is null, aborting');
        Alert.alert('Error', 'No media to upload');
        return;
      }

      // Generate postId client-side BEFORE upload
      const postId = `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log('🔵 [AddPostDetailsScreen] Starting image uploads...');
      console.log('🔵 [AddPostDetailsScreen] Upload details:', {
        postId,
        userId: user.uid,
        totalImages: mediaItems.length,
        firstItemRatio: firstItem.ratio,
      });

      // Upload ALL images to Firebase Storage
      const mediaUrls: string[] = [];
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (!item?.finalUri) {
          console.warn(`⚠️ [AddPostDetailsScreen] Skipping item ${i} - no finalUri`);
          continue;
        }

        console.log(`📤 [AddPostDetailsScreen] Uploading image ${i + 1}/${mediaItems.length}...`);
        const imageUrl = await uploadImage(item.finalUri, postId);
        mediaUrls.push(imageUrl);
        console.log(`✅ [AddPostDetailsScreen] Image ${i + 1} uploaded: ${imageUrl.substring(0, 50)}...`);
      }

      if (mediaUrls.length === 0) {
        throw new Error('Failed to upload any images');
      }

      console.log('✅ [AddPostDetailsScreen] All images uploaded successfully');
      console.log(`✅ [AddPostDetailsScreen] Total URLs: ${mediaUrls.length}`);

      // Get current user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Parse tags/hashtags
      const tagArray = tags
        .split(/[,\s]+/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

      // Determine if post has details
      const hasDetails = !!(description.trim() || location.trim() || tagArray.length > 0);

      // Create post document with mediaUrls array (multi-image support)
      // CRITICAL: mediaUrls contains the FINAL cropped bitmap URLs (exact adjusted frames)
      const firstImageUrl = mediaUrls[0] || '';

      console.log('🔵 [AddPostDetailsScreen] Creating post document with final cropped bitmaps:');
      console.log('🔵 [AddPostDetailsScreen] mediaUrls count:', mediaUrls.length);
      console.log('🔵 [AddPostDetailsScreen] firstImageUrl (finalCroppedUrl):', firstImageUrl.substring(0, 80) + '...');
      console.log('🔵 [AddPostDetailsScreen] Aspect ratio:', firstItem.cropData.ratio);

      // CRITICAL: Build media array for compatibility (contains FINAL cropped bitmap URLs)
      // This ensures PostCard and other components can read from either mediaUrls or media array
      // IMPORTANT: mediaUrls contains the uploaded final cropped bitmap URLs from Firebase Storage
      // These are NOT original images - they are the exact bitmaps exported from CropAdjustScreen
      const mediaArray = mediaUrls.map((url, index) => {
        // CRITICAL: url is a Firebase Storage URL pointing to the final cropped bitmap
        // This is NOT the original gallery image - it's the processed bitmap with fixed aspect ratio
        console.log(`🔵 [AddPostDetailsScreen] Media array item ${index}: ${url.substring(0, 50)}...`);
        return {
          type: 'image' as const,
          url: url, // FINAL cropped bitmap URL from Firebase Storage (primary field)
          uri: url, // FINAL cropped bitmap URL from Firebase Storage (backward compatibility)
          id: `media-${index}`,
        };
      });

      const postData = {
        type: 'post',
        postId: postId, // Use the pre-generated postId
        ownerId: currentUser.uid,
        createdBy: currentUser.uid,
        userId: currentUser.uid,
        username: currentUser.displayName || currentUser.email || 'User',
        // PRIMARY: mediaUrls array contains FINAL cropped bitmap URLs (exact adjusted frames)
        mediaUrls: mediaUrls, // Array of all uploaded FINAL cropped bitmap URLs
        // CRITICAL: media array also contains FINAL cropped bitmap URLs (for compatibility)
        media: mediaArray, // Array of media objects with FINAL cropped bitmap URLs
        // CRITICAL: finalCroppedUrl is the PRIMARY field for single image posts (REAL cropped bitmap)
        finalCroppedUrl: firstImageUrl, // FINAL cropped bitmap URL (exact adjusted frame)
        // Legacy fields for backward compatibility
        imageUrl: firstImageUrl, // Legacy field (FINAL cropped bitmap URL)
        caption: description.trim(),
        location: location.trim() || undefined,
        placeName: location.trim() || undefined,
        details: hasDetails ? description.trim() : undefined,
        tags: tagArray,
        ratio: firstItem.cropData.ratio, // Aspect ratio of FIRST image
        likeCount: 0,
        commentsCount: 0,
        commentCount: 0, // Legacy field
        shareCount: 0,
        likedBy: [],
        savedBy: [],
        aspectRatio: getAspectRatioValue(firstItem.cropData.ratio),
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      // CRITICAL: Log the post data to verify all URLs are final cropped bitmaps
      console.log('🔵 [AddPostDetailsScreen] Post data structure:', {
        mediaUrlsCount: postData.mediaUrls.length,
        mediaArrayCount: postData.media.length,
        finalCroppedUrl: postData.finalCroppedUrl?.substring(0, 50) + '...',
        imageUrl: postData.imageUrl?.substring(0, 50) + '...',
        ratio: postData.ratio,
        aspectRatio: postData.aspectRatio,
      });

      console.log('🔵 [AddPostDetailsScreen] Creating Firestore document...');
      await firestore().collection('posts').doc(postId).set(postData); // Use set() with specific ID
      console.log('✅ [AddPostDetailsScreen] Post document created successfully');

      // Navigate directly to home without alert to prevent ghost screens
      // Use setTimeout to ensure navigation happens after state updates
      console.log('🔵 [AddPostDetailsScreen] Preparing navigation to Home...');
      console.log('🔵 [AddPostDetailsScreen] Current navigation state:', {
        canGoBack: navigation.canGoBack?.(),
        getState: navigation.getState?.(),
      });

      setTimeout(() => {
        try {
          console.log('🔵 [AddPostDetailsScreen] Executing navigation reset...');
          const rootNav = (navigation as any).getParent?.() || (navigation as any).getParent?.('Stack') || navigation;
          console.log('🔵 [AddPostDetailsScreen] Root navigator obtained:', {
            hasReset: typeof rootNav.reset === 'function',
            navigatorType: rootNav.constructor?.name,
          });

          rootNav.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
          });

          console.log('✅ [AddPostDetailsScreen] Navigation reset completed - should be on Home now');
        } catch (navError) {
          console.error('❌ [AddPostDetailsScreen] Navigation error:', navError);
        }
      }, 100);
    } catch (error: any) {
      console.error('❌ [AddPostDetailsScreen] Error creating post:', error);
      console.error('❌ [AddPostDetailsScreen] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack?.substring(0, 200),
      });
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      console.log('🔵 [AddPostDetailsScreen] Finally block - resetting upload state');
      setUploading(false);
      setProgress(0);
      console.log('✅ [AddPostDetailsScreen] POST flow completed');
    }
  };

  // INSTAGRAM LOGIC: Use ONLY final rendered bitmaps (no original images, no transform re-application)
  // finalUri contains the final cropped bitmap with exact dimensions (1080x1080, 1080x1350, or 1920x1080)
  const currentPreviewItem = mediaItems[previewIndex];
  const previewImageUri = currentPreviewItem?.finalUri; // FINAL rendered bitmap - no fallback

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
          style={styles.headerButton}
          onPress={handlePost}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.brand.primary} />
          ) : (
            <Text style={styles.postButton}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Media Preview */}
        {mediaItems.length > 0 && previewImageUri && (
          <>
            {/* Main Preview */}
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: previewImageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>

            {/* Thumbnail Strip for Multiple Images */}
            {mediaItems.length > 1 && (
              <View style={styles.thumbnailContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailList}>
                  {mediaItems.map((item, index) => {
                    const itemImageUri = item.finalUri; // Use only finalUri
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.thumbnail,
                          previewIndex === index && styles.thumbnailActive,
                        ]}
                        onPress={() => {
                          setPreviewIndex(index);
                        }}
                      >
                        <Image
                          source={{ uri: itemImageUri }}
                          style={styles.thumbnailImage}
                          resizeMode="cover"
                        />
                        {item.type === 'video' && (
                          <View style={styles.videoBadge}>
                            <Icon name="play" size={12} color={Colors.white.primary} />
                          </View>
                        )}
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
        {uploading && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>Uploading... {progress}%</Text>
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
    height: 340,
    backgroundColor: Colors.white.tertiary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
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
    width: 60,
    height: 60,
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
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  adjustBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    padding: 4,
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 2,
  },
});
