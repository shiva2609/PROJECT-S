import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { navigateToScreen } from '../../utils/navigationHelpers';
import { useAuth } from '../../providers/AuthProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_HEIGHT - 200;

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

interface PostPreviewScreenProps {
  navigation: any;
  route: {
    params: {
      croppedMedia: CropData[];
      postType: 'post' | 'reel';
      currentIndex?: number;
    };
  };
}

export default function PostPreviewScreen({ navigation, route }: PostPreviewScreenProps) {
  console.log('🟡 [PostPreviewScreen] ⚠️ COMPONENT MOUNTED - This might be the ghost screen!');
  console.log('🟡 [PostPreviewScreen] Route params:', {
    hasCroppedMedia: !!route.params?.croppedMedia,
    croppedMediaLength: route.params?.croppedMedia?.length || 0,
    postType: route.params?.postType,
    currentIndex: route.params?.currentIndex,
  });
  console.log('🟡 [PostPreviewScreen] Navigation state:', {
    canGoBack: navigation.canGoBack?.(),
  });
  
  const { croppedMedia, postType, currentIndex: initialIndex = 0 } = route.params;
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);
  
  useEffect(() => {
    console.log('🟡 [PostPreviewScreen] useEffect - Component mounted');
    console.trace('🟡 [PostPreviewScreen] Stack trace of where this screen was navigated from:');
    return () => {
      console.log('🔴 [PostPreviewScreen] useEffect cleanup - Component unmounting');
    };
  }, []);

  useEffect(() => {
    if (initialIndex > 0) {
      scrollViewRef.current?.scrollTo({
        x: initialIndex * SCREEN_WIDTH,
        animated: false,
      });
    }
  }, [initialIndex]);

  const handleThumbnailPress = (index: number) => {
    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  };

  const getPreviewHeight = (ratio: string): number => {
    switch (ratio) {
      case '1:1':
        return SCREEN_WIDTH;
      case '4:5':
        return SCREEN_WIDTH * 1.25;
      case '16:9':
        return SCREEN_WIDTH * 0.5625;
      default:
        return SCREEN_WIDTH;
    }
  };

  const handleEdit = () => {
    const currentItem = croppedMedia[currentIndex];
    if (!currentItem) return;

    // Navigate back to CropAdjustScreen for this image
    // Pass finalUri so it opens the already-cropped image for re-editing
    navigateToScreen(navigation, 'CropAdjust', {
      contentType: postType,
      selectedImages: croppedMedia.map(m => ({
        uri: m.finalUri, // Use finalUri, not originalUri
        id: m.id,
        type: m.type,
      })),
      imageUri: currentItem.finalUri, // Use finalUri for editing
      currentImageIndex: currentIndex,
      allowMultiple: croppedMedia.length > 1,
      croppedMedia: croppedMedia,
    });
  };

  const renderMediaItem = (item: CropData, index: number) => {
    const isVideo = item.type === 'video';
    const ratio = item.ratio || item.cropData?.ratio || '4:5';
    const previewHeight = getPreviewHeight(ratio);
    const imageUri = item.finalUri; // Use only finalUri
    
    return (
      <View key={index} style={[styles.mediaItem, { height: previewHeight }]}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.previewImage, { height: previewHeight }]}
          resizeMode="contain"
        />
        {isVideo && (
          <View style={styles.videoIndicator}>
            <Icon name="play-circle" size={48} color={Colors.white.primary} />
          </View>
        )}
      </View>
    );
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
        <Text style={styles.headerTitle}>Preview</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleEdit}
        >
          <Text style={styles.editButton}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Media Preview */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        style={styles.scrollView}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {croppedMedia.map((item, index) => renderMediaItem(item, index))}
      </ScrollView>

      {/* Thumbnail Strip */}
      {croppedMedia.length > 1 && (
        <View style={styles.thumbnailContainer}>
          <FlatList
            data={croppedMedia}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `thumb-${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.thumbnail,
                  currentIndex === index && styles.thumbnailActive,
                ]}
                onPress={() => handleThumbnailPress(index)}
              >
                <Image
                  source={{ uri: item.finalUri }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
                {item.type === 'video' && (
                  <View style={styles.thumbnailVideoIcon}>
                    <Icon name="play" size={12} color={Colors.white.primary} />
                  </View>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.thumbnailList}
          />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 18,
    color: Colors.black.primary,
  },
  editButton: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.brand.primary,
  },
  scrollView: {
    flex: 1,
  },
  mediaItem: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  previewImage: {
    width: SCREEN_WIDTH,
  },
  videoIndicator: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailContainer: {
    paddingVertical: 12,
    backgroundColor: Colors.black.primary,
  },
  thumbnailList: {
    paddingHorizontal: 12,
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
  },
  thumbnailActive: {
    borderColor: Colors.brand.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailVideoIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 2,
  },
});

