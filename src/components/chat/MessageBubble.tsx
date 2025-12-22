import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { formatTimestamp } from '../../utils/postHelpers';
import { SmartImage } from '../common/SmartImage';

interface MessageBubbleProps {
  type: 'sent' | 'received';
  text?: string;
  imageUri?: string;
  videoUri?: string;
  timestamp?: number;
}

function MessageBubble({
  type,
  text,
  imageUri,
  videoUri,
  timestamp,
}: MessageBubbleProps) {
  const isSent = type === 'sent';

  return (
    <View
      style={[
        styles.container,
        isSent ? styles.sentContainer : styles.receivedContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isSent ? styles.sentBubble : styles.receivedBubble,
        ]}
      >
        {imageUri && (
          <SmartImage
            uri={imageUri}
            style={styles.media}
            resizeMode="cover"
            borderRadius={12}
            showPlaceholder={true}
          />
        )}
        {videoUri && (
          <View style={styles.videoContainer}>
            <SmartImage
              uri={videoUri} // Usually video thumbnail, if same url SmartImage handles it as image
              style={styles.media}
              resizeMode="cover"
              borderRadius={12}
              showPlaceholder={true}
            />
            <View style={styles.playIconOverlay}>
              <View style={styles.playIcon} />
            </View>
          </View>
        )}
        {text && <Text style={[styles.text, isSent ? styles.sentText : styles.receivedText]}>{text}</Text>}
        {timestamp && (
          <Text style={[styles.timestamp, isSent ? styles.sentTimestamp : styles.receivedTimestamp]}>
            {formatTimestamp(timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(MessageBubble);

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  sentContainer: {
    alignItems: 'flex-end',
  },
  receivedContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    padding: 10,
    paddingBottom: 6,
  },
  sentBubble: {
    backgroundColor: Colors.brand.primary,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EFEFEF', // Subtle border for definition
  },
  media: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  videoContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 2,
    borderColor: Colors.white.primary,
  },
  text: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginBottom: 4,
  },
  sentText: {
    color: Colors.white.primary,
  },
  receivedText: {
    color: Colors.black.primary,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  sentTimestamp: {
    color: Colors.white.tertiary,
  },
  receivedTimestamp: {
    color: Colors.black.qua,
  },
});

