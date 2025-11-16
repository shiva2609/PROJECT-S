/**
 * FollowingScreen
 * Main screen for Following tab with exact layout order:
 * Header -> Suggestions (if no posts) -> Feed -> Suggestions (if end reached)
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import FollowingFeed from '../components/suggestions/FollowingFeed';
import FollowingSuggestions from '../components/suggestions/FollowingSuggestions';
import { useFollowingFeed } from '../hooks/useFollowingFeed';
import { Colors } from '../theme/colors';

interface FollowingScreenProps {
  navigation?: any;
  onUserPress?: (userId: string) => void;
  onPostPress?: (post: any) => void;
}

export default function FollowingScreen({ navigation, onUserPress, onPostPress }: FollowingScreenProps) {
  const { posts, loading, hasMore, followingIds } = useFollowingFeed();

  return (
    <View style={styles.container}>
      {/* Layout: FollowingSuggestions -> FollowingFeed */}
      {/* Header (SegmentedControl) is in HomeScreen's ListHeaderComponent */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* FollowingSuggestions - ALWAYS render immediately below header tabs (SegmentedControl) */}
        <View style={styles.suggestionsWrapper}>
          <FollowingSuggestions 
            onUserPress={onUserPress}
            compact={true}
          />
        </View>

        {/* Following Feed - Always below suggestions */}
        <FollowingFeed
          onPostPress={onPostPress}
          onUserPress={onUserPress}
          showSuggestionsBelow={false}
          inline={true}
        />
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
});

