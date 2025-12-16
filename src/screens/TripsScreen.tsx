/**
 * MyTrips Screen
 * V1: Coming Soon - Trip booking and management functionality under development
 * 
 * Why Coming Soon:
 * - Trip booking flow requires payment integration
 * - Itinerary management needs complex state handling
 * - Will be implemented in V2 with full booking system
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

export default function TripsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Icon name="airplane" size={48} color={Colors.brand.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Coming Soon</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Trip booking and management features are currently under development.
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          Soon you'll be able to book trips, manage itineraries, and track your travel plans all in one place.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.brand.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.black.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
    lineHeight: 20,
  },
});
