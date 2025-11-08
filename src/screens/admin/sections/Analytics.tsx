/**
 * Analytics Section
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUsers } from '../../../hooks/admin/useUsers';
import { useVerificationStats } from '../../../hooks/admin/useVerifications';
import { useTrips } from '../../../hooks/admin/useTrips';
import { useReports } from '../../../hooks/admin/useReports';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function Analytics({ searchQuery, navigation }: Props) {
  const { users } = useUsers();
  const { stats } = useVerificationStats();
  const { trips } = useTrips();
  const { reports } = useReports();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Analytics</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{trips.length}</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending Verifications</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total Reports</Text>
        </View>
      </View>

      <View style={styles.comingSoonContainer}>
        <Text style={styles.comingSoon}>📈</Text>
        <Text style={styles.description}>
          Advanced charts and analytics will be available here.
        </Text>
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
  statsGrid: {
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
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF5C02',
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#757574',
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  comingSoon: {
    fontSize: 48,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#757574',
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
});

