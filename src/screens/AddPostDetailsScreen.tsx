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
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useAuth } from '../contexts/AuthContext';
import { navigateToScreen } from '../utils/navigationHelpers';
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
      croppedImageUri?: string;
      originalImageUri?: string;
      croppedMedia?: CropData[];
      contentType?: 'post' | 'reel';
      selectedImages?: Array<{
        uri: string;
        width?: number;
        height?: number;
        id: string;
        createdAt?: number;
        type?: 'image' | 'video';
      }>;
    };
  };
}

export default function AddPostDetailsScreen({
  navigation,
  route,
}: AddPostDetailsScreenProps) {
  const { user } = useAuth();
  const { croppedImageUri, croppedMedia = [], contentType = 'post', selectedImages = [] } = route.params;
  
  // Use croppedMedia if available, otherwise fallback to single croppedImageUri
  const [mediaItems, setMediaItems] = useState<CropData[]>(() => {
    if (croppedMedia && croppedMedia.length > 0) {
      return croppedMedia;
    }
    if (croppedImageUri) {
      return [{
        id: croppedImageUri,
        finalUri: croppedImageUri,
        ratio: '4:5',
        cropData: {
          ratio: '4:5',
          zoomScale: 1,
          offsetX: 0,
          offsetY: 0,
          frameWidth: 0,
          frameHeight: 0,
        },
        type: 'image' as const,
      }];
    }
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
    if (croppedMedia && croppedMedia.length > 0) {
      setMediaItems(croppedMedia);
    }
  }, [croppedMedia]);

  const getAspectRatioValue = (ratio: string): number => {
    switch (ratio) {
      case '1:1': return 1;
      case '4:5': return 0.8;
      case '16:9': return 16/9;
      default: return 1;
    }
  };

  const uploadImage = async (imageUri: string): Promise<string> => {
    const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const reference = storage().ref(`/posts/${user?.uid}/${fileName}`);

    let uploadUri = imageUri;
    if (Platform.OS === 'ios' && uploadUri.startsWith('file://')) {
      uploadUri = uploadUri.replace('file://', '');
    }

    const task = reference.putFile(uploadUri);

    return new Promise((resolve, reject) => {
      task.on(
        'state_changed',
        (taskSnapshot) => {
          const percent = Math.round(
            (taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) * 100
          );
          setProgress(percent);
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const url = await reference.getDownloadURL();
            resolve(url);
          } catch (urlError: any) {
            reject(urlError);
          }
        }
      );
    });
  };

  const handleAdjustImage = (index: number) => {
    const item = mediaItems[index];
    if (!item) return;

    // Navigate to CropAdjustScreen for this specific image
    // Pass finalUri so it opens the already-cropped image for re-editing
    navigateToScreen(navigation, 'CropAdjust', {
      contentType,
      selectedImages: selectedImages.length > 0 ? selectedImages : mediaItems.map(m => ({
        uri: m.finalUri, // Use finalUri, not originalUri
        id: m.id,
        type: m.type,
      })),
      imageUri: item.finalUri, // Use finalUri for editing
      currentImageIndex: index,
      allowMultiple: mediaItems.length > 1,
      croppedMedia: mediaItems,
    });
  };

  const handlePreviewImage = (index: number) => {
    // Navigate to PreviewScreen
    navigateToScreen(navigation, 'PostPreview', {
      croppedMedia: mediaItems,
      postType: contentType,
      currentIndex: index,
    });
  };

  const handlePost = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to create a post');
      return;
    }

    if (mediaItems.length === 0) {
      Alert.alert('Error', 'No media to post');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Upload first cropped image (for now, handle multiple later)
      const firstItem = mediaItems[0];
      const imageUriToUpload = firstItem.finalUri; // Use only finalUri
      const imageUrl = await uploadImage(imageUriToUpload);

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

      // Create post document
      const postData = {
        type: 'post',
        createdBy: currentUser.uid,
        userId: currentUser.uid,
        username: currentUser.displayName || currentUser.email || 'User',
        imageUrl,
        caption: description.trim(),
        location: location.trim() || undefined,
        placeName: location.trim() || undefined,
        details: hasDetails ? description.trim() : undefined,
        tags: tagArray,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        likedBy: [],
        savedBy: [],
        aspectRatio: getAspectRatioValue(firstItem.cropData.ratio),
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('posts').add(postData);

      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to home
            const rootNav = (navigation as any).getParent?.() || (navigation as any).getParent?.('Stack') || navigation;
            rootNav.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const currentPreviewItem = mediaItems[previewIndex];
  const previewImageUri = currentPreviewItem?.finalUri; // Use only finalUri

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
            <TouchableOpacity
              style={styles.imagePreview}
              activeOpacity={0.9}
              onPress={() => handlePreviewImage(previewIndex)}
            >
              <Image
                source={{ uri: previewImageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

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
