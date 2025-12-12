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
  showContactsCard?: boolean; // Show contacts card when no suggestions (default: false)
}

export default function FollowingSuggestions({
  currentUser,
  onUserPress,
  onViewMore,
  compact = false,
  showContactsCard = false,
}: FollowingSuggestionsProps) {
  const { categories, loading, refresh, updateSuggestionFollowState } = useSuggestions();
  const [contactsModalVisible, setContactsModalVisible] = useState(false);

  // Safety check: Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Handle follow state change from SuggestionCard - memoized to prevent infinite loops
  const handleFollowChange = useCallback((userId: string, isFollowing: boolean) => {
    // Update local state only - no refetch
    if (updateSuggestionFollowState) {
      updateSuggestionFollowState(userId, isFollowing);
    }
  }, [updateSuggestionFollowState]);

  // Debug: Log categories being rendered - MUST be before any conditional returns
  useEffect(() => {
    if (safeCategories.length > 0) {
      console.log('[FollowingSuggestions] Categories state:', safeCategories.length, safeCategories.map(c => ({ title: c.title, count: c.users?.length || 0 })));
      const categoriesWithUsers = safeCategories.filter(
        category => category.users && category.users.length > 0
      );
      console.log('[FollowingSuggestions] Categories with users:', categoriesWithUsers.length, categoriesWithUsers.map(c => ({ title: c.title, count: c.users.length })));
    }
  }, [safeCategories]);

  // Filter categories that have users (only render when there are actual suggestions)
  const peopleWhoFollowYouIndex = safeCategories.findIndex(
    category => category.title === 'People Who Follow You' && category.users && category.users.length > 0
  );
  const peopleWhoFollowYouCategory = peopleWhoFollowYouIndex >= 0 ? safeCategories[peopleWhoFollowYouIndex] : null;
  
  // Filter other categories that have users, excluding "People Who Follow You" and any duplicates
  const seenTitles = new Set<string>();
  const otherCategoriesWithUsers = safeCategories.filter(
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
  
  // Build list of categories to render
  const categoriesToRender: typeof safeCategories = [];
  if (peopleWhoFollowYouCategory) {
    categoriesToRender.push(peopleWhoFollowYouCategory);
  }
  categoriesToRender.push(...otherCategoriesWithUsers);
  
  if (categoriesToRender.length > 0) {
    console.log('[FollowingSuggestions] Categories to render:', categoriesToRender.length, categoriesToRender.map(c => ({ title: c.title, count: c.users?.length || 0 })));
  }
  
  // Show loading state only if loading and no categories yet
  if (loading && safeCategories.length === 0) {
    return null; // Don't show loading placeholders - wait for actual suggestions
  }

  // CRITICAL: If no suggestions and showContactsCard is true, show contacts card
  if (categoriesToRender.length === 0) {
    if (showContactsCard) {
      console.log('[FollowingSuggestions] No suggestions available - showing contacts card');
      return (
        <View style={[styles.container, compact && styles.compactContainer]}>
          <ContactsPermissionCard onSuccess={refresh} />
        </View>
      );
    } else {
      console.log('[FollowingSuggestions] No suggestions available - not rendering component');
      return null; // Don't render anything if no suggestions and contacts card not requested
    }
  }

  // Render suggestions - only when we have actual categories with users
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* Header (only if not compact) */}
      {!compact && (
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

      {/* Render ALL suggestion categories - "People Who Follow You" first (highest priority) */}
      {categoriesToRender.map((category, index) => {
        console.log('[FollowingSuggestions] Rendering category:', category.title, 'with', category.users.length, 'users');
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
      
      {/* CRITICAL: Always show contacts card below suggestions when showContactsCard is true (when posts have ended) */}
      {showContactsCard && (
        <View style={styles.contactsCardWrapper}>
          <ContactsPermissionCard onSuccess={refresh || (() => {})} />
        </View>
      )}

      <ContactsPermissionModal
        visible={contactsModalVisible}
        onClose={() => setContactsModalVisible(false)}
        onSuccess={() => {
          if (refresh) refresh();
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
  contactsCardWrapper: {
    marginTop: 8,
    marginBottom: 8,
  },
});
