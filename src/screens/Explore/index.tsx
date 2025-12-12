import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useSearchManager } from '../../hooks/useSearchManager';

/**
 * Explore Screen
 * 
 * Simplified version with search functionality and "coming soon" message.
 */
export default function ExploreScreen({ navigation }: any) {
  const { searchUsers, searchHashtags, usersResults, hashtagResults } = useSearchManager();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      setShowSearchResults(true);
      searchUsers(searchQuery).catch(console.error);
      searchHashtags(searchQuery).catch(console.error);
    } else {
      setShowSearchResults(false);
    }
  }, [searchQuery, searchUsers, searchHashtags]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={Colors.black.qua} style={styles.searchIcon} />
        <TextInput
          style={styles.searchBar}
          placeholder="Search for travelers…"
          placeholderTextColor={Colors.black.qua}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Icon name="close-circle" size={20} color={Colors.black.qua} />
          </TouchableOpacity>
        )}
      </View>

      {showSearchResults ? (
        <View style={styles.searchResults}>
          {usersResults.length > 0 && (
            <View style={styles.searchSection}>
              <Text style={styles.searchSectionTitle}>Users</Text>
              <FlatList
                data={usersResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchItem}
                    onPress={() => {
                      setSearchQuery('');
                      navigation?.push('ProfileScreen', { userId: item.id });
                    }}
                  >
                    <Text style={styles.searchItemText}>{item.username}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
          {hashtagResults.length > 0 && (
            <View style={styles.searchSection}>
              <Text style={styles.searchSectionTitle}>Hashtags</Text>
              <FlatList
                data={hashtagResults}
                keyExtractor={(item) => item.tag}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchItem}
                    onPress={() => {
                      setSearchQuery('');
                      // Navigate to hashtag feed
                    }}
                  >
                    <Text style={styles.searchItemText}>#{item.tag}</Text>
                    <Text style={styles.searchItemCount}>{item.count} posts</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>Coming Soon ✨</Text>
          <Text style={styles.subtitle}>
            The Explore section is evolving. Meanwhile, search your friends and connect with them!
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
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.secondary,
    borderRadius: 40,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.primary,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  searchResults: {
    flex: 1,
  },
  searchSection: {
    marginBottom: 24,
  },
  searchSectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.black.primary,
    marginBottom: 12,
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.white.secondary,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchItemText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.black.primary,
  },
  searchItemCount: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
  },
  card: {
    marginTop: 40,
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black.secondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});
