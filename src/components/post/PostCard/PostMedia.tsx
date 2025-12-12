import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

interface MediaItem {
  uri: string;
  type: 'image' | 'video';
}

interface PostMediaProps {
  media?: MediaItem[];
  aspectRatio?: number;
  onPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MEDIA_WIDTH = SCREEN_WIDTH;

export default function PostMedia({
  media,
  aspectRatio = 1,
  onPress,
}: PostMediaProps) {
  if (!media || media.length === 0) {
    return null;
  }

  const firstMedia = media[0];
  const mediaHeight = MEDIA_WIDTH / aspectRatio;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: firstMedia.uri }}
        style={[styles.media, { height: mediaHeight }]}
        resizeMode="cover"
      />
      {/* Pinch-to-zoom placeholder - commented for now */}
      {/* <PinchGestureHandler>...</PinchGestureHandler> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: MEDIA_WIDTH,
    backgroundColor: '#000',
  },
  media: {
    width: MEDIA_WIDTH,
  },
});

