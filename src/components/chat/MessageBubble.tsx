import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatTimestamp } from '../../utils/postHelpers';
import { SmartImage } from '../common/SmartImage';

interface MessageBubbleProps {
  type: 'sent' | 'received';
  text?: string;
  imageUri?: string;
  videoUri?: string;
  timestamp?: number;
  profileImageUri?: string;
  showProfileImage?: boolean;
  onProfilePress?: () => void;
}

function MessageBubble({
  type,
  text,
  imageUri,
  videoUri,
  timestamp,
  profileImageUri,
  showProfileImage = false,
  onProfilePress,
}: MessageBubbleProps) {
  const isSent = type === 'sent';

  return (
    <View
      style={[
        styles.container,
        isSent ? styles.sentContainer : styles.receivedContainer,
      ]}
    >
      {/* Profile image for incoming messages */}
      {!isSent && (
        <View style={styles.profileImageContainer}>
          {showProfileImage ? (
            profileImageUri ? (
              <TouchableOpacity
                onPress={onProfilePress}
                activeOpacity={0.7}
                disabled={!onProfilePress}
              >
                <SmartImage
                  uri={profileImageUri}
                  style={styles.profileImage}
                  resizeMode="cover"
                  borderRadius={18}
                  showPlaceholder={true}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onProfilePress}
                activeOpacity={0.7}
                disabled={!onProfilePress}
              >
                <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                  <Text style={styles.profileImageText}>?</Text>
                </View>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.profileImageSpacer} />
          )}
        </View>
      )}
      
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
              uri={videoUri}
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
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  sentContainer: {
    justifyContent: 'flex-end',
  },
  receivedContainer: {
    justifyContent: 'flex-start',
  },
  profileImageContainer: {
    marginRight: 8,
    marginBottom: 4,
    width: 36,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAD3C5',
  },
  profileImagePlaceholder: {
    backgroundColor: '#EAD3C5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    color: '#7A7A7A',
    fontSize: 14,
    fontWeight: '600',
  },
  profileImageSpacer: {
    width: 36,
    height: 36,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 6,
  },
  sentBubble: {
    backgroundColor: '#F28C6B', // Primary Orange
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF', // White
    borderBottomLeftRadius: 4,
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
    borderColor: '#FFFFFF',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  sentText: {
    color: '#FFFFFF', // White text on orange
  },
  receivedText: {
    color: '#2B2B2B', // Primary text color
  },
  timestamp: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  sentTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)', // Semi-transparent white
  },
  receivedTimestamp: {
    color: '#7A7A7A', // Secondary text color
  },
});

