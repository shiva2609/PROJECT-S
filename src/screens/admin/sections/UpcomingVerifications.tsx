/**
 * Upcoming Verifications Section
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVerifications } from '../../../hooks/admin/useVerifications';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function UpcomingVerifications({ searchQuery, navigation }: Props) {
  const { verifications, loading } = useVerifications();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingVerifications = verifications.filter((v) => {
    if (!v.scheduledDate) return false;
    const scheduled = v.scheduledDate.toDate ? v.scheduledDate.toDate() : new Date(v.scheduledDate);
    return scheduled >= today;
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Upcoming Verifications</Text>
      <Text style={styles.subtitle}>Total: {upcomingVerifications.length}</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Host</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Method</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Assigned Admin</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Notes</Text>
        </View>

        {upcomingVerifications.map((verification) => (
          <View key={verification.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1 }]}>
              {formatDate(verification.scheduledDate)}
            </Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
              {verification.uid.substring(0, 8)}...
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{verification.type}</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
              {verification.assignedAdmin?.substring(0, 8) || 'N/A'}
            </Text>
            <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={2}>
              {verification.notes || 'No notes'}
            </Text>
          </View>
        ))}
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
});

