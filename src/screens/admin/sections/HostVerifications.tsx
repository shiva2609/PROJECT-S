/**
 * Host Verifications Section
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVerifications, Verification } from '../../../hooks/admin/useVerifications';
import { auth, db } from '../../../api/authService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  searchQuery: string;
  navigation: any;
}

export default function HostVerifications({ searchQuery, navigation }: Props) {
  const { verifications, loading } = useVerifications('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [deniedReason, setDeniedReason] = useState('');
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  const filteredVerifications = verifications.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.uid.toLowerCase().includes(query) ||
      v.id.toLowerCase().includes(query) ||
      v.type.toLowerCase().includes(query)
    );
  });

  const handleApprove = async (verification: Verification) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    Alert.alert(
      'Approve Verification',
      `Are you sure you want to approve this ${verification.type} verification?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(verification.id);
            try {
              const verificationRef = doc(db, 'verifications', verification.id);
              await updateDoc(verificationRef, {
                status: 'approved',
                reviewedBy: user.uid,
                reviewedAt: serverTimestamp(),
              });

              // Update user's accountType if it's a host verification
              if (verification.type === 'host') {
                const userRef = doc(db, 'users', verification.uid);
                await updateDoc(userRef, {
                  accountType: 'Host',
                  verificationStatus: 'verified',
                  updatedAt: Date.now(),
                });
              }

              Alert.alert('Success', 'Verification approved');
            } catch (error: any) {
              console.error('Error approving verification:', error);
              Alert.alert('Error', error.message || 'Failed to approve verification');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (verification: Verification) => {
    setSelectedVerification(verification);
    setDeniedReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedVerification) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setProcessingId(selectedVerification.id);
    try {
      const verificationRef = doc(db, 'verifications', selectedVerification.id);
      await updateDoc(verificationRef, {
        status: 'denied',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        deniedReason: deniedReason || 'Rejected by admin',
      });

      Alert.alert('Success', 'Verification rejected');
      setRejectModalVisible(false);
      setSelectedVerification(null);
      setDeniedReason('');
    } catch (error: any) {
      console.error('Error rejecting verification:', error);
      Alert.alert('Error', error.message || 'Failed to reject verification');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSchedule = (verification: Verification) => {
    setSelectedVerification(verification);
    setScheduledDate('');
    setScheduleModalVisible(true);
  };

  const confirmSchedule = async () => {
    if (!selectedVerification || !scheduledDate) {
      Alert.alert('Error', 'Please enter a scheduled date');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setProcessingId(selectedVerification.id);
    try {
      const verificationRef = doc(db, 'verifications', selectedVerification.id);
      await updateDoc(verificationRef, {
        scheduledDate: new Date(scheduledDate),
        assignedAdmin: user.uid,
        updatedAt: Date.now(),
      });

      Alert.alert('Success', 'Verification scheduled');
      setScheduleModalVisible(false);
      setSelectedVerification(null);
      setScheduledDate('');
    } catch (error: any) {
      console.error('Error scheduling verification:', error);
      Alert.alert('Error', error.message || 'Failed to schedule verification');
    } finally {
      setProcessingId(null);
    }
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
      <Text style={styles.sectionTitle}>Host Verifications</Text>
      <Text style={styles.subtitle}>Pending: {filteredVerifications.length}</Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Host</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>ID</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Type</Text>
          <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Actions</Text>
        </View>

        {filteredVerifications.map((verification) => (
          <View key={verification.id} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
              {verification.uid.substring(0, 8)}...
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>
              {verification.id.substring(0, 6)}...
            </Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>{verification.type}</Text>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <View style={[styles.statusBadge, { backgroundColor: '#FFB30020' }]}>
                <Text style={[styles.statusText, { color: '#FFB300' }]}>Pending</Text>
              </View>
            </View>
            <View style={[styles.actionsCell, { flex: 2 }]}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleApprove(verification)}
                disabled={processingId === verification.id}
              >
                {processingId === verification.id ? (
                  <ActivityIndicator size="small" color="#FF5C02" />
                ) : (
                  <Icon name="checkmark-circle" size={20} color="#43A047" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReject(verification)}
                disabled={processingId === verification.id}
              >
                <Icon name="close-circle" size={20} color="#E53935" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSchedule(verification)}
                disabled={processingId === verification.id}
              >
                <Icon name="calendar-outline" size={20} color="#1E88E5" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Verification</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for rejection..."
              placeholderTextColor="#757574"
              value={deniedReason}
              onChangeText={setDeniedReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmReject}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Recheck</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#757574"
              value={scheduledDate}
              onChangeText={setScheduledDate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setScheduleModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmSchedule}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Schedule</Text>
              </TouchableOpacity>
            </View>
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
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C3C3B',
    fontFamily: 'Poppins-Bold',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#3C3C3B',
    fontFamily: 'Poppins-Regular',
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonConfirm: {
    backgroundColor: '#FF5C02',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C3C3B',
    fontFamily: 'Poppins-SemiBold',
  },
});

