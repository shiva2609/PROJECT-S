/**
 * Explore Screen
 * V1: Real-time username search with autocomplete (Instagram-style)
 * 
 * Search Implementation:
 * - Character-by-character autocomplete
 * - Debounced for performance
 * - Case-insensitive username matching
 * - Instant results display
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useSearchManager } from '../../hooks/useSearchManager';
import UserAvatar from '../../components/user/UserAvatar';

// V1: Lightweight debounce for search (300ms)
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// WhatsApp-style active search UI — visual only.
export default function ExploreScreen({ navigation }: any) {
  const { searchUsers, usersResults, loading } = useSearchManager();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // V1: 300ms debounce
  const inputRef = useRef<TextInput>(null);

  // V1: Real-time search - triggers on every character after debounce
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      searchUsers(debouncedSearchQuery).catch(console.error);
    }
  }, [debouncedSearchQuery, searchUsers]);

  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  // Animate border color on focus change
  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false, // backgroundColor/borderColor not supported by native driver on some versions
    }).start();
  }, [isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Handle user selection
  const handleUserPress = useCallback((userId: string) => {
    // Clear search
    setSearchQuery('');

    // Navigate to profile
    navigation?.push('ProfileScreen', { userId });
  }, [navigation]);

  // Clear search
  const handleClear = useCallback(() => {
    setSearchQuery('');
    // Keep focus active as per requirements
    inputRef.current?.focus();
  }, []);

  const showResults = searchQuery.trim().length > 0;

  // Interpolate border color
  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', Colors.brand.primary],
  });

  // Interpolate background color for extra polish (optional, but nice)
  // WhatsApp keeps similar background, maybe slightly lighter? matching current style is fine.

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            borderColor: borderColor,
            borderWidth: 1.5, // Slightly thicker for emphasis
            backgroundColor: isFocused ? Colors.white.primary : Colors.white.secondary, // Slight brightness shift
          }
        ]}
      >
        <Icon
          name="search"
          size={20}
          color={isFocused ? Colors.brand.primary : Colors.black.qua}
          style={styles.searchIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.searchBar}
          placeholder="Search usernames..."
          placeholderTextColor={Colors.black.qua}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {/* Clear Icon: Visible only when focused AND has text */}
        {searchQuery.length > 0 && isFocused && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <Icon name="close-circle" size={20} color={Colors.brand.primary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Search Results or Empty State */}
      {showResults ? (
        <View style={styles.resultsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.brand.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : usersResults.length > 0 ? (
            <FlatList
              data={usersResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => handleUserPress(item.id)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <UserAvatar uri={item.avatarUri} size="md" />

                  {/* User Info */}
                  <View style={styles.userInfo}>
                    <View style={styles.usernameRow}>
                      <Text style={styles.username}>@{item.username}</Text>
                      {item.isVerified && (
                        <Icon name="checkmark-circle" size={16} color={Colors.brand.primary} />
                      )}
                    </View>
                    {item.displayName && (
                      <Text style={styles.displayName}>{item.displayName}</Text>
                    )}
                  </View>

                  {/* Chevron */}
                  <Icon name="chevron-forward" size={20} color={Colors.black.qua} />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListFooterComponent={
                usersResults.length >= 20 ? (
                  <Text style={styles.footerText}>
                    Showing top 20 results. Refine your search for more.
                  </Text>
                ) : null
              }
            />
          ) : (
            <View style={styles.emptyResults}>
              <Icon name="search-outline" size={48} color={Colors.black.qua} />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for a different username
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <Icon name="compass" size={48} color={Colors.brand.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>Discover Travelers</Text>
          <Text style={styles.emptyStateSubtitle}>
            Search for usernames to find and connect with fellow travelers
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white.primary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  username: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
  },
  displayName: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.white.tertiary,
    marginLeft: 72, // Align with text
  },
  footerText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
    padding: 16,
  },
  emptyResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.brand.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 12,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
