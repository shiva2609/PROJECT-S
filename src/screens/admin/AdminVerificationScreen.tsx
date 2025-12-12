/**
 * Admin Verification Screen
 * 
 * Allows superAdmin to review and approve/reject account upgrade requests
 * Updated to work with new upgrade_requests collection structure
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
  RefreshControl,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { auth, db } from '../../services/auth/authService';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { AccountType, ACCOUNT_TYPE_METADATA } from '../../types/account';
import { UpgradeRequest } from '../../types/kyc';
import Icon from 'react-native-vector-icons/Ionicons';

export default function AdminVerificationScreen({ navigation }: any) {
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      // Load pending upgrade requests from upgrade_requests collection
      const q = query(
        collection(db, 'upgrade_requests'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const reqs: UpgradeRequest[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reqs.push({
          ...data,
          requestId: docSnap.id,
        } as UpgradeRequest);
      });
      
      setRequests(reqs);
    } catch (error: any) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load upgrade requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (request: UpgradeRequest) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    Alert.alert(
      'Approve Request',
      `Are you sure you want to approve this upgrade from ${ACCOUNT_TYPE_METADATA[request.fromRole]?.displayName} to ${ACCOUNT_TYPE_METADATA[request.toRole]?.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(request.requestId);
            try {
              // Update upgrade request status to approved
              const requestRef = doc(db, 'upgrade_requests', request.requestId);
              await updateDoc(requestRef, {
                status: 'approved',
                reviewedBy: user.uid,
                reviewedAt: serverTimestamp(),
              });

              // The Cloud Function will handle updating the user's accountType
              // But we can also update the pendingAccountChange status here
              const userRef = doc(db, 'users', request.uid);
              await updateDoc(userRef, {
                'pendingAccountChange.status': 'approved',
                'pendingAccountChange.approvedAt': serverTimestamp(),
                updatedAt: Date.now(),
              });

              Alert.alert('Success', 'Upgrade request approved. User account type will be updated.');
              loadRequests();
            } catch (error: any) {
              console.error('Error approving request:', error);
              Alert.alert('Error', error.message || 'Failed to approve request');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (request: UpgradeRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedRequest) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setProcessingId(selectedRequest.requestId);
    try {
      // Update upgrade request status to rejected
      const requestRef = doc(db, 'upgrade_requests', selectedRequest.requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
        adminComment: rejectReason || 'Rejected by admin',
      });

      // Update user's pendingAccountChange status
      const userRef = doc(db, 'users', selectedRequest.uid);
      await updateDoc(userRef, {
        'pendingAccountChange.status': 'rejected',
        'pendingAccountChange.rejectedAt': serverTimestamp(),
        'pendingAccountChange.adminComment': rejectReason || 'Rejected by admin',
        updatedAt: Date.now(),
      });

      Alert.alert('Success', 'Upgrade request rejected');
      setRejectModalVisible(false);
      setSelectedRequest(null);
      setRejectReason('');
      loadRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', error.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderStepData = (request: UpgradeRequest) => {
    if (!request.stepData) return null;

    return Object.entries(request.stepData).map(([stepKey, stepData]) => {
      const step = request.requiredSteps.find((s) => s.key === stepKey);
      if (!step) return null;

      return (
        <View key={stepKey} style={styles.stepSection}>
          <Text style={styles.stepTitle}>{step.label}</Text>
          
          {/* Form Data */}
          {stepData.formData && (
            <View style={styles.formDataContainer}>
              {Object.entries(stepData.formData).map(([fieldKey, value]) => {
                const field = step.fields?.find((f) => f.key === fieldKey);
                return (
                  <View key={fieldKey} style={styles.formField}>
                    <Text style={styles.formLabel}>{field?.label || fieldKey}:</Text>
                    <Text style={styles.formValue}>{String(value)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Uploaded Document */}
          {stepData.uploadedDoc && (
            <View style={styles.docContainer}>
              <Text style={styles.docLabel}>Document:</Text>
              <Image
                source={{ uri: stepData.uploadedDoc.url }}
                style={styles.docImage}
                resizeMode="contain"
              />
              {stepData.uploadedDoc.fileName && (
                <Text style={styles.docFileName}>{stepData.uploadedDoc.fileName}</Text>
              )}
            </View>
          )}
        </View>
      );
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Verification Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRequests();
            }}
          />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="checkmark-circle-outline" size={64} color={colors.mutedText} />
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : (
          requests.map((request) => {
            const fromMetadata = ACCOUNT_TYPE_METADATA[request.fromRole];
            const toMetadata = ACCOUNT_TYPE_METADATA[request.toRole];
            const isProcessing = processingId === request.requestId;

            return (
              <View key={request.requestId} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.typeBadges}>
                    <View style={[styles.typeBadge, { backgroundColor: fromMetadata?.color || colors.mutedText }]}>
                      <Text style={styles.typeBadgeText}>{fromMetadata?.tag || request.fromRole}</Text>
                    </View>
                    <Icon name="arrow-forward" size={16} color={colors.mutedText} />
                    <View style={[styles.typeBadge, { backgroundColor: toMetadata?.color || colors.primary }]}>
                      <Text style={styles.typeBadgeText}>{toMetadata?.tag || request.toRole}</Text>
                    </View>
                  </View>
                  <Text style={styles.timeText}>
                    {formatDate(request.createdAt)}
                  </Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>User ID:</Text>
                  <Text style={styles.infoValue}>{request.uid}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>From:</Text>
                  <Text style={styles.infoValue}>{fromMetadata?.displayName || request.fromRole}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>To:</Text>
                  <Text style={styles.infoValue}>{toMetadata?.displayName || request.toRole}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Required Steps:</Text>
                  <Text style={styles.infoValue}>{request.requiredSteps?.length || 0} steps</Text>
                </View>

                {/* Step Data */}
                {request.stepData && Object.keys(request.stepData).length > 0 && (
                  <View style={styles.stepsContainer}>
                    <Text style={styles.stepsTitle}>Verification Details:</Text>
                    {renderStepData(request)}
                  </View>
                )}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
                    onPress={() => handleReject(request)}
                    disabled={isProcessing}
                  >
                    <Icon name="close-circle-outline" size={20} color={colors.danger} />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveButton, isProcessing && styles.buttonDisabled]}
                    onPress={() => handleApprove(request)}
                    disabled={isProcessing}
                  >
                    <Icon name="checkmark-circle-outline" size={20} color="white" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Request</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejection (optional):
            </Text>

            <TextInput
              style={styles.rejectInput}
              placeholder="Rejection reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              placeholderTextColor={colors.mutedText}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton]}
                onPress={confirmReject}
                disabled={!!processingId}
              >
                {processingId ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmRejectButtonText}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: colors.mutedText,
    marginTop: 16,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: colors.mutedText,
  },
  infoSection: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.mutedText,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stepsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  stepSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  formDataContainer: {
    gap: 8,
    marginBottom: 12,
  },
  formField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  formLabel: {
    fontSize: 13,
    color: colors.mutedText,
    flex: 1,
  },
  formValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  docContainer: {
    marginTop: 8,
  },
  docLabel: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: 8,
  },
  docImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  docFileName: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  rejectButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.success || '#10B981',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 16,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmRejectButton: {
    backgroundColor: colors.danger,
  },
  confirmRejectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
