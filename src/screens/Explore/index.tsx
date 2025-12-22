import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import ExploreUserItem, { ExploreUserItemData } from '../../components/explore/ExploreUserItem';

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

export default function ExploreScreen({ navigation }: any) {
  const { searchUsers, usersResults, loading } = useSearchManager();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      searchUsers(debouncedSearchQuery).catch(console.error);
    }
  }, [debouncedSearchQuery, searchUsers]);

  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const handleUserPress = useCallback((userId: string) => {
    setSearchQuery('');
    navigation?.push('ProfileScreen', { userId });
  }, [navigation]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    inputRef.current?.focus();
  }, []);

  const showResults = searchQuery.trim().length > 0;

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', Colors.brand.primary],
  });

  const renderItem = useCallback(({ item }: { item: ExploreUserItemData }) => (
    <ExploreUserItem item={item} onPress={handleUserPress} />
  ), [handleUserPress]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 73, // 72 item + 1 separator
    offset: 73 * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: ExploreUserItemData) => item.id, []);

  // Memoize separator to avoid re-renders
  const Separator = useMemo(() => {
    return () => <View style={styles.separator} />;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            borderColor: borderColor,
            borderWidth: 1.5,
            backgroundColor: isFocused ? Colors.white.primary : Colors.white.secondary,
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

      {/* Results */}
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
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              renderItem={renderItem}
              ItemSeparatorComponent={Separator}
              getItemLayout={getItemLayout}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
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
  separator: {
    height: 1,
    backgroundColor: Colors.white.tertiary,
    marginLeft: 72,
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
