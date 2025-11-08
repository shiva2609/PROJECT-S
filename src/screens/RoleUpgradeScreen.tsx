import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../api/authService';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { AccountType, ACCOUNT_TYPE_METADATA } from '../types/account';

type RoleKey = 'Traveler' | 'Host' | 'Agency' | 'AdventurePro' | 'Creator' | 'StayHost' | 'RideCreator' | 'EventOrganizer';

type RequirementKey = string;

interface RoleRequirementDoc {
  required: RequirementKey[];
}

interface UploadState {
  progress: number;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  url?: string;
}

export default function RoleUpgradeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [rolesMap, setRolesMap] = useState<Record<string, RoleRequirementDoc>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [uploadStates, setUploadStates] = useState<Record<RequirementKey, UploadState>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'roleRequirements', 'config'));
        if (snap.exists()) {
          setRolesMap(snap.data() as any);
        } else {
          // Fallback empty
          setRolesMap({});
        }
      } catch (e) {
        setRolesMap({});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const availableRoles: RoleKey[] = useMemo(() => {
    const all: RoleKey[] = ['Host', 'Agency', 'AdventurePro', 'Creator', 'StayHost', 'RideCreator', 'EventOrganizer'];
    return all;
  }, []);

  const requirements = useMemo<RequirementKey[]>(() => {
    if (!selectedRole) return [];
    const entry = (rolesMap as any)[selectedRole];
    return entry?.required || [];
  }, [rolesMap, selectedRole]);

  const formatLabel = (key: string) =>
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, (m) => m.toUpperCase())
      .trim();

  const handlePickAndUpload = async (field: RequirementKey) => {
    if (!user || !selectedRole) return;
    try {
      // Assume file selection handled by native document/image picker elsewhere.
      // For MVP, simulate a small blob upload.
      const storage = getStorage();
      const objectRef = ref(storage, `verifications/${user.uid}/${selectedRole}/${field}`);
      const blob = new Blob([new Uint8Array([1, 2, 3])]);
      const task = uploadBytesResumable(objectRef, blob);

      setUploadStates((prev) => ({
        ...prev,
        [field]: { progress: 0, status: 'uploading' },
      }));

      task.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadStates((prev) => ({
            ...prev,
            [field]: { ...(prev[field] || { status: 'uploading' }), progress },
          }));
        },
        (error) => {
          setUploadStates((prev) => ({
            ...prev,
            [field]: { ...(prev[field] || {}), status: 'error', progress: 0 },
          }));
          Alert.alert('Upload Error', error?.message || 'Failed to upload');
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await setDoc(
            doc(db, `users/${user.uid}/pendingVerifications`, selectedRole),
            {
              [field]: url,
              role: selectedRole,
              status: 'pending',
              submittedAt: serverTimestamp(),
            },
            { merge: true }
          );
          setUploadStates((prev) => ({
            ...prev,
            [field]: { progress: 100, status: 'uploaded', url },
          }));
        }
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to upload');
    }
  };

  const canSubmit = useMemo(() => {
    if (!selectedRole) return false;
    if (requirements.length === 0) return true;
    return requirements.every((r) => uploadStates[r]?.status === 'uploaded');
  }, [selectedRole, requirements, uploadStates]);

  const onSubmit = async () => {
    if (!user || !selectedRole) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          pendingRole: selectedRole,
          roleStatus: 'pending',
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      Alert.alert('Submitted', 'Verification submitted for review.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit');
    }
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
        <Text style={styles.title}>Upgrade Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Select Role</Text>
        <View style={styles.grid}>
          {availableRoles.map((role) => {
            const meta = ACCOUNT_TYPE_METADATA[role as AccountType];
            const selected = selectedRole === role;
            return (
              <TouchableOpacity key={role} style={[styles.roleCard, selected && { borderColor: meta.color }]} onPress={() => setSelectedRole(role)}>
                <Text style={[styles.roleTag, { color: meta.color }]}>{meta.tag}</Text>
                <Text style={styles.roleName}>{meta.displayName}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedRole && (
          <>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {requirements.length === 0 ? (
              <Text style={{ color: colors.mutedText }}>No documents required.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {requirements.map((reqKey) => {
                  const state = uploadStates[reqKey] || { status: 'idle', progress: 0 };
                  return (
                    <View key={reqKey} style={styles.reqRow}>
                      <Text style={styles.reqLabel}>{formatLabel(reqKey)}</Text>
                      <View style={styles.reqRight}>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFg, { width: `${state.progress || 0}%` }]} />
                        </View>
                        <TouchableOpacity style={styles.uploadBtn} onPress={() => handlePickAndUpload(reqKey)}>
                          <Icon name={state.status === 'uploaded' ? 'checkmark-circle' : state.status === 'uploading' ? 'time' : 'cloud-upload-outline'} size={18} color={state.status === 'uploaded' ? colors.success : state.status === 'uploading' ? colors.warning : colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]} disabled={!canSubmit} onPress={onSubmit}>
              <Text style={styles.submitText}>Submit for Review</Text>
            </TouchableOpacity>
          </>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  roleCard: { width: '47%', backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  roleTag: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  roleName: { fontSize: 14, fontWeight: '600', color: colors.text },
  reqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reqLabel: { flex: 1, color: colors.text, fontWeight: '600' },
  reqRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBarBg: { width: 140, height: 8, borderRadius: 6, backgroundColor: '#EAEAEA' }, // White Tertiary
  progressBarFg: { height: 8, borderRadius: 6, backgroundColor: '#FF5C02' }, // Brand Primary
  uploadBtn: { padding: 8 },
  submitButton: { backgroundColor: '#FF5C02', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 }, // Brand Primary
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: 'white', fontSize: 16, fontWeight: '700' },
});




