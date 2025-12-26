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
  leaveGroup,
  removeGroupMember,
  Group,
  GroupMember,
} from '../../services/groups/groupService';
import MemberListItem from '../../components/group/MemberListItem';

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
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    setLoading(true);
    const groupData = await getGroup(groupId);
    if (groupData) {
      setGroup(groupData);
      setIsAdmin(groupData.adminIds.includes(user?.uid || ''));
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
              await leaveGroup(groupId, user.uid);
              navigation.navigate('ChatRoom');
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
              await removeGroupMember(groupId, member.userId);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="close" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Info</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Group Details */}
        <View style={styles.groupHeader}>
          <SmartImage uri={group.photoUrl} style={styles.groupImage} />
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.memberCount}>
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </Text>
          {group.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
          
          {isAdmin && (
            <TouchableOpacity style={styles.editButton} onPress={handleEditGroupInfo}>
              <Icon name="create-outline" size={16} color="#E87A5D" />
              <Text style={styles.editButtonText}>Edit Group Info</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Members List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Members ({group.members.length})</Text>
            {isAdmin && (
              <TouchableOpacity onPress={handleAddMembers}>
                <Icon name="add-circle" size={24} color="#E87A5D" />
              </TouchableOpacity>
            )}
          </View>

          {group.members.map((member) => (
            <View key={member.userId} style={styles.memberRow}>
              <MemberListItem
                userId={member.userId}
                username={member.username}
                photoUrl={member.photoUrl}
                role={member.role}
                onPress={(userId) => {
                  navigation.navigate('UserProfileDetail', { userId });
                }}
                showRole={member.role === 'admin'}
              />
              {isAdmin && member.userId !== user?.uid && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveMember(member)}
                >
                  <Icon name="close-circle" size={20} color="#E87A5D" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Group Options */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.option} onPress={handleMuteNotifications}>
            <Icon name="notifications-off-outline" size={22} color="#666666" />
            <Text style={styles.optionText}>Mute Notifications</Text>
            <Icon name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleClearChat}>
            <Icon name="trash-outline" size={22} color="#666666" />
            <Text style={styles.optionText}>Clear Chat</Text>
            <Icon name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleReportGroup}>
            <Icon name="flag-outline" size={22} color="#666666" />
            <Text style={styles.optionText}>Report Group</Text>
            <Icon name="chevron-forward" size={20} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {/* Leave Group */}
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
          <Icon name="exit-outline" size={22} color="#FFFFFF" />
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDE7',
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
  },
  errorButton: {
    backgroundColor: '#E87A5D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
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
  placeholder: {
    width: 32,
  },
  content: {
    paddingBottom: 32,
  },
  groupHeader: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  groupImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#E87A5D',
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 8,
    textAlign: 'center',
  },
  memberCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(232, 122, 93, 0.1)',
    gap: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E87A5D',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    padding: 12,
    marginRight: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1C',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E87A5D',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
