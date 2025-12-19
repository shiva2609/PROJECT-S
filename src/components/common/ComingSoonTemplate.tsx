/**
 * Coming Soon Template Component
 * 
 * A reusable placeholder component for screens that are under development.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';

interface ComingSoonTemplateProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export function ComingSoonTemplate({ title, subtitle, showBackButton }: ComingSoonTemplateProps) {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      {showBackButton && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={Colors.black.primary} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.content}>
        <Icon name="construct-outline" size={80} color={Colors.brand.primary} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {subtitle || 'This feature is coming soon!'}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: -60, // visual offset to center content nicely despite header
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  badge: {
    backgroundColor: Colors.brand.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
  },
});




