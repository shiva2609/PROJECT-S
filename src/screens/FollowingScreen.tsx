/**
 * FollowingScreen
 * Main screen for Following tab with exact layout order:
 * Header -> Suggestions (if no posts) -> Feed -> Suggestions (if end reached)
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import FollowingFeed from '../components/suggestions/FollowingFeed';
import FollowingSuggestions from '../components/suggestions/FollowingSuggestions';
import { useFollowingFeed } from '../hooks/useFollowingFeed';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

interface FollowingScreenProps {
  navigation?: any;
  onUserPress?: (userId: string) => void;
  onPostPress?: (post: any) => void;
}

export default function FollowingScreen({ navigation, onUserPress, onPostPress }: FollowingScreenProps) {
  const { posts, loading, hasMore, followingIds } = useFollowingFeed();

  // Log for debugging
  console.log('📱 [FollowingScreen] Render - posts:', posts.length, 'loading:', loading, 'hasMore:', hasMore, 'followingIds:', followingIds.length);

  // Determine if posts have ended (no more posts to load)
  // Posts have ended if: not loading AND hasMore is false AND we have posts
  const postsEnded = !loading && !hasMore && posts.length > 0;
  
  // Show suggestions when:
  // Always show suggestions at the bottom after initial load completes
  // This ensures users can always discover new people to follow
  // Show when not loading (initial data has loaded)
  const shouldShowSuggestions = !loading;
  
  console.log('📱 [FollowingScreen] Posts ended:', postsEnded, '(hasMore:', hasMore, 'loading:', loading, 'posts:', posts.length, ')');
  console.log('📱 [FollowingScreen] Should show suggestions:', shouldShowSuggestions, '(!loading:', !loading, ')');

  return (
    <View style={styles.container}>
      {/* Layout: Posts FIRST, then "Posts Ended" card, then Suggestions/Contacts ALWAYS */}
      {/* Header (SegmentedControl) is in HomeScreen's ListHeaderComponent */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Following Feed - Posts FIRST (always render when available) */}
        {/* CRITICAL: inline={true} means posts render as Views inside ScrollView */}
        <FollowingFeed
          onPostPress={onPostPress}
          onUserPress={onUserPress}
          showSuggestionsBelow={false}
          inline={true}
        />

        {/* "Posts Ended" Card - Show when posts have ended */}
        {postsEnded && (
          <View style={styles.postsEndedCard}>
            <Text style={styles.postsEndedText}>You're all caught up!</Text>
            <Text style={styles.postsEndedSubtext}>No more posts to show</Text>
          </View>
        )}

        {/* Suggestions/Contacts - ALWAYS shown below posts when not loading */}
        {/* Show when: not loading (initial data has loaded) */}
        {shouldShowSuggestions && (
          <View style={styles.suggestionsWrapper}>
            <FollowingSuggestions 
              onUserPress={onUserPress}
              compact={true}
              showContactsCard={true}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  suggestionsWrapper: {
    width: '100%',
    // NO flex:1, NO bottom alignment - stays at top directly below header
  },
  postsEndedCard: {
    backgroundColor: Colors.white.primary,
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.white.tertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  postsEndedText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  postsEndedSubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
});

