/**
 * User Management Section
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUsers, suspendUser, unsuspendUser } from '../../../hooks/admin/useUsers';
import { auth } from '../../../api/authService';
import { ACCOUNT_TYPE_METADATA } from '../../../types/account';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function UserManagement({ searchQuery, navigation }: Props) {
  const { users, loading } = useUsers();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.uid.toLowerCase().includes(query)
    );
  });

  const handleSuspend = async (uid: string, currentlySuspended: boolean) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    Alert.alert(
      currentlySuspended ? 'Unsuspend User' : 'Suspend User',
      `Are you sure you want to ${currentlySuspended ? 'unsuspend' : 'suspend'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlySuspended ? 'Unsuspend' : 'Suspend',
          style: currentlySuspended ? 'default' : 'destructive',
          onPress: async () => {
            setProcessingId(uid);
            try {
              if (currentlySuspended) {
                await unsuspendUser(uid);
                Alert.alert('Success', 'User unsuspended');
              } else {
                await suspendUser(uid, user.uid);
                Alert.alert('Success', 'User suspended');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update user status');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (uid: string) => {
    navigation.navigate('UserDetail', { userId: uid });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5C02" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>User Management</Text>
      <Text style={styles.subtitle}>Total Users: {filteredUsers.length}</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Username</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Role</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Actions</Text>
        </View>

        {filteredUsers.map((user) => {
          const metadata = ACCOUNT_TYPE_METADATA[user.accountType];
          return (
            <View key={user.uid} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                {user.username}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                @{user.username}
              </Text>
              <View style={[styles.tableCell, { flex: 1.5 }]}>
                <View style={[styles.roleBadge, { backgroundColor: metadata.color + '20' }]}>
                  <Text style={[styles.roleText, { color: metadata.color }]}>
                    {metadata.tag}
                  </Text>
                </View>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                {user.suspended ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#E5393520' }]}>
                    <Text style={[styles.statusText, { color: '#E53935' }]}>Suspended</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: '#43A04720' }]}>
                    <Text style={[styles.statusText, { color: '#43A047' }]}>Active</Text>
                  </View>
                )}
              </View>
              <View style={[styles.actionsCell, { flex: 1.5 }]}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleSuspend(user.uid, !!user.suspended)}
                  disabled={processingId === user.uid}
                >
                  {processingId === user.uid ? (
                    <ActivityIndicator size="small" color="#FF5C02" />
                  ) : (
                    <Icon
                      name={user.suspended ? 'checkmark-circle-outline' : 'ban-outline'}
                      size={18}
                      color={user.suspended ? '#43A047' : '#E53935'}
                    />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewProfile(user.uid)}
                >
                  <Icon name="eye-outline" size={18} color="#1E88E5" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#757574',
    fontFamily: 'Poppins-Regular',
    marginBottom: 16,
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F5F1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757574',
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: '#3C3C3B',
    fontFamily: 'Poppins-Regular',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  actionsCell: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
});

