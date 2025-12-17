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

import { useNavigation } from '@react-navigation/native';

export default function Header() {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Icon name="arrow-back" size={24} color={Colors.black.primary} onPress={() => navigation.goBack()} style={{ marginRight: 16 }} />
        <View style={styles.iconContainer}>
          <Icon name="compass" size={28} color={Colors.brand.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Ask Sanchari</Text>
          <Text style={styles.subtitle}>Your personal travel guide</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F0', // Even softer brand accent
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    marginVertical: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.black.primary,
    letterSpacing: -0.3,
    marginBottom: 2,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.black.tertiary, // Lighter, less visual weight
    letterSpacing: 0,
  },
});

