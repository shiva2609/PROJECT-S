/**
 * SuggestionCarousel Component
 * Horizontal scrollable carousel for suggestion cards
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import SuggestionCard from './SuggestionCard';
import { SuggestionCandidate } from '../../utils/suggestionUtils';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface SuggestionCarouselProps {
  title: string;
  users: SuggestionCandidate[];
  onUserPress?: (userId: string) => void;
  onViewMore?: (category: string, users: SuggestionCandidate[]) => void;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  compact?: boolean;
}

export default function SuggestionCarousel({
  title,
  users,
  onUserPress,
  onViewMore,
  onFollowChange,
  compact = false,
}: SuggestionCarouselProps) {
  // Debug log
  React.useEffect(() => {
    console.log('[SuggestionCarousel] Mounted/Updated:', title, 'with', users.length, 'users', users.map(u => ({ id: u.id, name: u.name })));
  }, [title, users]);

  if (!users || users.length === 0) {
    console.log('[SuggestionCarousel] No users, returning null for:', title);
    return null;
  }

  const displayUsers = users.slice(0, 8);
  const hasMore = users.length > 8;

  console.log('[SuggestionCarousel] About to render FlatList with', displayUsers.length, 'displayUsers');

  return (
    <View style={styles.container}>
      {/* Category Header - Always show for "People Who Follow You", otherwise only if not compact */}
      {(!compact || title === 'People Who Follow You') && (
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>{title}</Text>
          {hasMore && (
            <TouchableOpacity
              onPress={() => onViewMore && onViewMore(title, users)}
              style={styles.viewMoreButton}
            >
              <Text style={styles.viewMoreText}>View More</Text>
              <Icon name="chevron-forward" size={16} color={Colors.brand.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Horizontal Carousel */}
      <FlatList
        horizontal
        data={displayUsers}
        keyExtractor={(user) => user.id}
        renderItem={({ item: user, index }) => {
          console.log('[SuggestionCarousel] FlatList renderItem called:', index, user.id, user.name);
          return (
            <SuggestionCard
              user={user}
              onPress={onUserPress}
              onFollowChange={onFollowChange}
            />
          );
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        ListEmptyComponent={
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: Colors.black.qua }}>No users to display</Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              style={styles.viewMoreCard}
              onPress={() => onViewMore && onViewMore(title, users)}
            >
              <View style={styles.viewMoreCardContent}>
                <Icon name="arrow-forward-circle" size={32} color={Colors.brand.primary} />
                <Text style={styles.viewMoreCardText}>View More</Text>
              </View>
            </TouchableOpacity>
          ) : null
        }
        removeClippedSubviews={false}
        initialNumToRender={8}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    minHeight: 180, // Ensure minimum height so carousel is visible
    width: '100%',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewMoreText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
  },
  carouselContent: {
    paddingHorizontal: 16,
    paddingRight: 4,
  },
  viewMoreCard: {
    width: 140,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreCardContent: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  viewMoreCardText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
  },
});

