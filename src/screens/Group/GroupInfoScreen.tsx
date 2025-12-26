/**
 * GroupInfoScreen - Detailed group info and management
 * Shows members, options, admin actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { SmartImage } from '../../components/common/SmartImage';
import { useAuth } from '../../providers/AuthProvider';
import {
  getGroup,
  removeGroupMember,
  Group,
} from '../../services/groups/groupService';
import { getUserById, User } from '../../services/users/usersService';
import MemberListItem from '../../components/group/MemberListItem';

interface GroupMember extends User {
  role: 'admin' | 'member';
}

interface GroupInfoScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
    };
  };
}

export default function GroupInfoScreen({ navigation, route }: GroupInfoScreenProps) {
  const { user } = useAuth();
  const { groupId } = route.params;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    setLoading(true);
    try {
      const groupData = await getGroup(groupId);
      if (groupData) {
        setGroup(groupData);
        // groupData.admins is now string[]
        setIsAdmin(groupData.admins.includes(user?.uid || ''));

        // Fetch member details
        // Strict backend: members is string[]
        // Frontend must fetch details
        const memberPromises = groupData.members.map(async (memberId) => {
          const userData = await getUserById(memberId);
          if (userData) {
            return {
              ...userData,
              role: groupData.admins.includes(memberId) ? 'admin' : 'member',
            } as GroupMember;
          }
          return null;
        });

        const memberResults = await Promise.all(memberPromises);
        setMembers(memberResults.filter((m): m is GroupMember => m !== null));
      }
    } catch (error) {
      console.error("Error fetching group details:", error);
    }
    setLoading(false);
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              // Use removeGroupMember as leave logic
              await removeGroupMember(groupId, user.uid);

              // Clear stack and navigate to Chats with a success message
              navigation.reset({
                index: 0,
                routes: [{ name: 'Chats' }],
              });

              setTimeout(() => {
                Alert.alert('Left Group', 'You are no longer in this group.');
              }, 500);
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: GroupMember) => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.username} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeGroupMember(groupId, member.id);
              fetchGroupDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleAddMembers = () => {
    navigation.navigate('SelectMembers', {
      groupId,
      mode: 'add',
    });
  };

  const handleEditGroupInfo = () => {
    Alert.alert('Coming Soon', 'Edit group info will be implemented');
  };

  const handleMuteNotifications = () => {
    Alert.alert('Coming Soon', 'Mute notifications will be implemented');
  };

  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'This will clear all messages from your view. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Clear chat will be implemented');
          },
        },
      ]
    );
  };

  const handleReportGroup = () => {
    Alert.alert('Coming Soon', 'Report group will be implemented');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E87A5D" />
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Group not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#3C3C3B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Centered Group Profile Section - Soft Shadow Card */}
        <View style={styles.card}>
          <View style={styles.groupHero}>
            {group.image ? (
              <SmartImage uri={group.image} style={styles.groupImage} />
            ) : (
              <View style={styles.groupImagePlaceholder}>
                <Text style={styles.groupImagePlaceholderText}>
                  {group.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.memberCount}>
              {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
            </Text>

            {isAdmin && (
              <TouchableOpacity style={styles.editButton} onPress={handleEditGroupInfo}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Options Section - iOS Style List */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity style={styles.optionRow} onPress={handleMuteNotifications}>
            <View style={[styles.iconContainer, { backgroundColor: '#F0F0F0' }]}>
              <Icon name="notifications-outline" size={20} color="#3C3C3B" />
            </View>
            <Text style={styles.optionText}>Mute Notifications</Text>
            <Icon name="chevron-forward" size={20} color="#D1D1D1" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.optionRow} onPress={handleClearChat}>
            <View style={[styles.iconContainer, { backgroundColor: '#F0F0F0' }]}>
              <Icon name="chatbubble-ellipses-outline" size={20} color="#3C3C3B" />
            </View>
            <Text style={styles.optionText}>Clear Chat</Text>
            <Icon name="chevron-forward" size={20} color="#D1D1D1" />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.optionRow} onPress={handleReportGroup}>
            <View style={[styles.iconContainer, { backgroundColor: '#F0F0F0' }]}>
              <Icon name="flag-outline" size={20} color="#3C3C3B" />
            </View>
            <Text style={styles.optionText}>Report Group</Text>
            <Icon name="chevron-forward" size={20} color="#D1D1D1" />
          </TouchableOpacity>
        </View>

        {/* Members List */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{members.length} Members</Text>
            {isAdmin && (
              <TouchableOpacity onPress={handleAddMembers}>
                <Icon name="add" size={24} color="#F28C6B" />
              </TouchableOpacity>
            )}
          </View>

          {members.map((member, index) => (
            <View key={member.id}>
              <View style={styles.memberRow}>
                <MemberListItem
                  userId={member.id}
                  username={member.username}
                  photoUrl={member.photoUrl}
                  role={member.role}
                  onPress={(userId) => {
                    navigation.navigate('UserProfileDetail', { userId });
                  }}
                  showRole={member.role === 'admin'}
                />
                {isAdmin && member.id !== user?.uid && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(member)}
                  >
                    <Icon name="close-circle-outline" size={22} color="#EF5350" />
                  </TouchableOpacity>
                )}
              </View>
              {index < members.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>

        {/* Leave Group - Destructive Action */}
        <TouchableOpacity style={styles.destructiveButton} onPress={handleLeaveGroup}>
          <Text style={styles.destructiveButtonText}>Leave Group</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F1', // Premium Light Bg
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    fontFamily: 'System',
  },
  errorButton: {
    backgroundColor: '#F28C6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F5F1', // Seamless with bg
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'System',
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  groupHero: {
    alignItems: 'center',
  },
  groupImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#F8F5F1',
  },
  groupImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#F28C6B', // Brand Orange
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#F8F5F1',
  },
  groupImagePlaceholderText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3C3C3B',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'System',
  },
  memberCount: {
    fontSize: 14,
    color: '#8E8E8E',
    fontWeight: '500',
    marginBottom: 16,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FDECE7',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F28C6B',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3C3C3B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#3C3C3B',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 60, // Indented separator
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, // MemberListItem has padding
  },
  removeButton: {
    padding: 12,
  },
  destructiveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF5350',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF5350',
  },
});
