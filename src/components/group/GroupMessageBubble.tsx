/**
 * GroupMessageBubble - Message bubble for group chats with sender info
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SmartImage } from '../common/SmartImage';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { isDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';

interface GroupMessageBubbleProps {
  messageId: string;
  text: string;
  isOwnMessage: boolean;
  senderId: string;
  senderName?: string;
  senderPhotoUrl?: string; // Optional direct URL
  timestamp: string;
  onSenderPress?: () => void;
  isFirstInSequence?: boolean; // Controls visual top margin
  showName?: boolean;   // Controls top name display (First in sequence)
  showAvatar?: boolean; // Controls avatar display (Top of sequence)
}

export default function GroupMessageBubble({
  text,
  isOwnMessage,
  senderId,
  senderName,
  senderPhotoUrl,
  timestamp,
  onSenderPress,
  isFirstInSequence = true,
  showName = true,
  showAvatar = true,
}: GroupMessageBubbleProps) {
  // Fetch profile photo if not directly provided
  const fetchedPhoto = useProfilePhoto(senderId);
  const profilePhoto = senderPhotoUrl || fetchedPhoto;
  const isDefault = isDefaultProfilePhoto(profilePhoto);

  const topMargin = isFirstInSequence ? 12 : 2;

  if (isOwnMessage) {
    // Outgoing message (no sender info needed)
    return (
      <View style={[styles.outgoingContainer, { marginTop: topMargin }]}>
        <View style={styles.outgoingBubble}>
          <Text style={styles.outgoingText}>{text}</Text>
          <Text style={styles.outgoingTime}>{timestamp}</Text>
        </View>
      </View>
    );
  }

  // Incoming message (with sender info)
  return (
    <View style={[styles.incomingContainer, { marginTop: topMargin }]}>
      {/* Avatar: Top Left, outside bubble. Only visible if showAvatar is true */}
      <View style={styles.avatarContainer}>
        {showAvatar ? (
          <TouchableOpacity onPress={onSenderPress} activeOpacity={0.8}>
            {isDefault ? (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {senderName ? senderName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            ) : (
              <SmartImage uri={profilePhoto} style={styles.avatar} borderRadius={16} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.avatarSpacer} />
        )}
      </View>

      <View style={styles.incomingContent}>
        {showName && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <View style={[styles.incomingBubble,
          // Add border radius logic here if needed (e.g. sharp top-left if first in sequence?)
          // For now, consistent rounded look.
        ]}>
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
    marginBottom: 0,
    paddingHorizontal: 16,
  },
  outgoingBubble: {
    maxWidth: '75%',
    backgroundColor: '#F28C6B', // Primary Orange
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outgoingText: {
    fontSize: 16, // Matches standard 1-to-1
    color: '#FFFFFF',
    lineHeight: 22,
  },
  outgoingTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    alignSelf: 'flex-end',
  },

  // Incoming (left-aligned with sender info)
  incomingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align start for top avatar
    marginBottom: 0,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    width: 28,
    marginRight: 0,
    alignItems: 'flex-start',
    paddingTop: 0,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarSpacer: {
    width: 22,
  },
  avatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E87A5D', // Brand Orange
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  avatarPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'System', // Use system font to ensure centering/availability
  },
  incomingContent: {
    maxWidth: '72%',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999999', // Secondary text color per request
    marginBottom: 4,
    marginLeft: 2,
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderTopLeftRadius: 4, // Tail at top-left
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  incomingText: {
    fontSize: 16,
    color: '#2B2B2B',
    lineHeight: 22,
  },
  incomingTime: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
});
