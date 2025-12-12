import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { launchImageLibrary, launchCamera, MediaType } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { colors } from '../../utils/colors';
import { useAuth } from '../../providers/AuthProvider';
import Icon from 'react-native-vector-icons/Ionicons';

export default function CreateReelScreen({ navigation }: any) {
  const { user, initialized } = useAuth();
  const [caption, setCaption] = useState('');
  const [video, setVideo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Request storage permission for Android
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        // Android 13+ (API 33+) uses READ_MEDIA_VIDEO
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
            {
              title: 'Access Videos',
              message: 'Sanchari needs access to your gallery to upload videos.',
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
              title: 'Access Videos',
              message: 'Sanchari needs access to your gallery to upload videos.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (error) {
        console.error('❌ Permission request error:', error);
        return false;
      }
    }
    // iOS permissions are handled automatically by react-native-image-picker
    return true;
  };

  // Wait for auth initialization BEFORE rendering any content
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.mutedText }}>Loading user...</Text>
      </View>
    );
  }

  // Check if user is logged in
  if (!user) {
    Alert.alert('Login Required', 'You must be logged in to create a reel.');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }}>
        <Text style={{ color: colors.mutedText, fontSize: 16 }}>Please log in to create a reel</Text>
      </View>
    );
  }

  const handleSelectVideo = async () => {
    try {
      const granted = await requestStoragePermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Please allow access to videos to upload reels.');
        return;
      }

      const result = await launchImageLibrary({
        mediaType: 'video',
        includeBase64: false,
        quality: 0.8,
        videoQuality: 'high',
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets?.length) {
        return;
      }

      if (result.errorMessage) {
        Alert.alert('Error', `Failed to pick video: ${result.errorMessage}`);
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'No video selected');
        return;
      }

      setVideo(asset);
      setProgress(0);
    } catch (error: any) {
      console.error('❌ Error picking video:', error);
      Alert.alert('Error', `Failed to pick video: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCaptureVideo = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'video',
        includeBase64: false,
        quality: 0.8,
        videoQuality: 'high',
      });

      if (result.didCancel || !result.assets?.length) {
        return;
      }

      if (result.errorMessage) {
        Alert.alert('Error', `Failed to capture video: ${result.errorMessage}`);
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'No video captured');
        return;
      }

      setVideo(asset);
      setProgress(0);
    } catch (error: any) {
      console.error('❌ Error capturing video:', error);
      Alert.alert('Error', `Failed to capture video: ${error.message || 'Unknown error'}`);
    }
  };

  const uploadVideo = async (videoAsset: any): Promise<string> => {
    if (!videoAsset?.uri) {
      throw new Error('No video selected');
    }

    const fileName = `reel_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
    const reference = storage().ref(`/reels/${user.uid}/${fileName}`);

    let uploadUri = videoAsset.uri;
    if (Platform.OS === 'ios') {
      if (uploadUri.startsWith('file://')) {
        uploadUri = uploadUri.replace('file://', '');
      }
    }

    console.log('📤 Starting video upload to Firebase Storage...');
    console.log('   Path:', `/reels/${user.uid}/${fileName}`);

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

  const handleReel = async () => {
    if (!video?.uri) {
      Alert.alert('Error', 'Please select a video first');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Error', 'Please write a caption');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      console.log('📝 Starting reel creation process...');
      console.log('🔑 Current User ID:', user.uid);

      // Upload video to Firebase Storage with progress tracking
      const videoUrl = await uploadVideo(video);

      // Get current user from React Native Firebase Auth
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get username from Firestore
      let username = currentUser.displayName || currentUser.email || 'User';
      try {
        const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
        if (userDoc.exists()) {
          const userData = userDoc.data();
          username = userData?.username || username;
        }
      } catch (e) {
        console.log('Could not fetch username from Firestore, using default');
      }

      // Create reel document in Firestore
      console.log('📝 Creating Firestore document...');
      const reelData = {
        type: 'reel',
        createdBy: currentUser.uid,
        userId: currentUser.uid, // Legacy field for backward compatibility
        username,
        videoUrl,
        caption: caption.trim(),
        likeCount: 0,
        commentCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      console.log('📄 Reel data:', { ...reelData, createdAt: '[serverTimestamp]' });

      await firestore().collection('reels').add(reelData);

      console.log('✅ Reel created successfully!');

      // Reset form
      setCaption('');
      setVideo(null);
      setProgress(0);

      Alert.alert('Success', 'Reel uploaded successfully!', [
        { text: 'OK', onPress: () => navigation?.goBack() },
      ]);
    } catch (error: any) {
      console.error('❌ Error creating reel:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      let errorMessage = 'Failed to create reel';
      if (error.code === 'storage/permission-denied') {
        errorMessage = 'Permission denied. Please check your Firebase Storage rules.';
      } else if (error.code === 'storage/unauthorized') {
        errorMessage = 'Unauthorized. Please check your Firebase Storage rules.';
      } else if (error.code === 'unavailable' || error.message?.includes('network')) {
        errorMessage = 'Network unavailable. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Reel</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.videoContainer}>
        {!video?.uri ? (
          <View style={styles.uploadSection}>
            <Text style={styles.label}>Select Video</Text>
            <View style={styles.uploadButtons}>
              <TouchableOpacity style={styles.uploadButton} onPress={handleSelectVideo}>
                <Icon name="images-outline" size={24} color={colors.primary} />
                <Text style={styles.uploadButtonText}>Choose from Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={handleCaptureVideo}>
                <Icon name="videocam-outline" size={24} color={colors.primary} />
                <Text style={styles.uploadButtonText}>Record Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.previewSection}>
            <View style={styles.videoPreview}>
              <Icon name="videocam" size={48} color={colors.primary} />
              <Text style={styles.videoPreviewText}>Video Selected</Text>
              <Text style={styles.videoPreviewSubtext}>{video.fileName || 'Video file'}</Text>
            </View>
            <TouchableOpacity style={styles.changeVideoButton} onPress={() => setVideo(null)}>
              <Text style={styles.changeVideoText}>Change Video</Text>
            </TouchableOpacity>
          </View>
        )}
        
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
        style={[styles.btn, (uploading || !video) && styles.btnDisabled]} 
        onPress={handleReel}
        disabled={uploading || !video}
      >
        {uploading ? (
          <View style={styles.btnContent}>
            <ActivityIndicator color="white" size="small" />
            <Text style={[styles.btnText, { marginLeft: 8 }]}>Uploading...</Text>
          </View>
        ) : (
          <Text style={styles.btnText}>Share Reel</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  videoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  uploadSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  uploadButtons: {
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  previewSection: {
    marginBottom: 16,
  },
  videoPreview: {
    height: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  videoPreviewSubtext: {
    fontSize: 12,
    color: colors.mutedText,
  },
  changeVideoButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  changeVideoText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
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

