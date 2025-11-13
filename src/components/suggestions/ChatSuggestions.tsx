/**
 * ChatSuggestions Component
 * Shows user suggestions above chat list when messages < 5
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import SuggestionCard from './SuggestionCard';
import { useSuggestions } from '../../hooks/useSuggestions';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface ChatSuggestionsProps {
  threadId: string;
  messageCount: number;
  onUserPress?: (userId: string) => void;
}

export default function ChatSuggestions({
  threadId,
  messageCount,
  onUserPress,
}: ChatSuggestionsProps) {
  const { categories } = useSuggestions();

  // Only show if messages < 5
  if (messageCount >= 5) {
    return null;
  }

  // Get first category's users (or combine all)
  const allUsers = categories.flatMap(cat => cat.users).slice(0, 8);

  if (allUsers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suggestions to follow</Text>
        <Text style={styles.subtitle}>Start more conversations</Text>
      </View>
      <FlatList
        horizontal
        data={allUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SuggestionCard user={item} onPress={onUserPress} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white.primary,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
});

