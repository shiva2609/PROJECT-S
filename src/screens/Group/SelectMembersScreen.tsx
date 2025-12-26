/**
 * SelectMembersScreen - First step of group creation
 * Select users to add to the group
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { searchUsers, User, getFollowing } from '../../services/users/usersService';
import MemberChip from '../../components/group/MemberChip';
import MemberListItem from '../../components/group/MemberListItem';
import { useAuth } from '../../providers/AuthProvider';
import { addGroupMembers, getGroup } from '../../services/groups/groupService';

interface SelectMembersScreenProps {
  navigation: any;
  route?: {
    params?: {
      groupId?: string;
      mode?: 'create' | 'add';
    };
  };
}

// Section header component to avoid inline component creation
const SectionHeader = () => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>People you follow</Text>
  </View>
);

export default function SelectMembersScreen({ navigation, route }: SelectMembersScreenProps) {
  const { user } = useAuth();
  const groupId = route?.params?.groupId;
  const mode = route?.params?.mode || 'create';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [existingMemberIds, setExistingMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [addingMembers, setAddingMembers] = useState(false);

  // Load existing members if in 'add' mode
  useEffect(() => {
    const loadExistingMembers = async () => {
      if (mode === 'add' && groupId) {
        try {
          const groupData = await getGroup(groupId);
          if (groupData) {
            setExistingMemberIds(groupData.members.map(m => m.userId));
          }
        } catch (error) {
          if (__DEV__) console.error('Error loading group members:', error);
        }
      }
    };

    loadExistingMembers();
  }, [mode, groupId]);

  // Load following users on mount
  useEffect(() => {
    const loadFollowing = async () => {
      if (!user?.uid) return;
      
      setInitialLoading(true);
      try {
        const result = await getFollowing(user.uid, { limit: 50 });
        setFollowingUsers(result.users);
      } catch (error) {
        if (__DEV__) console.error('Error loading following:', error);
      }
      setInitialLoading(false);
    };

    loadFollowing();
  }, [user?.uid]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const results = await searchUsers(searchQuery, 20);
      setUsers(results);
    } catch (error) {
      if (__DEV__) console.error('Error searching users:', error);
    }
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      handleSearch();
    } else {
      setUsers([]);
    }
  }, [searchQuery, handleSearch]);

  const toggleUserSelection = (user: User) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const removeSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleNext = async () => {
    if (selectedUsers.length === 0) return;

    if (mode === 'add' && groupId) {
      // Add members to existing group
      setAddingMembers(true);
      try {
        const memberIds = selectedUsers.map((u) => u.id);
        const memberData = selectedUsers.reduce((acc, u) => {
          acc[u.id] = {
            username: u.username,
            photoUrl: u.photoUrl,
          };
          return acc;
        }, {} as { [userId: string]: { username: string; photoUrl?: string } });
        
        await addGroupMembers(groupId, memberIds, memberData);
        
        // Navigate back to GroupInfo and refresh
        navigation.navigate('GroupInfo', { groupId });
      } catch (error) {
        if (__DEV__) console.error('Error adding members:', error);
        Alert.alert('Error', 'Failed to add members to group');
      }
      setAddingMembers(false);
    } else {
      // Create new group flow
      navigation.navigate('GroupDetails', {
        selectedUsers: selectedUsers.map((u) => ({
          userId: u.id,
          username: u.username,
          name: u.name,
          photoUrl: u.photoUrl,
        })),
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="close" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'add' ? 'Add Members' : 'Select Members'}
        </Text>
        <TouchableOpacity
          onPress={handleNext}
          disabled={selectedUsers.length === 0 || addingMembers}
          style={styles.nextButton}
        >
          {addingMembers ? (
            <ActivityIndicator size="small" color="#E87A5D" />
          ) : (
            <Text style={[styles.nextText, selectedUsers.length === 0 && styles.nextTextDisabled]}>
              {mode === 'add' ? 'Add' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#999999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {/* Selected Members Chips */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>
            Selected ({selectedUsers.length})
          </Text>
          <View style={styles.chipsContainer}>
            {selectedUsers.map((user) => (
              <MemberChip
                key={user.id}
                userId={user.id}
                username={user.username}
                photoUrl={user.photoUrl}
                onRemove={removeSelectedUser}
              />
            ))}
          </View>
        </View>
      )}

      {/* User List */}
      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E87A5D" />
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E87A5D" />
        </View>
      ) : users.length > 0 ? (
        // Show search results
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isExistingMember = existingMemberIds.includes(item.id);
            return (
              <MemberListItem
                userId={item.id}
                username={item.username}
                name={item.name}
                photoUrl={item.photoUrl}
                isSelected={selectedUsers.some((u) => u.id === item.id)}
                onPress={() => toggleUserSelection(item)}
                showCheckbox={true}
                disabled={isExistingMember}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      ) : followingUsers.length > 0 && searchQuery.length === 0 ? (
        // Show following users by default
        <FlatList
          data={followingUsers}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={SectionHeader}
          renderItem={({ item }) => {
            const isExistingMember = existingMemberIds.includes(item.id);
            return (
              <MemberListItem
                userId={item.id}
                username={item.username}
                name={item.name}
                photoUrl={item.photoUrl}
                isSelected={selectedUsers.some((u) => u.id === item.id)}
                onPress={() => toggleUserSelection(item)}
                showCheckbox={true}
                disabled={isExistingMember}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="search" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>Search for users to add</Text>
          <Text style={styles.emptySubtext}>Or follow users to see them here</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDE7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  nextButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E87A5D',
  },
  nextTextDisabled: {
    color: '#CCCCCC',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1C',
    paddingVertical: 12,
  },
  selectedContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  selectedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  listContent: {
    backgroundColor: '#FFFFFF',
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
    fontSize: 16,
    color: '#999999',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionHeader: {
    backgroundColor: '#F5EDE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
