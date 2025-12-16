/**
 * SuggestedChips Component
 * 
 * Horizontal scrollable chips with suggested prompts
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface Chip {
  id: string;
  icon: string;
  label: string;
  prompt: string;
}

const SUGGESTED_CHIPS: Chip[] = [
  {
    id: '1',
    icon: 'airplane-outline',
    label: '3-day trip to Paris',
    prompt: 'Plan a 3-day trip to Paris under ₹50,000',
  },
  {
    id: '2',
    icon: 'trail-sign-outline',
    label: 'Adventure getaway',
    prompt: 'Plan a 5-day adventure trip to the mountains',
  },
  {
    id: '3',
    icon: 'water-outline',
    label: 'Beach vacation',
    prompt: 'Plan a 4-day beach vacation to Goa under ₹30,000',
  },
  {
    id: '4',
    icon: 'restaurant-outline',
    label: 'Food tour',
    prompt: 'Plan a 3-day food and culture tour',
  },
  {
    id: '5',
    icon: 'leaf',
    label: 'Eco-friendly trip',
    prompt: 'Plan a sustainable 4-day eco-friendly travel itinerary',
  },
];

interface SuggestedChipsProps {
  onChipPress: (prompt: string) => void;
}

export default function SuggestedChips({ onChipPress }: SuggestedChipsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SUGGESTED_CHIPS.slice(0, 3).map((chip) => (
          <TouchableOpacity
            key={chip.id}
            style={styles.chip}
            onPress={() => onChipPress(chip.prompt)}
            activeOpacity={0.7}
          >
            <Icon name={chip.icon} size={18} color={Colors.black.tertiary} />
            <Text style={styles.chipText}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingBottom: 16,
    backgroundColor: Colors.white.primary,
    // borderTopWidth: 1, // Remove divider for cleaner look
    // borderTopColor: Colors.white.qua,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA', // Almost white/transparent feel
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
  },
  chipText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    color: Colors.black.secondary,
    marginLeft: 6,
  },
});

