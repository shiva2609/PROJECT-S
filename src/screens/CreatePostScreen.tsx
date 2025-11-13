import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { colors } from '../utils/colors';
import { useAuth } from '../contexts/AuthContext';

export default function CreatePostScreen() {
  const { user, initialized } = useAuth();
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Request storage permission for Android
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // Android 13+ (API 33+) uses READ_MEDIA_IMAGES
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Access Photos',
              message: 'Sanchari needs access to your gallery to upload photos.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // Android 12 and below use READ_EXTERNAL_STORAGE
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Access Photos',
              message: 'Sanchari needs access to your gallery to upload photos.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.error('❌ Permission request error:', err);
        return false;
      }
    }
    // iOS permissions are handled automatically by react-native-image-picker
    return true;
  };

  // Log auth state at the top
  console.log('✅ Auth state:', { initialized, userExists: !!user, uid: user?.uid });

  // Wait for auth initialization BEFORE rendering any content
  if (!initialized) {
    console.log('⏳ Waiting for auth initialization...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.mutedText }}>Loading user...</Text>
      </View>
    );
  }

  // Check if user is logged in
  if (!user) {
    console.log('❌ User not logged in');
    Alert.alert('Login Required', 'You must be logged in to create a post.');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
        <Text style={{ color: colors.mutedText, fontSize: 16 }}>Please log in to create a post</Text>
      </View>
    );
  }

  const handleSelectImage = async () => {
    try {
      // Request permissions before launching image picker
      const granted = await requestStoragePermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Please allow access to photos to upload images.');
        return;
      }

      console.log('📸 Launching image picker (no base64 needed)...');
      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: false, // ✅ Not needed anymore - using direct file upload
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets?.length) {
        console.log('ℹ️ User cancelled image selection');
        return;
      }

      if (result.errorMessage) {
        console.error('❌ Image picker error:', result.errorMessage);
        Alert.alert('Error', `Failed to pick image: ${result.errorMessage}`);
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        console.error('❌ No image asset found');
        Alert.alert('Error', 'No image selected');
        return;
      }

      console.log('✅ Image selected:', {
        uri: asset.uri?.substring(0, 60) + '...',
        fileName: asset.fileName,
        type: asset.type,
        fileSize: asset.fileSize,
      });

      setImage(asset);
      setProgress(0); // Reset progress
    } catch (error: any) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
    }
  };

  const uploadImage = async (imageAsset: any): Promise<string> => {
    if (!imageAsset?.uri) {
      throw new Error('No image selected');
    }

    const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const reference = storage().ref(`/posts/${user.uid}/${fileName}`);

    // Fix URI format for Android/iOS compatibility
    // React Native Firebase Storage handles file:// and content:// URIs natively
    // iOS requires path without file:// prefix, Android works with or without
    let uploadUri = imageAsset.uri;
    if (Platform.OS === 'ios') {
      // iOS: Remove file:// prefix - Firebase Storage expects absolute path
      if (uploadUri.startsWith('file://')) {
        uploadUri = uploadUri.replace('file://', '');
      }
    }
    // Android: Keep original URI (supports file://, content://, and absolute paths)

    console.log('📤 Starting upload to Firebase Storage...');
    console.log('   Path:', `/posts/${user.uid}/${fileName}`);
    console.log('   Original URI:', imageAsset.uri.substring(0, 60) + '...');
    console.log('   Upload URI:', uploadUri.substring(0, 60) + '...');
    console.log('   Platform:', Platform.OS);

    const task = reference.putFile(uploadUri);

    return new Promise((resolve, reject) => {
      task.on('state_changed',
        (taskSnapshot) => {
          const percent = Math.round((taskSnapshot.bytesTransferred / taskSnapshot.totalBytes) * 100);
          setProgress(percent);
          console.log(`📊 Upload progress: ${percent}%`);
        },
        (error) => {
          console.error('❌ Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const url = await reference.getDownloadURL();
            console.log('✅ Upload complete! URL:', url.substring(0, 60) + '...');
            resolve(url);
          } catch (urlError: any) {
            console.error('❌ Error getting download URL:', urlError);
            reject(urlError);
          }
        }
      );
    });
  };

  const handlePost = async () => {
    if (!image?.uri) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Error', 'Please write a caption');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      console.log('📝 Starting post creation process...');
      console.log('🔑 Current User ID:', user.uid);

      // Upload image to Firebase Storage with progress tracking
      const imageUrl = await uploadImage(image);

      // Get current user from React Native Firebase Auth
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Create post document in Firestore
      console.log('📝 Creating Firestore document...');
      const postData = {
        type: 'post',
        createdBy: currentUser.uid, // Primary field
        userId: currentUser.uid, // Legacy field for backward compatibility
        username: currentUser.displayName || currentUser.email || 'User',
        imageUrl,
        caption: caption.trim(),
        likeCount: 0,
        commentCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(), // Always use serverTimestamp
      };

      console.log('📄 Post data:', { ...postData, createdAt: '[serverTimestamp]' });

      await firestore().collection('posts').add(postData);

      console.log('✅ Post created successfully!');

      // Reset form
      setCaption('');
      setImage(null);
      setProgress(0);

      Alert.alert('Success', 'Post uploaded successfully!');
    } catch (err: any) {
      console.error('❌ Error creating post:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
      });

      let errorMessage = 'Failed to create post';
      if (err.code === 'storage/permission-denied') {
        errorMessage = 'Permission denied. Please check your Firebase Storage rules.';
      } else if (err.code === 'storage/unauthorized') {
        errorMessage = 'Unauthorized. Please check your Firebase Storage rules.';
      } else if (err.code === 'unavailable' || err.message?.includes('network')) {
        errorMessage = 'Network unavailable. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.imageContainer}>
        <TouchableOpacity style={styles.upload} onPress={handleSelectImage}>
          {image?.uri ? (
            <Image source={{ uri: image.uri }} style={styles.preview} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>Pick an image</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Upload progress overlay */}
        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.progressText}>Uploading... {progress}%</Text>
          </View>
        )}
      </View>

      <TextInput
        placeholder="Write a caption..."
        placeholderTextColor={colors.mutedText}
        style={styles.input}
        multiline
        value={caption}
        onChangeText={setCaption}
        editable={!uploading}
      />

      <TouchableOpacity 
        style={[styles.btn, (uploading || !image) && styles.btnDisabled]} 
        onPress={handlePost}
        disabled={uploading || !image}
      >
        {uploading ? (
          <View style={styles.btnContent}>
            <ActivityIndicator color="white" size="small" />
            <Text style={[styles.btnText, { marginLeft: 8 }]}>Uploading...</Text>
          </View>
        ) : (
          <Text style={styles.btnText}>Share</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.surface 
  },
  imageContainer: {
    position: 'relative',
  },
  upload: {
    height: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  uploadText: { 
    color: colors.mutedText,
    fontSize: 16,
  },
  preview: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 12 
  },
  uploadOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  progressText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  input: { 
    marginTop: 16, 
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 12, 
    padding: 12, 
    minHeight: 100, 
    backgroundColor: 'white',
    color: colors.text,
    fontSize: 16,
  },
  btn: { 
    backgroundColor: colors.primary, 
    padding: 14, 
    borderRadius: 12, 
    marginTop: 16, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnDisabled: { 
    opacity: 0.6 
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: { 
    color: 'white', 
    fontWeight: '700',
    fontSize: 16,
  },
});
