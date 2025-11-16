/**
 * Header Component for Sanchari Copilot
 * 
 * Displays the app title with compass icon and subtitle
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export default function Header() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon name="compass-outline" size={24} color={Colors.brand.primary} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Sanchari Copilot</Text>
          <Text style={styles.subtitle}>Plan smarter, travel better.</Text>
        </View>
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: Colors.brand.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.black.qua,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.white.qua,
    marginTop: 16,
  },
});

