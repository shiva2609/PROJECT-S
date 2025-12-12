/**
 * User Management Section
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, LayoutAnimation, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUsers, suspendUser, unsuspendUser, approveUser } from '../../../hooks/admin/useUsers';
import { auth, db } from '../../../services/auth/authService';
import { doc, getDoc } from 'firebase/firestore';
import { getAccountTypeMetadata } from '../../../types/account';
import { useAuth } from '../../../providers/AuthProvider';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function UserManagement({ searchQuery, navigation }: Props) {
  const { users, loading } = useUsers();
  const { user: authUser } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>('username');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Check if current user is super admin
  const checkIsSuperAdmin = async (): Promise<boolean> => {
    try {
      const currentUser = authUser || auth.currentUser;
      if (!currentUser) return false;

      // Check adminUsers collection
      const possibleAdminIds = [
        currentUser.uid,
        currentUser.email?.toLowerCase().split('@')[0] || 'sanchariadmin',
        'sanchariadmin',
      ];

      const adminUserDocs = await Promise.all(
        possibleAdminIds.map(id => getDoc(doc(db, 'adminUsers', id)))
      );

      const adminUserDoc = adminUserDocs.find(doc => doc.exists());
      if (adminUserDoc && adminUserDoc.exists()) {
        const data = adminUserDoc.data();
        return data?.uid === currentUser.uid || data?.role === 'superAdmin';
      }

      return false;
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  };

  // Handle column sorting
  const handleSort = (field: string) => {
    // Toggle direction if same field clicked again
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    // Animate the sort change
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  // Filter users by search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.uid.toLowerCase().includes(query)
    );
  });

  // Sort filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;

    let valA: any;
    let valB: any;

    switch (sortField) {
      case 'username':
        valA = (a.username || '').toString().toLowerCase();
        valB = (b.username || '').toString().toLowerCase();
        break;
      case 'email':
        valA = (a.email || '').toString().toLowerCase();
        valB = (b.email || '').toString().toLowerCase();
        break;
      case 'role':
        valA = (a.accountType || 'Traveler').toString().toLowerCase();
        valB = (b.accountType || 'Traveler').toString().toLowerCase();
        break;
      case 'status':
        valA = a.suspended ? 'suspended' : (a.verificationStatus || 'none');
        valB = b.suspended ? 'suspended' : (b.verificationStatus || 'none');
        break;
      case 'createdAt':
        valA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || 0);
        valB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || 0);
        break;
      default:
        return 0;
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
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

  const handleApproveUser = async (uid: string) => {
    const currentUser = authUser || auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to approve users');
      return;
    }

    // Check if user is super admin
    const isSuperAdmin = await checkIsSuperAdmin();
    if (!isSuperAdmin) {
      Alert.alert(
        'Permission Denied',
        'Only super admins can approve users. Please ensure your account is in the adminUsers collection.'
      );
      return;
    }

    Alert.alert(
      'Approve User',
      'Are you sure you want to approve this user? This will mark them as verified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessingId(uid);
            try {
              await approveUser(uid, currentUser.uid);
              Alert.alert('✅ Success', 'User approved successfully!');
            } catch (error: any) {
              console.error('Error approving user:', error);
              Alert.alert('⚠️ Error', error.message || 'Failed to approve user');
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

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.tableScrollView}
        contentContainerStyle={styles.tableScrollContent}
      >
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <TouchableOpacity
              style={styles.tableHeaderCell}
              onPress={() => handleSort('username')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tableHeaderText,
                sortField === 'username' && styles.tableHeaderTextActive
              ]}>
                Name
              </Text>
              {sortField === 'username' && (
                <Icon
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color="#FF5C02"
                  style={styles.sortIcon}
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.tableHeaderCell}
              onPress={() => handleSort('email')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tableHeaderText,
                sortField === 'email' && styles.tableHeaderTextActive
              ]}>
                Username
              </Text>
              {sortField === 'email' && (
                <Icon
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color="#FF5C02"
                  style={styles.sortIcon}
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.tableHeaderCell}
              onPress={() => handleSort('role')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tableHeaderText,
                sortField === 'role' && styles.tableHeaderTextActive
              ]}>
                Role
              </Text>
              {sortField === 'role' && (
                <Icon
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color="#FF5C02"
                  style={styles.sortIcon}
                />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.tableHeaderCell}
              onPress={() => handleSort('status')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tableHeaderText,
                sortField === 'status' && styles.tableHeaderTextActive
              ]}>
                Status
              </Text>
              {sortField === 'status' && (
                <Icon
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color="#FF5C02"
                  style={styles.sortIcon}
                />
              )}
            </TouchableOpacity>
            
            <View style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderText}>Actions</Text>
            </View>
          </View>

          {sortedUsers.map((user) => {
            // Use helper function with fallback to Traveler if accountType is invalid
            const metadata = getAccountTypeMetadata(user.accountType || 'Traveler');
            return (
              <View key={user.uid} style={styles.tableRow}>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellText} numberOfLines={1}>
                    {user.username}
                  </Text>
                </View>
                <View style={styles.tableCell}>
                  <Text style={styles.tableCellText} numberOfLines={1}>
                    @{user.username}
                  </Text>
                </View>
                <View style={styles.tableCell}>
                  <View style={[styles.roleBadge, { backgroundColor: metadata.color + '20' }]}>
                    <Text style={[styles.roleText, { color: metadata.color }]}>
                      {metadata.tag}
                    </Text>
                  </View>
                </View>
                <View style={styles.tableCell}>
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
                <View style={styles.actionsCell}>
                  {/* Approve Button - only show if not verified */}
                  {user.verificationStatus !== 'verified' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleApproveUser(user.uid)}
                      disabled={processingId === user.uid}
                    >
                      {processingId === user.uid ? (
                        <ActivityIndicator size="small" color="#4CAF50" />
                      ) : (
                        <Icon
                          name="checkmark-circle-outline"
                          size={22}
                          color="#4CAF50"
                        />
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {/* Suspend/Unsuspend Button */}
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
                        size={22}
                        color={user.suspended ? '#43A047' : '#E53935'}
                      />
                    )}
                  </TouchableOpacity>
                  
                  {/* View Profile Button */}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewProfile(user.uid)}
                  >
                    <Icon name="eye-outline" size={22} color="#3C3C3B" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
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
  tableScrollView: {
    marginHorizontal: -20,
  },
  tableScrollContent: {
    paddingHorizontal: 20,
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
    minWidth: 800,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F5F1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  tableHeaderCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    minWidth: 150,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757574',
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  tableHeaderTextActive: {
    color: '#FF5C02',
    fontFamily: 'Poppins-Bold',
  },
  sortIcon: {
    marginLeft: 2,
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
    minWidth: 150,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  tableCellText: {
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
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 150,
    paddingHorizontal: 12,
  },
  actionButton: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

