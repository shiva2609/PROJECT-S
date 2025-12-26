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
import { getDefaultProfilePhoto } from '../../services/users/userProfilePhotoService';

interface GlassChatHeaderProps {
  username: string;
  profilePhoto?: string;
  onProfilePress: () => void;
  onBackPress: () => void;
  onCallPress?: () => void;
  onVideoPress?: () => void;
  showCallButtons?: boolean;
}

export default function GlassChatHeader({
  username,
  profilePhoto,
  onProfilePress,
  onBackPress,
  onCallPress,
  onVideoPress,
  showCallButtons = true,
}: GlassChatHeaderProps) {
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

            {/* Profile Section - Clickable */}
            <TouchableOpacity
              style={styles.profileSection}
              onPress={onProfilePress}
              activeOpacity={0.7}
            >
              <SmartImage
                uri={profilePhoto || getDefaultProfilePhoto()}
                style={styles.avatar}
              />
              <View style={styles.textContainer}>
                <Text style={styles.username} numberOfLines={1}>
                  {username}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Action Buttons */}
            {showCallButtons && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onCallPress}
                  activeOpacity={0.7}
                >
                  <Icon name="call" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={onVideoPress}
                  activeOpacity={0.7}
                >
                  <Icon name="videocam" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
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
    gap: 5,
  },
  backButton: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1C',
    fontFamily: 'System',
  },
  actions: {
    flexDirection: 'row',
    gap: 5,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E87A5D',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
