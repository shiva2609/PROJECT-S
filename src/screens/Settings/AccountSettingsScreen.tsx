/**
 * Account Settings Screen
 * V1: Privacy and safety settings including blocked users management
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface SettingsOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  route?: string;
  comingSoon?: boolean;
}

export default function AccountSettingsScreen({ navigation }: any) {
  const settingsOptions: SettingsOption[] = [
    {
      id: 'blocked-users',
      title: 'Blocked Users',
      subtitle: 'Manage blocked accounts',
      icon: 'ban-outline',
      route: 'BlockedUsers',
    },
    {
      id: 'privacy',
      title: 'Privacy',
      subtitle: 'Control who can see your content',
      icon: 'lock-closed-outline',
      comingSoon: true,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage notification preferences',
      icon: 'notifications-outline',
      comingSoon: true,
    },
    {
      id: 'data',
      title: 'Data & Storage',
      subtitle: 'Manage your data and storage',
      icon: 'server-outline',
      comingSoon: true,
    },
  ];

  const handleOptionPress = (option: SettingsOption) => {
    if (option.comingSoon) {
      // Show coming soon message or do nothing
      return;
    }

    if (option.route) {
      navigation.navigate(option.route);
    }
  };

  const renderOption = (option: SettingsOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.optionItem}
      onPress={() => handleOptionPress(option)}
      activeOpacity={0.7}
      disabled={option.comingSoon}
    >
      <View style={styles.optionLeft}>
        <View style={[styles.iconContainer, option.comingSoon && styles.iconContainerDisabled]}>
          <Icon
            name={option.icon}
            size={22}
            color={option.comingSoon ? Colors.black.qua : Colors.brand.primary}
          />
        </View>
        <View style={styles.optionText}>
          <Text style={[styles.optionTitle, option.comingSoon && styles.optionTitleDisabled]}>
            {option.title}
          </Text>
          {option.subtitle && (
            <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
          )}
        </View>
      </View>
      <View style={styles.optionRight}>
        {option.comingSoon ? (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        ) : (
          <Icon name="chevron-forward" size={20} color={Colors.black.qua} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Privacy & Safety Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Safety</Text>
          {settingsOptions.map(renderOption)}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Icon name="information-circle-outline" size={20} color={Colors.black.qua} />
          <Text style={styles.infoText}>
            More settings will be available soon. Manage your blocked users to control who can interact with you.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.black.qua,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerDisabled: {
    backgroundColor: Colors.white.tertiary,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 2,
  },
  optionTitleDisabled: {
    color: Colors.black.qua,
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  optionRight: {
    marginLeft: 12,
  },
  comingSoonBadge: {
    backgroundColor: Colors.white.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.black.qua,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: Colors.white.secondary,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    lineHeight: 18,
  },
});
