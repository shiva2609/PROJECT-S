/**
 * Reports & Reviews Section
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useReports, Report } from '../../../hooks/admin/useReports';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function ReportsReviews({ searchQuery, navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'user' | 'trip' | 'host'>('user');
  const { reports, loading } = useReports(activeTab);

  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.id.toLowerCase().includes(query) ||
      report.reason.toLowerCase().includes(query) ||
      report.description.toLowerCase().includes(query)
    );
  });

  const handleAction = (report: Report, action: 'warn' | 'suspend' | 'dismiss') => {
    // Implementation for report actions
    console.log(`${action} report ${report.id}`);
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
      <Text style={styles.sectionTitle}>Reports & Reviews</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'user' && styles.tabActive]}
          onPress={() => setActiveTab('user')}
        >
          <Text style={[styles.tabText, activeTab === 'user' && styles.tabTextActive]}>
            User Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trip' && styles.tabActive]}
          onPress={() => setActiveTab('trip')}
        >
          <Text style={[styles.tabText, activeTab === 'trip' && styles.tabTextActive]}>
            Trip Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'host' && styles.tabActive]}
          onPress={() => setActiveTab('host')}
        >
          <Text style={[styles.tabText, activeTab === 'host' && styles.tabTextActive]}>
            Host Reports
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Type</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Reason</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Actions</Text>
        </View>

        {filteredReports.map((report) => (
          <View key={report.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>{report.type}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
              {report.reason}
            </Text>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      report.status === 'resolved'
                        ? '#43A04720'
                        : report.status === 'dismissed'
                        ? '#75757420'
                        : '#FFB30020',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        report.status === 'resolved'
                          ? '#43A047'
                          : report.status === 'dismissed'
                          ? '#757574'
                          : '#FFB300',
                    },
                  ]}
                >
                  {report.status}
                </Text>
              </View>
            </View>
            <View style={[styles.actionsCell, { flex: 2 }]}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAction(report, 'warn')}
              >
                <Icon name="warning-outline" size={18} color="#FFB300" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAction(report, 'suspend')}
              >
                <Icon name="ban-outline" size={18} color="#E53935" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAction(report, 'dismiss')}
              >
                <Icon name="trash-outline" size={18} color="#757574" />
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#FF5C02',
  },
  tabText: {
    fontSize: 13,
    color: '#757574',
    fontFamily: 'Poppins-Medium',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
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
    textTransform: 'capitalize',
  },
  actionsCell: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
});

