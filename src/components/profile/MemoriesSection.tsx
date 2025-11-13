/**
 * Memories Section Component
 * 
 * Displays trip collections (horizontal scroll) and masonry layout of memory photos
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import Card from './Card';
import { Memory, TripCollection } from '../../hooks/useProfileData';

interface MemoriesSectionProps {
  tripCollections: TripCollection[];
  memories: Memory[];
  onTripPress?: (trip: TripCollection) => void;
  onMemoryPress?: (memory: Memory) => void;
}

const { width } = Dimensions.get('window');
const TRIP_CARD_WIDTH = width * 0.6;

export default function MemoriesSection({
  tripCollections,
  memories,
  onTripPress,
  onMemoryPress,
}: MemoriesSectionProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Trip Collections - Horizontal Scroll */}
      {tripCollections.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Collections</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tripsContainer}
          >
            {tripCollections.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.tripCard}
                onPress={() => onTripPress?.(trip)}
                activeOpacity={0.9}
              >
                {trip.coverImage ? (
                  <Image source={{ uri: trip.coverImage }} style={styles.tripImage} />
                ) : (
                  <View style={styles.tripImagePlaceholder}>
                    <Text style={styles.tripPlaceholderText}>✈️</Text>
                  </View>
                )}
                <View style={styles.tripOverlay}>
                  <Text style={styles.tripName} numberOfLines={2}>
                    {trip.name}
                  </Text>
                  <Text style={styles.tripCount}>{trip.memoryCount} memories</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Memories Masonry Layout */}
      {memories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Memories</Text>
          <View style={styles.memoriesGrid}>
            {memories.map((memory, index) => {
              const imageUrl = memory.imageURL;
              // Simple grid layout - all same size for now (can be enhanced with masonry later)
              return (
                <TouchableOpacity
                  key={memory.id}
                  style={styles.memoryItem}
                  onPress={() => onMemoryPress?.(memory)}
                  activeOpacity={0.9}
                >
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.memoryImage} />
                  ) : (
                    <View style={styles.memoryPlaceholder}>
                      <Text style={styles.memoryPlaceholderText}>📸</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {tripCollections.length === 0 && memories.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No memories yet</Text>
          <Text style={styles.emptySubtext}>Start creating trips and sharing your travel moments!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F1',
  },
  content: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tripsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tripCard: {
    width: TRIP_CARD_WIDTH,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.white.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tripImage: {
    width: '100%',
    height: '100%',
  },
  tripImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripPlaceholderText: {
    fontSize: 48,
  },
  tripOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  tripName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white.primary,
    marginBottom: 4,
  },
  tripCount: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.white.secondary,
  },
  memoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 4,
  },
  memoryItem: {
    width: (width - 32 - 8) / 3,
    height: (width - 32 - 8) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
  },
  memoryPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.white.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryPlaceholderText: {
    fontSize: 32,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.secondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
});

