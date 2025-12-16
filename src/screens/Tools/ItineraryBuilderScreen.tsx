/**
 * Sanchari Copilot - Itinerary Builder Screen
 * 
 * Complete AI-powered itinerary planning interface with chat UI
 * UI/UX polish only. No logic modified.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import { generateItinerary, ItineraryResponse } from '../../services/itinerary/generateItinerary';
import { saveItineraryToFirestore } from '../../services/itinerary/itineraryService';
import Header from '../../components/itinerary/Header';
import ChatBubble from '../../components/itinerary/ChatBubble';
import SuggestedChips from '../../components/itinerary/SuggestedChips';
import ChatInput from '../../components/itinerary/ChatInput';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  itinerary?: ItineraryResponse;
}

export default function ItineraryBuilderScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: prompt,
      isUser: true,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Show loading state
    setIsLoading(true);

    try {
      // Generate itinerary
      const itinerary = await generateItinerary(prompt);

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I\'ve crafted a custom itinerary just for you. Take a look!',
        isUser: false,
        itinerary,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error generating itinerary:', error);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I hit a small bump while planning. Could we try that again?',
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMessage]);

      Alert.alert('Error', 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipPress = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleSaveItinerary = async (itinerary: ItineraryResponse) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to save itineraries.');
      return;
    }

    try {
      await saveItineraryToFirestore(user.uid, itinerary);
      Alert.alert(
        '✅ Saved!',
        'Your itinerary has been saved to your collections.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error saving itinerary:', error);
      Alert.alert('Error', 'Failed to save itinerary. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.content}>
        <Header />

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyContent}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="map" size={32} color={Colors.brand.primary} />
                </View>
                <Text style={styles.emptyTitle}>Where to next?</Text>
                <Text style={styles.emptyText}>
                  Tell me your dream destination, travel style, or budget — I'll help plan the perfect trip.
                </Text>
              </View>
            </View>
          )}

          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message.text}
              isUser={message.isUser}
              itinerary={message.itinerary}
              onSaveItinerary={
                message.itinerary
                  ? () => handleSaveItinerary(message.itinerary!)
                  : undefined
              }
            />
          ))}

          {isLoading && (
            <ChatBubble
              message=""
              isUser={false}
              isLoading={true}
            />
          )}
        </ScrollView>

        <View style={styles.bottomContainer}>
          <SuggestedChips onChipPress={handleChipPress} />
          <ChatInput
            onSend={handleSendMessage}
            disabled={isLoading}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.primary,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 24,
    paddingHorizontal: 0, // Let bubbles handle padding
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    marginTop: 40,
  },
  emptyContent: {
    alignItems: 'center',
    paddingHorizontal: 48,
    maxWidth: 400,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    color: Colors.black.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black.tertiary, // Softer text
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    backgroundColor: Colors.white.primary,
    // Ensure this stays anchored
  },
});
