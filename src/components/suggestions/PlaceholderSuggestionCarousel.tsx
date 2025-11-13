/**
 * PlaceholderSuggestionCarousel Component
 * Shows placeholder cards when no suggestions are available
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export default function PlaceholderSuggestionCarousel() {
  const placeholderCount = 3; // Show 3 placeholder cards

  const renderPlaceholder = () => (
    <View style={styles.placeholderCard}>
      <View style={styles.placeholderAvatar} />
      <View style={styles.placeholderName} />
      <View style={styles.placeholderTagline} />
      <View style={styles.placeholderButton} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        data={Array(placeholderCount).fill(0)}
        keyExtractor={(_, index) => `placeholder-${index}`}
        renderItem={renderPlaceholder}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  placeholderCard: {
    width: 140,
    marginRight: 12,
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    borderStyle: 'dashed',
  },
  placeholderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white.tertiary,
    marginBottom: 8,
  },
  placeholderName: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: Colors.white.tertiary,
    marginBottom: 6,
  },
  placeholderTagline: {
    width: 100,
    height: 12,
    borderRadius: 4,
    backgroundColor: Colors.white.tertiary,
    marginBottom: 8,
  },
  placeholderButton: {
    width: 80,
    height: 28,
    borderRadius: 16,
    backgroundColor: Colors.white.tertiary,
  },
});

