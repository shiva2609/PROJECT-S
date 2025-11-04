/**
 * Admin Verification Screen
 * 
 * Allows superAdmin to review and approve/reject account upgrade requests
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import { auth, db } from '../api/authService';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, collectionGroup, getDoc, arrayUnion, deleteField } from 'firebase/firestore';
import { AccountType, ACCOUNT_TYPE_METADATA } from '../types/account';
import { VERIFICATION_TEMPLATES, VERIFICATION_LABELS } from '../constants/verificationTemplates';
import Icon from 'react-native-vector-icons/Ionicons';

interface UpgradeRequest {
  id: string;
  uid: string;
  requestedAccountType: AccountType;
  currentAccountType: AccountType;
  kycData: any;
  safetyAgreement: any;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectionReason?: string;
}

export default function AdminVerificationScreen({ navigation }: any) {
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      // Read all pendingVerifications entries across users with status == 'pending'
      const q = query(collectionGroup(db, 'pendingVerifications'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const reqs: UpgradeRequest[] = [] as any;
      snapshot.forEach((d) => {
        const parent = d.ref.parent.parent; // users/{uid}
        const uid = parent?.id || '';
        const data: any = d.data();
        const requestedAccountType = d.id as any; // document id is role key
        reqs.push({
          id: d.id + ':' + uid,
          uid,
          requestedAccountType,
          currentAccountType: 'Traveler' as any,
          kycData: {},
          safetyAgreement: {},
          status: 'pending',
          createdAt: data?.submittedAt || Date.now(),
        });
      });
      setRequests(reqs);
    } catch (error) {
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
      `Are you sure you want to approve this upgrade to ${ACCOUNT_TYPE_METADATA[request.requestedAccountType].displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setProcessingId(request.id);
            try {
              // Load current role to push into previousTypes when switching
              const userRef = doc(db, 'users', request.uid);
              const userSnap = await getDoc(userRef);
              const currentType = (userSnap.exists() ? (userSnap.data() as any).accountType : 'Traveler') as any;

              // Update user document to new role and append previousTypes
              await updateDoc(userRef, {
                accountType: request.requestedAccountType,
                verificationStatus: 'verified',
                roleStatus: 'approved',
                previousTypes: arrayUnion(currentType),
                pendingRole: deleteField(),
                updatedAt: Date.now(),
              });

              Alert.alert('Success', 'Upgrade request approved successfully');

              // If using upgrade_requests collection, update it as well when structured that way
              try {
                await updateDoc(doc(db, 'upgrade_requests', request.uid), {
                  status: 'approved',
                });
              } catch {}
              loadRequests();
            } catch (error: any) {
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
    Alert.prompt(
      'Reject Request',
      'Enter rejection reason (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async (reason) => {
            const user = auth.currentUser;
            if (!user) return;

            setProcessingId(request.id);
            try {
              // Update user document
              await updateDoc(doc(db, 'users', request.uid), {
                verificationStatus: 'rejected',
                updatedAt: Date.now(),
              });

              // Update upgrade request
              await updateDoc(doc(db, 'upgradeRequests', request.id), {
                status: 'rejected',
                reviewedAt: Date.now(),
                reviewedBy: user.uid,
                rejectionReason: reason || 'Rejected by admin',
              });

              Alert.alert('Success', 'Upgrade request rejected');
              loadRequests();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject request');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
      'plain-text'
    );
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
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadRequests();
          }} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="checkmark-circle-outline" size={64} color={colors.mutedText} />
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : (
          requests.map((request) => {
            const requestedMetadata = ACCOUNT_TYPE_METADATA[request.requestedAccountType];
            const isProcessing = processingId === request.id;

            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: requestedMetadata.color }]}>
                    <Text style={styles.typeBadgeText}>{requestedMetadata.tag}</Text>
                  </View>
                  <Text style={styles.timeText}>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Requested Account Type:</Text>
                  <Text style={styles.infoValue}>{requestedMetadata.displayName}</Text>
                </View>

                {/* Required Documents based on template */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Required Documents:</Text>
                  <View style={{ marginTop: 6, gap: 6 }}>
                    {(VERIFICATION_TEMPLATES[request.requestedAccountType] || []).map((k) => (
                      <Text key={k} style={{ color: '#6B7280', fontSize: 13 }}>• {VERIFICATION_LABELS[k] || k}</Text>
                    ))}
                  </View>
                </View>

                {request.kycData && (
                  <>
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>Name:</Text>
                      <Text style={styles.infoValue}>{request.kycData.fullName}</Text>
                    </View>
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>ID Type:</Text>
                      <Text style={styles.infoValue}>{request.kycData.idType.toUpperCase()}</Text>
                    </View>
                    <View style={styles.infoSection}>
                      <Text style={styles.infoLabel}>ID Number:</Text>
                      <Text style={styles.infoValue}>{request.kycData.idNumber}</Text>
                    </View>
                    {request.kycData.businessName && (
                      <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Business Name:</Text>
                        <Text style={styles.infoValue}>{request.kycData.businessName}</Text>
                      </View>
                    )}
                    {request.kycData.registrationNumber && (
                      <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Registration:</Text>
                        <Text style={styles.infoValue}>{request.kycData.registrationNumber}</Text>
                      </View>
                    )}
                  </>
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
    backgroundColor: colors.success,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});





