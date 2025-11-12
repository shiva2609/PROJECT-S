/**
 * Sanchari Copilot - Itinerary Builder Screen
 * 
 * Complete AI-powered itinerary planning interface with chat UI
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { generateItinerary, ItineraryResponse } from '../../../api/generateItinerary';
import { saveItineraryToFirestore } from '../../../api/itineraryService';
import Header from '../../../components/itinerary/Header';
import ChatBubble from '../../../components/itinerary/ChatBubble';
import SuggestedChips from '../../../components/itinerary/SuggestedChips';
import ChatInput from '../../../components/itinerary/ChatInput';
import { Colors } from '../../../theme/colors';

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
        text: 'Here\'s your personalized itinerary!',
        isUser: false,
        itinerary,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error generating itinerary:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I couldn\'t generate an itinerary right now. Please try again.',
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
        'Your itinerary has been saved and added to your chat with Sanchari Copilot.',
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
                {/* Empty state - user can start typing or use chips */}
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

        <SuggestedChips onChipPress={handleChipPress} />
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
        />
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
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContent: {
    // Empty state content can be added here if needed
  },
});
