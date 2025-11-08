/**
 * Dashboard Overview Section
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVerificationStats, useVerifications } from '../../../hooks/admin/useVerifications';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function DashboardOverview({ searchQuery, navigation }: Props) {
  const { stats, loading: statsLoading } = useVerificationStats();
  // Get all verifications (no status filter) for recent activity
  const { verifications, loading: verificationsLoading } = useVerifications();

  // Show most recent verifications (including pending ones)
  const recentVerifications = verifications
    .filter(v => v.createdAt) // Only show verifications with createdAt
    .sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bDate.getTime() - aDate.getTime();
    })
    .slice(0, 5);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#43A047';
      case 'denied':
        return '#E53935';
      case 'pending':
        return '#FFB300';
      default:
        return '#757574';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Dashboard Overview</Text>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(67, 160, 71, 0.1)' }]}>
            <Icon name="checkmark-circle" size={24} color="#43A047" />
          </View>
          <Text style={styles.statValue}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(229, 57, 53, 0.1)' }]}>
            <Icon name="close-circle" size={24} color="#E53935" />
          </View>
          <Text style={styles.statValue}>{stats.denied}</Text>
          <Text style={styles.statLabel}>Denied</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 179, 0, 0.1)' }]}>
            <Icon name="time-outline" size={24} color="#FFB300" />
          </View>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(30, 136, 229, 0.1)' }]}>
            <Icon name="calendar-outline" size={24} color="#1E88E5" />
          </View>
          <Text style={styles.statValue}>{stats.upcoming}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Recent Verification Activity */}
      <View style={styles.recentSection}>
        <Text style={styles.recentTitle}>Recent Verification Activity</Text>
        {verificationsLoading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : recentVerifications.length === 0 ? (
          <Text style={styles.emptyText}>No recent verifications</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Type</Text>
              <Text style={styles.tableHeaderText}>Status</Text>
              <Text style={styles.tableHeaderText}>Date</Text>
            </View>
            {recentVerifications.map((verification) => (
              <View key={verification.id} style={styles.tableRow}>
                <Text style={styles.tableCell}>{verification.type}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(verification.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(verification.status) }]}>
                    {verification.status}
                  </Text>
                </View>
                <Text style={styles.tableCell}>{formatDate(verification.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757574',
    fontFamily: 'Poppins-Medium',
  },
  recentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C3C3B',
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 12,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#757574',
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: '#3C3C3B',
    fontFamily: 'Poppins-Regular',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
    textTransform: 'capitalize',
  },
  loadingText: {
    textAlign: 'center',
    color: '#757574',
    fontFamily: 'Poppins-Regular',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#757574',
    fontFamily: 'Poppins-Regular',
    padding: 20,
  },
});

