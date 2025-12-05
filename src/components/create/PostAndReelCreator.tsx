/**
 * Post and Reel Creator
 * 
 * Allows users to create posts (images) and reels (videos)
 */

import React, { useState } from 'react';
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
import { launchImageLibrary, launchCamera, MediaType } from 'react-native-image-picker';
import { colors } from '../../utils/colors';
import { uploadImageAsync, createPost, createReel } from '../../api/firebaseService';
import { db } from '../../api/authService';
import { doc, getDoc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { requireAuth } from '../../utils/authUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { navigateToScreen } from '../../utils/navigationHelpers';

interface Props {
  accountType: string;
  onClose: () => void;
  navigation: any;
}

export default function PostAndReelCreator({ accountType, onClose, navigation: navProp }: Props) {
  const { user, initialized } = useAuth();
  const navigation = useNavigation();
  const nav = navProp || navigation;
  const [mode, setMode] = useState<'post' | 'reel'>('post');
  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Wait for auth initialization
  if (!initialized || !user) {
    return null;
  }

  const pickMedia = async (type: 'photo' | 'video') => {
    // For posts (photos), navigate to PhotoSelectScreen for Instagram-like selection
    if (mode === 'post' && type === 'photo') {
      navigateToScreen(nav, 'PhotoSelect', {
        mode: 'post',
      });
      return;
    }

    // For reels (videos), use direct picker
    const options = {
      mediaType: type as MediaType,
      quality: 0.8,
    };

    try {
      const result = await launchImageLibrary(options);
      if (result.assets && result.assets[0]) {
        const assetUri = result.assets[0].uri;
        if (!assetUri) return;
        setMediaUri(assetUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const captureMedia = async (type: 'photo' | 'video') => {
    // For posts (photos), navigate to PhotoSelectScreen
    if (mode === 'post' && type === 'photo') {
      navigateToScreen(nav, 'PhotoSelect', {
        mode: 'post',
      });
      return;
    }

    // For reels (videos), use direct camera
    const options = {
      mediaType: type as MediaType,
      quality: 0.8,
    };

    try {
      const result = await launchCamera(options);
      if (result.assets && result.assets[0]) {
        const assetUri = result.assets[0].uri;
        if (!assetUri) return;
        setMediaUri(assetUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture media');
    }
  };

  const handleShare = async () => {
    if (!mediaUri) {
      Alert.alert('Error', 'Please select an image or video');
      return;
    }

    // Check authentication using AuthContext user
    const allowed = await requireAuth('create a post', user);
    if (!allowed || !user) {
      console.error('❌ User authentication failed');
      Alert.alert('Error', 'Authentication failed. Please try logging in again.');
      return;
    }

    console.log('User verified:', user.uid);

    setUploading(true);
    try {
      // Upload media
      const mediaPath = `${mode}s/${user.uid}/${Date.now()}.${mode === 'post' ? 'jpg' : 'mp4'}`;
      const mediaUrl = await uploadImageAsync({ uri: mediaUri, path: mediaPath });

      // Get username from Firestore
      let username = 'user';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          username = userDoc.data().username || user.email?.split('@')[0] || 'user';
        }
      } catch (e) {
        // Fallback to email
        username = user.email?.split('@')[0] || 'user';
      }

      // Create post or reel based on mode
      if (mode === 'post') {
        await createPost({
          userId: user.uid,
          username,
          imageUrl: mediaUrl,
          caption: caption.trim(),
        });
      } else {
        // Save reel to reels collection
        await createReel({
          userId: user.uid,
          username,
          videoUrl: mediaUrl,
          caption: caption.trim(),
        });
      }

      Alert.alert('Success', `${mode === 'post' ? 'Post' : 'Reel'} created successfully!`, [
        { text: 'OK', onPress: onClose },
      ]);
      
      // Reset form
      setCaption('');
      setMediaUri(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'post' && styles.modeButtonActive]}
          onPress={() => setMode('post')}
        >
          <Text style={[styles.modeText, mode === 'post' && styles.modeTextActive]}>Post</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'reel' && styles.modeButtonActive]}
          onPress={() => setMode('reel')}
        >
          <Text style={[styles.modeText, mode === 'reel' && styles.modeTextActive]}>Reel</Text>
        </TouchableOpacity>
      </View>

      {!mediaUri ? (
        <View style={styles.uploadSection}>
          <Text style={styles.label}>Select {mode === 'post' ? 'Image' : 'Video'}</Text>
          <View style={styles.uploadButtons}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickMedia(mode === 'post' ? 'photo' : 'video')}
            >
              <Icon name="images-outline" size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => captureMedia(mode === 'post' ? 'photo' : 'video')}
            >
              <Icon name="camera-outline" size={24} color={colors.primary} />
              <Text style={styles.uploadButtonText}>Capture</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.previewSection}>
          <Image source={{ uri: mediaUri }} style={styles.preview} resizeMode="cover" />
          <TouchableOpacity style={styles.changeMediaButton} onPress={() => setMediaUri(null)}>
            <Text style={styles.changeMediaText}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.captionSection}>
        <Text style={styles.label}>Caption</Text>
        <TextInput
          style={styles.captionInput}
          placeholder={`Write a caption for your ${mode}...`}
          multiline
          numberOfLines={4}
          value={caption}
          onChangeText={setCaption}
        />
      </View>

      <TouchableOpacity
        style={[styles.shareButton, uploading && styles.shareButtonDisabled]}
        onPress={handleShare}
        disabled={uploading || !mediaUri}
      >
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.shareButtonText}>Share</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.mutedText,
  },
  modeTextActive: {
    color: 'white',
  },
  uploadSection: {
    marginBottom: 24,
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
    marginBottom: 24,
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  changeMediaButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  changeMediaText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  captionSection: {
    marginBottom: 24,
  },
  captionInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: colors.text,
  },
  shareButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

