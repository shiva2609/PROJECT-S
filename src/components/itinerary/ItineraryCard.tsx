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
    borderRadius: 20,
    padding: 16,
    maxWidth: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 8,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.black.primary,
    marginLeft: 8,
  },
  summary: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.black.qua,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  metaText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: Colors.brand.primary,
  },
  daysContainer: {
    // Removed maxHeight to show full itinerary
  },
  dayCard: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.qua,
  },
  lastDayCard: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  dayTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    color: Colors.black.secondary,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.white.qua,
    marginBottom: 12,
  },
  timeSlot: {
    marginBottom: 16,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: '#FF7A00',
    marginLeft: 8,
  },
  activityText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.black.tertiary,
    lineHeight: 20,
    marginLeft: 28,
    paddingRight: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  saveButtonText: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: Colors.white.primary,
  },
});

