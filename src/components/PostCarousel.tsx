import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Fonts } from '../theme/fonts';

// Optional video support
let Video: any = null;
let ResizeMode: any = null;
try {
  const videoModule = require('react-native-video');
  Video = videoModule.Video;
  ResizeMode = videoModule.ResizeMode;
} catch (e) {
  // Video support not available
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MediaItem {
  type: 'image' | 'video';
  uri: string;
  id?: string;
}

interface PostCarouselProps {
  media: MediaItem[];
  aspectRatio?: number; // Optional aspect ratio for container height (legacy)
  ratio?: '1:1' | '4:5' | '16:9'; // Aspect ratio as string
  width?: number; // Container width
  height?: number; // Container height
}

const PostCarousel = React.memo<PostCarouselProps>(({ media, aspectRatio, ratio, width, height }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<{ [key: number]: any }>({});

  // Use provided dimensions, or calculate from aspectRatio (legacy), or default
  const containerWidth = width ?? SCREEN_WIDTH;
  const containerHeight = useMemo(() => {
    if (height !== undefined) {
      return height;
    }
    if (aspectRatio && aspectRatio > 0) {
      return SCREEN_WIDTH / aspectRatio;
    }
    return 340; // Default height
  }, [aspectRatio, height]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const viewWidth = event.nativeEvent.layoutMeasurement?.width || containerWidth;
    const index = Math.round(contentOffsetX / viewWidth);
    
    if (index !== currentIndex && index >= 0 && index < media.length) {
      setCurrentIndex(index);
      
      // Pause all videos
      if (Video) {
        Object.values(videoRefs.current).forEach((video) => {
          if (video) {
            try {
              video.setNativeProps({ paused: true });
            } catch (e) {
              // Ignore errors if video ref is not ready
            }
          }
        });
        
        // Play current video if it's a video
        if (media[index]?.type === 'video') {
          const currentVideo = videoRefs.current[index];
          if (currentVideo) {
            try {
              currentVideo.setNativeProps({ paused: false });
            } catch (e) {
              // Ignore errors if video ref is not ready
            }
          }
        }
      }
    }
  }, [currentIndex, media, containerWidth]);

  const renderItem = useCallback(({ item, index }: { item: MediaItem; index: number }) => {
    const isVideo = item.type === 'video';
    const isActive = index === currentIndex;

    return (
      <View style={[styles.mediaContainer, { width: containerWidth, height: containerHeight }]}>
        {isVideo && Video ? (
          <Video
            ref={(ref) => {
              videoRefs.current[index] = ref;
            }}
            source={{ uri: item.uri }}
            style={{ width: containerWidth, height: containerHeight }}
            resizeMode={ResizeMode?.COVER || 'cover'}
            paused={!isActive}
            repeat
            muted={false}
            playInBackground={false}
            playWhenInactive={false}
          />
        ) : (
          <Image 
            source={{ uri: item.uri }} 
            style={{ width: containerWidth, height: containerHeight }}
            resizeMode="cover" 
          />
        )}
      </View>
    );
  }, [currentIndex, containerHeight, containerWidth]);

  const keyExtractor = useCallback((item: MediaItem, index: number) => {
    return item.id || item.uri || `media-${index}`;
  }, []);

  // Don't render carousel if only one item
  if (media.length <= 1) {
    const item = media[0];
    if (!item) return null;

    return (
      <View style={[styles.mediaContainer, { width: containerWidth, height: containerHeight }]}>
        {item.type === 'video' && Video ? (
          <Video
            source={{ uri: item.uri }}
            style={{ width: containerWidth, height: containerHeight }}
            resizeMode={ResizeMode?.COVER || 'cover'}
            paused={false}
            repeat
            muted={false}
            playInBackground={false}
            playWhenInactive={false}
          />
        ) : (
          <Image 
            source={{ uri: item.uri }} 
            style={{ width: containerWidth, height: containerHeight }}
            resizeMode="cover" 
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={media}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={containerWidth}
        snapToAlignment="start"
        removeClippedSubviews={false}
        getItemLayout={(_, index) => ({
          length: containerWidth,
          offset: containerWidth * index,
          index,
        })}
        initialNumToRender={media.length}
        maxToRenderPerBatch={3}
        windowSize={5}
        bounces={false}
        scrollEnabled={media.length > 1}
      />

      {/* Index Counter - Top Right - Only show for multiple images */}
      {media.length > 1 && (
        <View style={styles.indexCounter}>
          <Text style={styles.indexText}>{currentIndex + 1}/{media.length}</Text>
        </View>
      )}

      {/* Pagination Dots - Bottom Center - Only show for multiple images */}
      {media.length > 1 && (
        <View style={styles.paginationContainer}>
          {media.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
});

PostCarousel.displayName = 'PostCarousel';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  mediaContainer: {
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  indexCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indexText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default PostCarousel;

