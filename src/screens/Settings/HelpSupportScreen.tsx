/**
 * Help & Support Screen
 * V1: User support options including feedback submission
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface SupportOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  action: 'feedback' | 'faq' | 'email' | 'terms';
}

export default function HelpSupportScreen({ navigation }: any) {
  const supportOptions: SupportOption[] = [
    {
      id: 'feedback',
      title: 'Send Feedback',
      subtitle: 'Report bugs, request features, or share ideas',
      icon: 'chatbox-ellipses-outline',
      action: 'feedback',
    },
    {
      id: 'faq',
      title: 'FAQs',
      subtitle: 'Frequently asked questions',
      icon: 'help-circle-outline',
      action: 'faq',
    },
    {
      id: 'email',
      title: 'Email Support',
      subtitle: 'Contact us via email',
      icon: 'mail-outline',
      action: 'email',
    },
    {
      id: 'terms',
      title: 'Terms & Privacy',
      subtitle: 'View our terms and privacy policy',
      icon: 'document-text-outline',
      action: 'terms',
    },
  ];

  const handleOptionPress = (option: SupportOption) => {
    switch (option.action) {
      case 'feedback':
        // V1: Navigate to feedback screen
        navigation.navigate('Feedback');
        break;
      case 'email':
        // Open email client
        Linking.openURL('mailto:kaustubha000@gmail.com');
        break;
      case 'faq':
      case 'terms':
        // Coming soon
        break;
    }
  };

  const renderOption = (option: SupportOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.optionItem}
      onPress={() => handleOptionPress(option)}
      activeOpacity={0.7}
      disabled={option.action === 'faq' || option.action === 'terms'}
    >
      <View style={styles.optionLeft}>
        <View style={[
          styles.iconContainer,
          (option.action === 'faq' || option.action === 'terms') && styles.iconContainerDisabled
        ]}>
          <Icon
            name={option.icon}
            size={22}
            color={(option.action === 'faq' || option.action === 'terms') ? Colors.black.qua : Colors.brand.primary}
          />
        </View>
        <View style={styles.optionText}>
          <Text style={[
            styles.optionTitle,
            (option.action === 'faq' || option.action === 'terms') && styles.optionTitleDisabled
          ]}>
            {option.title}
          </Text>
          <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
        </View>
      </View>
      <View style={styles.optionRight}>
        {(option.action === 'faq' || option.action === 'terms') ? (
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Info */}
        <View style={styles.infoSection}>
          <Icon name="headset-outline" size={32} color={Colors.brand.primary} />
          <Text style={styles.infoTitle}>We're Here to Help</Text>
          <Text style={styles.infoText}>
            Get assistance, share feedback, or learn more about Sanchari.
          </Text>
        </View>

        {/* Options */}
        <View style={styles.section}>
          {supportOptions.map(renderOption)}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Sanchari v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2025 Sanchari. All rights reserved.</Text>
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
  infoSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.white.secondary,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingTop: 8,
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
  appInfo: {
    alignItems: 'center',
    padding: 32,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    marginBottom: 4,
  },
});
