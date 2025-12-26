/**
 * GroupDetailsScreen - Second step of group creation
 * Set group name, image, and description
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../providers/AuthProvider';
import { createGroup } from '../../services/groups/groupService';

interface GroupDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      selectedUsers: Array<{
        userId: string;
        username: string;
        name?: string;
        photoUrl?: string;
      }>;
    };
  };
}

export default function GroupDetailsScreen({ navigation, route }: GroupDetailsScreenProps) {
  const { user } = useAuth();
  const { selectedUsers } = route.params;

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user) return;
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setCreating(true);
    try {
      // Build member data map
      const memberData: { [userId: string]: { username: string; photoUrl?: string } } = {};
      selectedUsers.forEach((u) => {
        memberData[u.userId] = {
          username: u.username,
          photoUrl: u.photoUrl,
        };
      });

      const groupId = await createGroup(
        user.uid,
        user.displayName || 'Unknown',
        user.photoURL || '',
        groupName.trim(),
        groupDescription.trim(),
        groupImage,
        selectedUsers.map((u) => u.userId),
        memberData
      );

      // Navigate to group chat
      navigation.replace('GroupChat', {
        groupId,
        groupName: groupName.trim(),
        groupPhotoUrl: groupImage,
        memberCount: selectedUsers.length + 1, // +1 for creator
      });
    } catch (error) {
      if (__DEV__) console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
    setCreating(false);
  };

  const handleSelectImage = () => {
    // TODO: Implement image picker
    Alert.alert('Coming Soon', 'Image picker will be implemented');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-back" size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Group Image */}
        <TouchableOpacity style={styles.imageContainer} onPress={handleSelectImage}>
          {groupImage ? (
            <Image source={{ uri: groupImage }} style={styles.groupImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="camera" size={32} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.imageLabel}>Add Group Photo</Text>
        </TouchableOpacity>

        {/* Group Name */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Group Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name"
            placeholderTextColor="#999999"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
            autoCapitalize="words"
          />
          <Text style={styles.charCount}>{groupName.length}/50</Text>
        </View>

        {/* Group Description */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this group about?"
            placeholderTextColor="#999999"
            value={groupDescription}
            onChangeText={setGroupDescription}
            maxLength={200}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{groupDescription.length}/200</Text>
        </View>

        {/* Members Summary */}
        <View style={styles.membersSection}>
          <Text style={styles.label}>Members ({selectedUsers.length + 1})</Text>
          <Text style={styles.membersSummary}>
            You and {selectedUsers.length} {selectedUsers.length === 1 ? 'other' : 'others'}
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, (!groupName.trim() || creating) && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!groupName.trim() || creating}
          activeOpacity={0.8}
        >
          {creating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Group</Text>
          )}
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
    padding: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  groupImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E87A5D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 14,
    color: '#E87A5D',
    marginTop: 12,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    textAlign: 'right',
  },
  membersSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  membersSummary: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#E87A5D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#E87A5D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
