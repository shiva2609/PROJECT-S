/**
 * GroupMessageBubble - Message bubble for group chats with sender info
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SmartImage } from '../common/SmartImage';

interface GroupMessageBubbleProps {
  messageId: string;
  text: string;
  isOwnMessage: boolean;
  senderName?: string;
  senderPhotoUrl?: string;
  timestamp: string;
  onSenderPress?: () => void;
  showAvatar?: boolean;
}

export default function GroupMessageBubble({
  text,
  isOwnMessage,
  senderName,
  senderPhotoUrl,
  timestamp,
  onSenderPress,
  showAvatar = true,
}: GroupMessageBubbleProps) {
  if (isOwnMessage) {
    // Outgoing message (no sender info needed)
    return (
      <View style={styles.outgoingContainer}>
        <View style={styles.outgoingBubble}>
          <Text style={styles.outgoingText}>{text}</Text>
          <Text style={styles.outgoingTime}>{timestamp}</Text>
        </View>
      </View>
    );
  }

  // Incoming message (with sender info)
  return (
    <View style={styles.incomingContainer}>
      {showAvatar ? (
        <TouchableOpacity onPress={onSenderPress} activeOpacity={0.7}>
          <SmartImage uri={senderPhotoUrl} style={styles.avatar} />
        </TouchableOpacity>
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}

      <View style={styles.incomingContent}>
        {showAvatar && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <View style={styles.incomingBubble}>
          <Text style={styles.incomingText}>{text}</Text>
          <Text style={styles.incomingTime}>{timestamp}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outgoing (right-aligned)
  outgoingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  outgoingBubble: {
    maxWidth: '65%',
    backgroundColor: '#E5A992',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outgoingText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  outgoingTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },

  // Incoming (left-aligned with sender info)
  incomingContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 28,
    marginRight: 8,
  },
  incomingContent: {
    maxWidth: '65%',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E87A5D',
    marginBottom: 4,
    marginLeft: 4,
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  incomingText: {
    fontSize: 14,
    color: '#1C1C1C',
    lineHeight: 20,
  },
  incomingTime: {
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
  },
});
