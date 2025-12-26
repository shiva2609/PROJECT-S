import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SmartImage } from '../common/SmartImage';
import { getDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';

interface SlimMessageBubbleProps {
  text: string;
  isCurrentUser: boolean;
  timestamp?: string;
  profilePhoto?: string;
  onProfilePress?: () => void;
  showAvatar?: boolean;
}

export default function SlimMessageBubble({
  text,
  isCurrentUser,
  timestamp,
  profilePhoto,
  onProfilePress,
  showAvatar = true,
}: SlimMessageBubbleProps) {
  if (isCurrentUser) {
    // Outgoing message (right side)
    return (
      <View style={styles.outgoingContainer}>
        <View style={styles.outgoingBubble}>
          <Text style={styles.outgoingText}>{text}</Text>
          {timestamp && <Text style={styles.outgoingTime}>{timestamp}</Text>}
        </View>
      </View>
    );
  }

  // Incoming message (left side)
  return (
    <View style={styles.incomingContainer}>
      {showAvatar && (
        <TouchableOpacity
          onPress={onProfilePress}
          activeOpacity={0.7}
          style={styles.avatarButton}
        >
          <SmartImage
            uri={profilePhoto || getDefaultProfilePhoto()}
            style={styles.avatar}
          />
        </TouchableOpacity>
      )}
      <View style={styles.incomingBubble}>
        <Text style={styles.incomingText}>{text}</Text>
        {timestamp && <Text style={styles.incomingTime}>{timestamp}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outgoing (User) Messages
  outgoingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  outgoingBubble: {
    backgroundColor: '#E5A992',
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '65%',
  },
  outgoingText: {
    fontSize: 14,
    color: '#1C1C1C',
    fontFamily: 'System',
    lineHeight: 18,
  },
  outgoingTime: {
    fontSize: 10,
    color: '#5C4A42',
    marginTop: 4,
    textAlign: 'right',
    fontFamily: 'System',
  },

  // Incoming (Other User) Messages
  incomingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingHorizontal: 16,
    gap: 8,
  },
  avatarButton: {
    marginTop: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '65%',
  },
  incomingText: {
    fontSize: 14,
    color: '#1C1C1C',
    fontFamily: 'System',
    lineHeight: 18,
  },
  incomingTime: {
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
    textAlign: 'right',
    fontFamily: 'System',
  },
});
