/**
 * ItineraryCard Component
 * 
 * Displays structured day-by-day itinerary with icons
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { ItineraryResponse } from '../../services/itinerary/generateItinerary';

interface ItineraryCardProps {
  itinerary: ItineraryResponse;
  onSave?: () => void;
}

export default function ItineraryCard({ itinerary, onSave }: ItineraryCardProps) {
  const days = Object.keys(itinerary.itinerary).sort();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="map-outline" size={20} color={Colors.brand.primary} />
          <Text style={styles.title}>{itinerary.title}</Text>
        </View>
        {itinerary.summary && (
          <Text style={styles.summary}>{itinerary.summary}</Text>
        )}
        {(itinerary.destination || itinerary.duration || itinerary.budget) && (
          <View style={styles.metaRow}>
            {itinerary.destination && (
              <View style={styles.metaItem}>
                <Icon name="location-outline" size={14} color={Colors.brand.primary} style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{itinerary.destination}</Text>
              </View>
            )}
            {itinerary.duration && (
              <View style={styles.metaItem}>
                <Icon name="calendar-outline" size={14} color={Colors.brand.primary} style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{itinerary.duration}</Text>
              </View>
            )}
            {itinerary.budget && (
              <View style={styles.metaItem}>
                <Icon name="wallet-outline" size={14} color={Colors.brand.primary} style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{itinerary.budget}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.daysContainer}>
        {days.map((dayKey, index) => {
          const day = itinerary.itinerary[dayKey];
          const isLastDay = index === days.length - 1;
          return (
            <View key={dayKey} style={[styles.dayCard, isLastDay && styles.lastDayCard]}>
              <Text style={styles.dayTitle}>{day.title}</Text>
              <View style={styles.divider} />

              <View style={styles.timeSlot}>
                <View style={styles.timeHeader}>
                  <Icon name="sunny-outline" size={20} color="#FF8C42" />
                  <Text style={styles.timeLabel}>Morning</Text>
                </View>
                <Text style={styles.activityText}>{day.morning}</Text>
              </View>

              <View style={styles.timeSlot}>
                <View style={styles.timeHeader}>
                  <Icon name="partly-sunny-outline" size={20} color="#FF7A00" />
                  <Text style={styles.timeLabel}>Afternoon</Text>
                </View>
                <Text style={styles.activityText}>{day.afternoon}</Text>
              </View>

              <View style={styles.timeSlot}>
                <View style={styles.timeHeader}>
                  <Icon name="moon-outline" size={20} color="#FF8C42" />
                  <Text style={styles.timeLabel}>Evening</Text>
                </View>
                <Text style={styles.activityText}>{day.evening}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {onSave && (
        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Icon name="bookmark-outline" size={18} color={Colors.white.primary} style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Save Itinerary</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white.primary,
    borderRadius: 24,
    padding: 24, // Increased padding
    maxWidth: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.black.primary,
    marginLeft: 10,
    lineHeight: 28,
  },
  summary: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black.secondary,
    lineHeight: 24, // Increased line height
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.black.tertiary, // Softer meta text
  },
  daysContainer: {
    // Removed maxHeight
  },
  dayCard: {
    marginBottom: 24,
    // Removed border from individual days for cleaner flow
  },
  lastDayCard: {
    marginBottom: 0,
  },
  dayTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    color: Colors.black.primary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 16,
    display: 'none', // Hide divider
  },
  timeSlot: {
    marginBottom: 20,
    flexDirection: 'row',
  },
  timeHeader: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  timeLabel: {
    // Hidden in favor of icon-only time indication or adjust
    display: 'none',
  },
  activityText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black.secondary,
    lineHeight: 24,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  saveButtonText: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.white.primary,
  },
});

