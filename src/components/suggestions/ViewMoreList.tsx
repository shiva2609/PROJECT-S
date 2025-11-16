/**
 * ViewMoreList Component
 * Full-screen list view for a suggestion category with filters and infinite scroll
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import SuggestionCard from './SuggestionCard';
import { SuggestionCandidate } from '../../utils/suggestionUtils';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface ViewMoreListProps {
  category: string;
  users: SuggestionCandidate[];
  onUserPress?: (userId: string) => void;
  onClose: () => void;
}

type FilterType = 'all' | 'verified' | 'location' | 'interests';

export default function ViewMoreList({
  category,
  users,
  onUserPress,
  onClose,
}: ViewMoreListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    switch (filter) {
      case 'verified':
        filtered = filtered.filter(u => u.verified);
        break;
      case 'location':
        filtered = filtered.filter(u => u.location);
        break;
      case 'interests':
        filtered = filtered.filter(u => u.interests && u.interests.length > 0);
        break;
      default:
        break;
    }

    return filtered;
  }, [users, filter]);

  const renderUser = ({ item }: { item: SuggestionCandidate }) => (
    <View style={styles.userCard}>
      <SuggestionCard user={item} onPress={onUserPress} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={Colors.black.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['all', 'verified', 'location', 'interests'] as FilterType[]).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterButton,
                filter === filterType && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(filterType)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === filterType && styles.filterTextActive,
                ]}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.primary} />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="people-outline" size={64} color={Colors.black.qua} />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
  },
  placeholder: {
    width: 32,
  },
  filtersContainer: {
    backgroundColor: Colors.white.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white.tertiary,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white.tertiary,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.brand.primary,
  },
  filterText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.black.secondary,
  },
  filterTextActive: {
    color: Colors.white.primary,
    fontFamily: Fonts.semibold,
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    flex: 1,
    margin: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black.qua,
    textAlign: 'center',
  },
});

