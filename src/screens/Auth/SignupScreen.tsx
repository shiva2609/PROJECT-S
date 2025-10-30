import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { mockSignup } from '../../api/mockAuth';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_USER_KEY } from '../../utils/constants';

export default function SignupScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const onSignup = async () => {
    if (!username.trim() || !password || password !== confirmPassword) return;
    try {
      setLoading(true);
      const user = await mockSignup(username.trim(), password);
      dispatch(
        setUser({ id: user.uid, email: user.email, displayName: user.name, photoURL: user.photoURL })
      );
      try {
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id: user.uid, email: user.email }));
      } catch {}
      navigation.replace('TravelPlanSelect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Hello! Register to get started</Text>

        <TextInput
          placeholder="Username"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          placeholder="Confirm password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={onSignup} disabled={loading}>
          {loading ? <ActivityIndicator color={'#fff'} /> : <Text style={styles.primaryBtnText}>Register</Text>}
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.muted}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('AuthLogin')}>
            <Text style={styles.linkStrong}>Login Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 24, paddingVertical: 24 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  muted: { color: colors.mutedText },
  linkStrong: { color: colors.primary, fontWeight: '700' },
});


