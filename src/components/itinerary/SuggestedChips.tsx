/**
 * SuggestedChips Component
 * 
 * Displays suggested prompts for itinerary generation
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface SuggestedChipsProps {
    onChipPress: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
    '3-day Goa beach trip',
    'Week in Paris under ₹80k',
    'Adventure in Himalayas',
    'Weekend in Dubai',
];

export default function SuggestedChips({ onChipPress }: SuggestedChipsProps) {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.chip}
                        onPress={() => onChipPress(prompt)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.chipText}>{prompt}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
    },
    scrollContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    chip: {
        backgroundColor: Colors.white.secondary,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: Colors.white.tertiary,
    },
    chipText: {
        fontFamily: Fonts.medium,
        fontSize: 14,
        color: Colors.black.secondary,
    },
});
