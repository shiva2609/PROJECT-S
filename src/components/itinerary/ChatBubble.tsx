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
            <Text style={styles.loadingText}>Planning your trip...</Text>
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
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  userBubble: {
    backgroundColor: Colors.brand.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.white.primary,
    lineHeight: 20,
  },
  aiContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiContent: {
    flex: 1,
  },
  aiBubble: {
    backgroundColor: Colors.white.secondary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
  },
  aiText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black.secondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.brand.primary,
    marginLeft: 8,
  },
});

