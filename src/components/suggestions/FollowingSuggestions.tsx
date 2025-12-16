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
  const {
    categories,
    loading,
    refresh,
    updateSuggestionFollowState,
    contactsPermissionGranted,
    contactsProcessed
  } = useSuggestions();
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
      // Skip using "People you may know" here to ensure we handle it if needed, or let it flow. 
      // Actually, since useSuggestions puts it in categories, we just need to ensure unique titles.

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

  // Determine if we should show the persistent permission card
  // Rule: Show ONLY if permission NOT granted AND NOT processed
  const shouldShowContactsCard = showContactsCard && !contactsPermissionGranted && !contactsProcessed;

  // CRITICAL: If no suggestions and allowed to show permission card
  if (categoriesToRender.length === 0) {
    if (shouldShowContactsCard) {
      console.log('[FollowingSuggestions] No suggestions - showing contacts card');
      return (
        <View style={[styles.container, compact && styles.compactContainer]}>
          <ContactsPermissionCard onSuccess={refresh} />
        </View>
      );
    } else {
      console.log('[FollowingSuggestions] No suggestions available - not rendering component');
      // If we have contact suggestions, they would be in categoriesToRender.
      // If categoriesToRender is empty, and we shouldn't show permission card -> Empty state or null.
      if (contactsPermissionGranted && contactsProcessed) {
        // Optional: Render specific empty state "No contacts found"
        // But for now, returning null is standard behavior for empty suggestions
        // A placeholder could be added here if desired.
        return null;
      }
      return null;
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

      {/* Render ALL suggestion categories */}
      {categoriesToRender.map((category, index) => {
        console.log('[FollowingSuggestions] Rendering category:', category.title, 'with', category.users.length, 'users');

        // Convert SuggestionUser to SuggestionCandidate
        const candidateUsers: SuggestionCandidate[] = category.users.map((user) => ({
          id: user.id,
          name: user.displayName || user.name || user.username || 'User',
          username: user.username || '',
          avatar: user.avatarUri || user.profilePic || user.profilePhoto,
          verified: user.isVerified || false,
          followersCount: user.followerCount || 0,
          followingCount: 0,
          postsCount: 0,
        }));

        return (
          <View key={`${category.title}-${index}`} style={styles.categoryWrapper}>
            <SuggestionCarousel
              title={category.title}
              users={candidateUsers}
              onUserPress={onUserPress}
              onViewMore={onViewMore}
              onFollowChange={handleFollowChange}
              compact={compact}
            />
          </View>
        );
      })}

      {/* CRITICAL: Show contacts card below suggestions ONLY if eligible */}
      {shouldShowContactsCard && (
        <View style={styles.contactsCardWrapper}>
          <ContactsPermissionCard onSuccess={refresh || (() => { })} />
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
