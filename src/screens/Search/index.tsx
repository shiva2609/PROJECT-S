import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSearchManager } from '../../hooks/useSearchManager';
import { useUserRelations } from '../../providers/UserRelationProvider';
import UserAvatar from '../../components/user/UserAvatar';
import FollowButton from '../../components/profile/FollowButton';
import GlassHeader from '../../components/layout/GlassHeader';
import { Colors } from '../../theme/colors';
import { useFollowManager } from '../../hooks/useFollowManager';

/**
 * Search Screen
 * 
 * Displays search results for users and hashtags using useSearchManager.
 * Zero Firestore code - uses global hooks.
 */
export default function SearchScreen({ navigation: navProp }: any) {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const { searchUsers, searchHashtags, usersResults, hashtagResults, loading } = useSearchManager();
  const { isFollowing } = useUserRelations();
  const { toggleFollow } = useFollowManager();

  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      searchUsers(searchQuery);
      searchHashtags(searchQuery);
    }
  }, [searchQuery, searchUsers, searchHashtags]);

  const handleUserPress = useCallback((userId: string) => {
    navigation.navigate('Profile' as never, { userId } as never);
  }, [navigation]);

  const handleHashtagPress = useCallback((hashtag: string) => {
    navigation.navigate('Explore' as never, { hashtagFilter: hashtag } as never);
  }, [navigation]);

  const renderUserItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item.id)}
      activeOpacity={0.7}
    >
      <UserAvatar
        size="md"
        uri={item.photoUrl}
        hasStoryRing={false}
        isVerified={item.isVerified}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        {item.name && (
          <Text style={styles.name}>{item.name}</Text>
        )}
      </View>
      <FollowButton
        isFollowing={isFollowing(item.id)}
        loading={false}
        onToggle={() => toggleFollow(item.id)}
      />
    </TouchableOpacity>
  ), [handleUserPress, isFollowing, toggleFollow]);

  const renderHashtagItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.hashtagItem}
      onPress={() => handleHashtagPress(item.tag)}
      activeOpacity={0.7}
    >
      <Icon name="pound" size={24} color={Colors.brand.primary} />
      <View style={styles.hashtagInfo}>
        <Text style={styles.hashtagTag}>#{item.tag}</Text>
        <Text style={styles.hashtagCount}>{item.count} posts</Text>
      </View>
      <Icon name="chevron-forward" size={20} color={Colors.black.qua} />
    </TouchableOpacity>
  ), [handleHashtagPress]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GlassHeader
        title="Search"
        showBack={true}
        onBack={() => navigation.goBack()}
        searchMode={false}
      />

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={Colors.black.qua} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users or hashtags"
          placeholderTextColor={Colors.black.qua}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
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

      {loading && searchQuery.length > 2 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : searchQuery.length <= 2 ? (
        <View style={styles.emptyState}>
          <Icon name="search-outline" size={64} color={Colors.black.qua} />
          <Text style={styles.emptyText}>Start typing to search</Text>
          <Text style={styles.emptySubtext}>Search for users or hashtags</Text>
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          {usersResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Users</Text>
              <FlatList
                data={usersResults}
                keyExtractor={(item) => item.id}
                renderItem={renderUserItem}
                scrollEnabled={false}
              />
            </View>
          )}

          {hashtagResults.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hashtags</Text>
              <FlatList
                data={hashtagResults}
                keyExtractor={(item) => item.tag}
                renderItem={renderHashtagItem}
                scrollEnabled={false}
              />
            </View>
          )}

          {usersResults.length === 0 && hashtagResults.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="search-outline" size={64} color={Colors.black.qua} />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white.primary,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.black.primary,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.black.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black.primary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.black.primary,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    color: Colors.black.secondary,
  },
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.white.primary,
    borderRadius: 12,
  },
  hashtagInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hashtagTag: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.brand.primary,
    marginBottom: 2,
  },
  hashtagCount: {
    fontSize: 14,
    color: Colors.black.secondary,
  },
});

