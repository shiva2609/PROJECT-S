import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { db } from '../api/authService';
import { doc, getDoc } from 'firebase/firestore';
import { AccountType, getAccountTypeMetadata, VerificationStatus, ACCOUNT_TYPE_METADATA } from '../types/account';
import { isCurrentUserAdmin } from '../utils/adminInit';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useKYCManager } from '../hooks/useKYCManager';

export default function ProfileScreen({ navigation }: any) {
  const { user, initialized, isSuperAdmin } = useAuth();
  const reduxUser = useSelector((s: RootState) => s.user.currentUser);
  const [accountType, setAccountType] = useState<AccountType>('Traveler');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('none');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // Change Account Type moved to Side Menu - modal state removed
  const [previousTypes, setPreviousTypes] = useState<AccountType[]>([]);
  const { startPendingAccountChange, requiresVerification, hasPendingChange, getPendingChange } = useKYCManager();
  const [pendingChange, setPendingChange] = useState<any>(null);

  useEffect(() => {
    if (initialized) {
      loadUserData();
      if (user) {
        checkPendingChange();
      }
    }
  }, [initialized, user]);

  const checkPendingChange = async () => {
    if (!user) return;
    try {
      const hasPending = await hasPendingChange(user.uid);
      if (hasPending) {
        const pending = await getPendingChange(user.uid);
        setPendingChange(pending);
      } else {
        setPendingChange(null);
      }
    } catch (error) {
      console.error('Error checking pending change:', error);
    }
  };

  const loadUserData = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const accType = (userData.accountType || userData.role || 'Traveler') as AccountType;
        const verStatus = (userData.verificationStatus || 'none') as VerificationStatus;
        setAccountType(accType);
        setVerificationStatus(verStatus);
        if (Array.isArray(userData.previousTypes)) {
          setPreviousTypes(userData.previousTypes as AccountType[]);
        } else {
          setPreviousTypes([]);
        }
      }

      const adminCheck = await isCurrentUserAdmin();
      setIsAdmin(adminCheck);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const accountMetadata = getAccountTypeMetadata(accountType);
  const isPending = verificationStatus === 'pending';

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={[styles.badge, { backgroundColor: accountMetadata.color }]}>
            <Text style={styles.badgeText}>{accountMetadata.tag}</Text>
          </View>
          <Text style={styles.name}>{reduxUser?.displayName || 'Traveler'}</Text>
          <Text style={styles.sub}>{reduxUser?.email || '@guest'}</Text>
          
          {isPending && (
            <View style={styles.pendingBox}>
              <Icon name="time-outline" size={16} color={colors.danger} />
              <Text style={styles.pendingText}>Verification Pending</Text>
            </View>
          )}
        </View>


        {isAdmin && isSuperAdmin && (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.danger }]}
            onPress={() => navigation.navigate('SuperAdminDashboard')}
          >
            <Icon name="shield-checkmark-outline" size={24} color="white" />
            <Text style={[styles.upgradeButtonText, { color: 'white' }]}>Super Admin Dashboard</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Account')}>
          <Icon name="settings-outline" size={20} color={colors.text} />
          <Text style={styles.btnText}>Account Settings</Text>
        </TouchableOpacity>

        {pendingChange && (
          <View style={styles.pendingBanner}>
            <Icon name="time-outline" size={20} color={colors.primary} />
            <View style={styles.pendingBannerContent}>
              <Text style={styles.pendingBannerTitle}>
                Account Change {pendingChange.status === 'submitted' ? 'Pending Approval' : 'In Progress'}
              </Text>
              <Text style={styles.pendingBannerText}>
                {pendingChange.status === 'submitted'
                  ? 'Your request is being reviewed by an admin'
                  : `Step ${pendingChange.currentStep} of ${pendingChange.requiredSteps.length}`}
              </Text>
            </View>
            {pendingChange.status === 'in_progress' && (
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => {
                  navigation.navigate('AccountChangeFlow', {
                    toRole: pendingChange.toRole,
                    requestId: pendingChange.requestId,
                  });
                }}
              >
                <Text style={styles.resumeButtonText}>Resume</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Change Account Type moved to Side Menu */}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Type:</Text>
            <Text style={styles.infoValue}>{accountMetadata.displayName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>
              {verificationStatus === 'verified' ? 'Verified' : 
               verificationStatus === 'pending' ? 'Pending Review' : 
               accountType === 'Traveler' ? 'Active' : 'Unverified'}
            </Text>
          </View>
          {previousTypes.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.infoLabel}>Previous Roles:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {previousTypes.map((t) => {
                  const meta = getAccountTypeMetadata(t);
                  return (
                    <View key={t} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: meta.color }}>
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{meta.tag}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {previousTypes.length > 0 && (
          <View style={[styles.infoSection, { marginTop: 12 }]}>
            <Text style={styles.infoTitle}>Switch Role</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {previousTypes.map((t) => {
                const meta = getAccountTypeMetadata(t);
                return (
                  <TouchableOpacity
                    key={t}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: meta.color }}
                    onPress={() => {
                      // Navigate to admin screen if admin; otherwise prompt not included here.
                      // For MVP: show read-only; switching handled by admin approval in this iteration.
                      Alert.alert('Info', 'Role switching by user will be enabled next.');
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700' }}>{meta.tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Change Account Type functionality moved to Side Menu */}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  sub: {
    color: colors.mutedText,
    marginTop: 6,
    fontSize: 16,
  },
  pendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
  },
  pendingText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  btnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.mutedText,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.mutedText,
    marginBottom: 20,
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  typeList: {
    maxHeight: 500,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  typeOptionCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  typeInfo: {
    flex: 1,
  },
  typeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  typeDescription: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
    marginBottom: 6,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verificationNote: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  changeTypeButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  changeTypeButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pendingBannerContent: {
    flex: 1,
  },
  pendingBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  pendingBannerText: {
    fontSize: 13,
    color: colors.mutedText,
  },
  resumeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resumeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
