/**
 * Trip Approvals Section
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, Image, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTrips, Trip } from '../../../hooks/admin/useTrips';
import { auth, db } from '../../../api/authService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function TripApprovals({ searchQuery, navigation }: Props) {
  const { trips, loading } = useTrips('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  const filteredTrips = trips.filter((trip) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.id.toLowerCase().includes(query) ||
      trip.title.toLowerCase().includes(query) ||
      trip.hostId.toLowerCase().includes(query)
    );
  });

  const handleApprove = async (trip: Trip) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    Alert.alert(
      'Approve Trip',
      `Are you sure you want to approve "${trip.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(trip.id);
            try {
              const tripRef = doc(db, 'trips', trip.id);
              await updateDoc(tripRef, {
                status: 'approved',
                reviewedBy: user.uid,
                reviewedAt: serverTimestamp(),
              });
              Alert.alert('Success', 'Trip approved');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve trip');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeny = async (trip: Trip) => {
    Alert.alert(
      'Deny Trip',
      `Are you sure you want to deny "${trip.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            setProcessingId(trip.id);
            try {
              const tripRef = doc(db, 'trips', trip.id);
              await updateDoc(tripRef, {
                status: 'denied',
                reviewedBy: user.uid,
                reviewedAt: serverTimestamp(),
              });
              Alert.alert('Success', 'Trip denied');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to deny trip');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handlePreview = (trip: Trip) => {
    setSelectedTrip(trip);
    setPreviewModalVisible(true);
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
      <Text style={styles.sectionTitle}>Trip Approvals</Text>
      <Text style={styles.subtitle}>Pending: {filteredTrips.length}</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Title</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Host</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Actions</Text>
        </View>

        {filteredTrips.map((trip) => (
          <View key={trip.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
              {trip.title}
            </Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
              {trip.hostId.substring(0, 8)}...
            </Text>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <View style={[styles.statusBadge, { backgroundColor: '#FFB30020' }]}>
                <Text style={[styles.statusText, { color: '#FFB300' }]}>Pending</Text>
              </View>
            </View>
            <View style={[styles.actionsCell, { flex: 2 }]}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePreview(trip)}
              >
                <Icon name="eye-outline" size={18} color="#1E88E5" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleApprove(trip)}
                disabled={processingId === trip.id}
              >
                {processingId === trip.id ? (
                  <ActivityIndicator size="small" color="#FF5C02" />
                ) : (
                  <Icon name="checkmark-circle" size={18} color="#43A047" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeny(trip)}
                disabled={processingId === trip.id}
              >
                <Icon name="close-circle" size={18} color="#E53935" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trip Preview</Text>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
                <Icon name="close" size={24} color="#3C3C3B" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {selectedTrip && (
                <>
                  {selectedTrip.images && selectedTrip.images.length > 0 && (
                    <Image
                      source={{ uri: selectedTrip.images[0] }}
                      style={styles.tripImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.tripTitle}>{selectedTrip.title}</Text>
                  {selectedTrip.destination && (
                    <Text style={styles.tripDetail}>📍 {selectedTrip.destination}</Text>
                  )}
                  {selectedTrip.price && (
                    <Text style={styles.tripDetail}>💰 ₹{selectedTrip.price}</Text>
                  )}
                  {selectedTrip.startDate && (
                    <Text style={styles.tripDetail}>
                      📅 {new Date(selectedTrip.startDate).toLocaleDateString()}
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
  },
  tripImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  tripTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
    marginBottom: 12,
  },
  tripDetail: {
    fontSize: 14,
    color: '#757574',
    fontFamily: 'Poppins-Regular',
    marginBottom: 8,
  },
});

