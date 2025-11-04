import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { db } from '../api/authService';
import { doc, getDoc } from 'firebase/firestore';
import { AccountType, getAccountTypeMetadata, VerificationStatus } from '../types/account';
import UpgradeAccountModal from '../components/UpgradeAccountModal';
import { isCurrentUserAdmin } from '../utils/adminInit';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, initialized } = useAuth();
  const reduxUser = useSelector((s: RootState) => s.user.currentUser);
  const [accountType, setAccountType] = useState<AccountType>('Traveler');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('none');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [previousTypes, setPreviousTypes] = useState<AccountType[]>([]);

  useEffect(() => {
    if (initialized) {
      loadUserData();
    }
  }, [initialized, user]);

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

        {!isAdmin && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('RoleUpgrade')}
          >
            <Icon name="arrow-up-circle-outline" size={24} color={colors.primary} />
            <Text style={styles.upgradeButtonText}>Upgrade Account</Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.danger }]}
            onPress={() => navigation.navigate('AdminVerification')}
          >
            <Icon name="shield-checkmark-outline" size={24} color="white" />
            <Text style={[styles.upgradeButtonText, { color: 'white' }]}>Admin Panel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Account')}>
          <Icon name="settings-outline" size={20} color={colors.text} />
          <Text style={styles.btnText}>Account Settings</Text>
        </TouchableOpacity>

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

      {/* Legacy modal kept but not used when RoleUpgrade is present */}
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
});
