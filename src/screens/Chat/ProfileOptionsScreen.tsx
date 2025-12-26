import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SmartImage } from '../../components/common/SmartImage';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';

interface ProfileOptionsScreenProps {
  navigation: any;
  route: {
    params: {
      userId: string;
      username: string;
      profilePhoto?: string;
    };
  };
}

export default function ProfileOptionsScreen({ navigation, route }: ProfileOptionsScreenProps) {
  const { userId, username } = route.params;
  const profilePhoto = useProfilePhoto(userId);

  const options = [
    { icon: 'person-outline', label: 'Profile', action: 'profile' },
    { icon: 'search-outline', label: 'Search', action: 'search' },
    { icon: 'notifications-off-outline', label: 'Mute', action: 'mute' },
    { icon: 'ellipsis-horizontal-outline', label: 'Options', action: 'options' },
  ];

  const settings = [
    { icon: 'color-palette-outline', label: 'Theme', sublabel: 'Default', action: 'theme' },
    { icon: 'person-add-outline', label: 'Nicknames', action: 'nicknames' },
    { icon: 'time-outline', label: 'Disappearing messages', sublabel: 'Off', action: 'disappearing' },
    { icon: 'lock-closed-outline', label: 'Privacy and safety', action: 'privacy' },
    { icon: 'people-outline', label: 'Create a group chat', action: 'group' },
    { icon: 'alert-circle-outline', label: 'Something isn\'t working', action: 'report' },
  ];

  const handleOptionPress = (action: string) => {
    switch (action) {
      case 'profile':
        navigation.navigate('ProfileScreen', { userId });
        break;
      case 'search':
        // TODO: Implement search in chat
        break;
      case 'mute':
        // TODO: Implement mute
        break;
      case 'options':
        // TODO: Implement more options
        break;
      case 'theme':
        // TODO: Implement theme selection
        break;
      case 'nicknames':
        // TODO: Implement nicknames
        break;
      case 'disappearing':
        // TODO: Implement disappearing messages
        break;
      case 'privacy':
        // TODO: Navigate to privacy settings
        break;
      case 'group':
        // Navigate to Create Group flow
        navigation.navigate('SelectMembers');
        break;
      case 'report':
        // TODO: Implement report
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Options</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {profilePhoto ? (
            <SmartImage
              uri={profilePhoto}
              style={styles.profileImage}
              resizeMode="cover"
              borderRadius={60}
              showPlaceholder={true}
            />
          ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <Icon name="person" size={48} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.username}>{username}</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionItem}
              onPress={() => handleOptionPress(option.action)}
            >
              <Icon name={option.icon} size={24} color="#FFFFFF" />
              <Text style={styles.quickActionLabel}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings List */}
        <View style={styles.settingsList}>
          {settings.map((setting, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItem}
              onPress={() => handleOptionPress(setting.action)}
            >
              <View style={styles.settingLeft}>
                <Icon name={setting.icon} size={24} color="#FFFFFF" />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>{setting.label}</Text>
                  {setting.sublabel && (
                    <Text style={styles.settingSublabel}>{setting.sublabel}</Text>
                  )}
                </View>
              </View>
              <Icon name="chevron-forward" size={20} color="#7A7A7A" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  settingsList: {
    paddingTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  settingSublabel: {
    fontSize: 14,
    color: '#7A7A7A',
    marginTop: 2,
  },
});

