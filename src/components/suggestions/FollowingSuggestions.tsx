/**
 * FollowingSuggestions Component
 * Container for displaying multiple horizontal carousels of user suggestions
 * Never refetches on follow - updates locally only
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSuggestions } from '../../hooks/useSuggestions';
import SuggestionCarousel from './SuggestionCarousel';
import ContactsPermissionModal from './ContactsPermissionModal';
import ContactsPermissionCard from './ContactsPermissionCard';
import PlaceholderSuggestionCarousel from './PlaceholderSuggestionCarousel';
import StackCardPlaceholder from './StackCardPlaceholder';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { SuggestionCandidate } from '../../utils/suggestionUtils';

interface FollowingSuggestionsProps {
  currentUser?: any;
  onUserPress?: (userId: string) => void;
  onViewMore?: (category: string, users: SuggestionCandidate[]) => void;
  compact?: boolean; // Hide header when compact
}

export default function FollowingSuggestions({
  currentUser,
  onUserPress,
  onViewMore,
  compact = false,
}: FollowingSuggestionsProps) {
  const { categories, loading, refresh, updateSuggestionFollowState } = useSuggestions();
  const [contactsModalVisible, setContactsModalVisible] = useState(false);

  // Handle follow state change from SuggestionCard - memoized to prevent infinite loops
  const handleFollowChange = useCallback((userId: string, isFollowing: boolean) => {
    // Update local state only - no refetch
    updateSuggestionFollowState(userId, isFollowing);
  }, [updateSuggestionFollowState]);

  // Debug: Log categories being rendered - MUST be before any conditional returns
  useEffect(() => {
    console.log('[FollowingSuggestions] Categories state:', categories.length, categories.map(c => ({ title: c.title, count: c.users.length })));
    const categoriesWithUsers = categories.filter(
      category => category.users && category.users.length > 0
    );
    console.log('[FollowingSuggestions] Categories with users:', categoriesWithUsers.length, categoriesWithUsers.map(c => ({ title: c.title, count: c.users.length })));
  }, [categories]);

  // ALWAYS render - show loading, placeholders, or actual suggestions
  if (loading && categories.length === 0) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <StackCardPlaceholder />
        <ContactsPermissionCard onSuccess={refresh} />
        <PlaceholderSuggestionCarousel />
      </View>
    );
  }

  // ALWAYS render - even if empty, show placeholders
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Stack Card Section - Always visible */}
      <StackCardPlaceholder />

      {/* Contacts Permission Card - Always visible */}
      <ContactsPermissionCard onSuccess={refresh} />

      {/* Header (only if not compact) */}
      {!compact && categories.length > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover People</Text>
          <TouchableOpacity
            style={styles.findContactsButton}
            onPress={() => setContactsModalVisible(true)}
          >
            <Icon name="people-outline" size={18} color={Colors.brand.primary} />
            <Text style={styles.findContactsText}>Find from Contacts</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Suggestions or Placeholders */}
      {(() => {
        // PRIORITY: Always show "People Who Follow You" category if it exists, regardless of other filters
        // Use findIndex to get the first occurrence only (prevent duplicates)
        const peopleWhoFollowYouIndex = categories.findIndex(
          category => category.title === 'People Who Follow You' && category.users && category.users.length > 0
        );
        const peopleWhoFollowYouCategory = peopleWhoFollowYouIndex >= 0 ? categories[peopleWhoFollowYouIndex] : null;
        
        // Filter other categories that have users, excluding "People Who Follow You" and any duplicates
        const seenTitles = new Set<string>();
        const otherCategoriesWithUsers = categories.filter(
          category => {
            // Skip "People Who Follow You" (handled separately)
            if (category.title === 'People Who Follow You') return false;
            // Skip if no users
            if (!category.users || category.users.length === 0) return false;
            // Skip duplicates (same title already seen)
            if (seenTitles.has(category.title)) {
              console.log('[FollowingSuggestions] Skipping duplicate category:', category.title);
              return false;
            }
            seenTitles.add(category.title);
            return true;
          }
        );
        
        console.log('[FollowingSuggestions] Rendering - "People Who Follow You" category:', peopleWhoFollowYouCategory ? `${peopleWhoFollowYouCategory.users.length} users` : 'not found');
        console.log('[FollowingSuggestions] Rendering - Other categories with users:', otherCategoriesWithUsers.length, otherCategoriesWithUsers.map(c => ({ title: c.title, count: c.users.length })));
        
        // ALWAYS render "People Who Follow You" if it exists (PRIORITY RULE)
        const categoriesToRender: typeof categories = [];
        
        if (peopleWhoFollowYouCategory) {
          categoriesToRender.push(peopleWhoFollowYouCategory);
          console.log('[FollowingSuggestions] Adding "People Who Follow You" category (PRIORITY - always shown)');
        }
        
        // Add other categories (no duplicates)
        categoriesToRender.push(...otherCategoriesWithUsers);
        
        if (categoriesToRender.length > 0) {
          // Render ALL categories - "People Who Follow You" first (highest priority)
          return (
            <React.Fragment>
              {categoriesToRender.map((category, index) => {
                console.log('[FollowingSuggestions] Rendering category:', category.title, 'with', category.users.length, 'users', category.users.map(u => u.id));
                return (
                  <View key={`${category.title}-${index}`} style={styles.categoryWrapper}>
                    <SuggestionCarousel
                      title={category.title}
                      users={category.users}
                      onUserPress={onUserPress}
                      onViewMore={onViewMore}
                      onFollowChange={handleFollowChange}
                      compact={compact}
                    />
                  </View>
                );
              })}
            </React.Fragment>
          );
        } else {
          // Render placeholder carousel when no suggestions available
          console.log('[FollowingSuggestions] No categories with users, showing placeholder');
          return <PlaceholderSuggestionCarousel />;
        }
      })()}

      <ContactsPermissionModal
        visible={contactsModalVisible}
        onClose={() => setContactsModalVisible(false)}
        onSuccess={() => {
          refresh();
        }}
      />
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.white.secondary,
    paddingTop: 0, // Start immediately below header - no top padding
    paddingBottom: 20,
    // NO flex:1, NO bottom alignment - stays at top
  },
  compactContainer: {
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  findContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.brand.accent + '20',
    gap: 6,
  },
  findContactsText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.brand.primary,
  },
  categoryWrapper: {
    marginBottom: 16,
  },
});
