/**
 * ChatBubble Component
 * 
 * Displays user and AI messages in chat bubbles
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import ItineraryCard from './ItineraryCard';
import { ItineraryResponse } from '../../services/itinerary/generateItinerary';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  isLoading?: boolean;
  itinerary?: ItineraryResponse;
  onSaveItinerary?: () => void;
}

export default function ChatBubble({
  message,
  isUser,
  isLoading = false,
  itinerary,
  onSaveItinerary,
}: ChatBubbleProps) {
  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiContainer}>
      <View style={styles.aiAvatar}>
        <Icon name="sparkles-outline" size={18} color={Colors.brand.primary} />
      </View>
      <View style={styles.aiContent}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.brand.primary} />
            <Text style={styles.loadingText}>Designing your perfect trip...</Text>
          </View>
        ) : (
          <>
            {itinerary ? (
              <ItineraryCard
                itinerary={itinerary}
                onSave={onSaveItinerary}
              />
            ) : (
              <View style={styles.aiBubble}>
                <Text style={styles.aiText}>{message}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  userBubble: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 24,
    borderBottomRightRadius: 4, // Subtle message tail effect
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: '80%',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  userText: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colors.white.primary,
    lineHeight: 24,
  },
  aiContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white.primary,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: -4, // Align slightly higher
  },
  aiContent: {
    flex: 1,
  },
  aiBubble: {
    backgroundColor: '#F7F8F9', // Very subtle cool gray
    borderRadius: 24,
    borderTopLeftRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: '90%',
  },
  aiText: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    color: Colors.black.primary,
    lineHeight: 26, // Better readability
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent', // Cleaner look without box
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  loadingText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    color: Colors.black.tertiary, // Softer text color
    marginLeft: 12,
  },
});

