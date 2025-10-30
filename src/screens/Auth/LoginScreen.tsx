import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { mockLogin } from '../../api/mockAuth';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_USER_KEY } from '../../utils/constants';

export default function LoginScreen({ navigation }: any) {
  // Hardcoded dummy credentials — change these to update test login
  const DUMMY_EMAIL = 'chik@sanchari.com';
  const DUMMY_PASSWORD = '1234';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const onLogin = async () => {
    if (!email.trim() || !password) return;
    // Dummy login check (replace this with real API later)
    if (email.trim().toLowerCase() === DUMMY_EMAIL && password === DUMMY_PASSWORD) {
      // On successful test credentials, proceed as usual
      navigation.replace('TravelPlanSelect');
    } else {
      // Invalid credentials show error
      Alert.alert('Invalid email or password.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerArea}>
        <Text style={styles.welcomeTop}>Welcome</Text>
        <Text style={styles.welcomeBrand}>Sanchari!</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Enter your username"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.forgotRow}>
          <TouchableOpacity onPress={() => navigation.navigate('AuthForgotPassword')}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={onLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={'#fff'} /> : <Text style={styles.primaryBtnText}>Login</Text>}
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.muted}>Don’t have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('AuthSignup')}>
            <Text style={styles.linkStrong}>Register Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerArea: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  welcomeTop: { fontSize: 24, fontWeight: '700', color: colors.primary },
  welcomeBrand: { fontSize: 40, fontWeight: '800', color: colors.primary },
  form: { paddingHorizontal: 24, paddingTop: 12 },
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
  forgotRow: { alignItems: 'flex-end', marginTop: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  muted: { color: colors.mutedText },
  linkText: { color: colors.mutedText },
  linkStrong: { color: colors.primary, fontWeight: '700' },
});


