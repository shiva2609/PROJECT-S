/**
 * GroupChatHeader - Header for group chats
 * Shows group image, name, member count, and info button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SmartImage } from '../common/SmartImage';

interface GroupChatHeaderProps {
  groupName: string;
  groupPhotoUrl?: string;
  memberCount: number;
  onBackPress: () => void;
  onInfoPress: () => void;
}

export default function GroupChatHeader({
  groupName,
  groupPhotoUrl,
  memberCount,
  onBackPress,
  onInfoPress,
}: GroupChatHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.blurContainer}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Icon name="chevron-back" size={24} color="#E87A5D" />
          </TouchableOpacity>

          {/* Group Info Section - Clickable */}
          <TouchableOpacity
            style={styles.groupSection}
            onPress={onInfoPress}
            activeOpacity={0.7}
          >
            <SmartImage
              uri={groupPhotoUrl}
              style={styles.avatar}
            />
            <View style={styles.textContainer}>
              <Text style={styles.groupName} numberOfLines={1}>
                {groupName}
              </Text>
              <Text style={styles.memberCount} numberOfLines={1}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Info Button */}
          <TouchableOpacity
            style={styles.infoButton}
            onPress={onInfoPress}
            activeOpacity={0.7}
          >
            <Icon name="information-circle-outline" size={24} color="#E87A5D" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 2,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 245, 240, 0.98)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 4,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E87A5D',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  groupName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1C',
    fontFamily: 'System',
  },
  memberCount: {
    fontSize: 9,
    color: '#4CAF50',
    marginTop: 0,
    fontFamily: 'System',
    fontWeight: '600',
  },
  infoButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
