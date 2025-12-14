import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { useDispatch } from 'react-redux';
import { FontFamily } from '../../GlobalStyles';
import { signUp, isUsernameAvailable } from '../../services/auth/authService';

interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface ValidationState {
  username: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
  email: 'idle' | 'valid' | 'invalid';
  password: 'idle' | 'valid' | 'invalid';
  confirmPassword: 'idle' | 'match' | 'mismatch';
}

export default function SignupScreen({ navigation }: any) {
  const [form, setForm] = useState<FormState>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [validation, setValidation] = useState<ValidationState>({
    username: 'idle',
    email: 'idle',
    password: 'idle',
    confirmPassword: 'idle',
  });

  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Username validation
  React.useEffect(() => {
    const u = form.username.trim();
    if (!u) {
      setValidation(prev => ({ ...prev, username: 'idle' }));
      return;
    }

    // Simple local validation: no '@', lowercase enforced
    if (u.includes('@')) {
      setValidation(prev => ({ ...prev, username: 'invalid' }));
      return;
    }

    let cancelled = false;
    setValidation(prev => ({ ...prev, username: 'checking' }));

    const t = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(u);
        if (cancelled) return;
        setValidation(prev => ({
          ...prev,
          username: available ? 'available' : 'taken',
        }));
      } catch (error) {
        if (cancelled) return;
        setValidation(prev => ({ ...prev, username: 'taken' }));
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.username]);

  // Email validation
  React.useEffect(() => {
    if (!form.email) {
      setValidation(prev => ({ ...prev, email: 'idle' }));
      return;
    }
    const isValid = emailRegex.test(form.email.trim());
    setValidation(prev => ({
      ...prev,
      email: isValid ? 'valid' : 'invalid',
    }));
  }, [form.email]);

  // Password validation
  React.useEffect(() => {
    if (!form.password) {
      setValidation(prev => ({ ...prev, password: 'idle' }));
      return;
    }
    const isValid = /^[A-Za-z0-9]{8}$/.test(form.password);
    setValidation(prev => ({
      ...prev,
      password: isValid ? 'valid' : 'invalid',
    }));
  }, [form.password]);

  // Confirm password validation
  React.useEffect(() => {
    if (!form.confirmPassword) {
      setValidation(prev => ({ ...prev, confirmPassword: 'idle' }));
      return;
    }
    setValidation(prev => ({
      ...prev,
      confirmPassword: form.confirmPassword === form.password ? 'match' : 'mismatch',
    }));
  }, [form.confirmPassword, form.password]);

  // Check if all fields are valid
  const isFormValid =
    form.username.trim() &&
    form.email.trim() &&
    form.password &&
    form.confirmPassword &&
    validation.username === 'available' &&
    validation.email === 'valid' &&
    validation.password === 'valid' &&
    validation.confirmPassword === 'match';

  const onSignup = async () => {
    if (!isFormValid || loading) return;

    try {
      setLoading(true);

      // Use centralized authService for sign up
      // This handles Auth user creation, Firestore documents, username reservation
      // and validation.
      await signUp(form.email, form.username, form.password);

      console.log('✅ Signup successful');

      // Do not navigate manually. AuthProvider will update the state.
      // AppNavigator will transition to the App Stack (starting with TravelPlanSelect).

    } catch (error: any) {
      console.error('❌ Signup failed:', error);
      Alert.alert('Signup Failed', error.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.welcometitle}>Welocome to Sanchari!</Text>
        <Text style={styles.title}>Register to get started</Text>

        <TextInput
          placeholder="Username"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          value={form.username}
          onChangeText={(text) => setForm(prev => ({ ...prev, username: text }))}
        />
        {validation.username === 'available' ? (
          <Text style={styles.validText}> Username available</Text>
        ) : validation.username === 'taken' ? (
          <Text style={styles.errorText}> Username not available</Text>
        ) : validation.username === 'invalid' ? (
          <Text style={styles.errorText}> Username cannot contain @</Text>
        ) : validation.username === 'checking' ? (
          <Text style={styles.mutedSmall}>Checking availability…</Text>
        ) : null}

        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
        />
        {validation.email === 'valid' ? (
          <Text style={styles.validText}> Valid email</Text>
        ) : validation.email === 'invalid' ? (
          <Text style={styles.errorText}> Please enter a valid email address.</Text>
        ) : null}

        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry
          value={form.password}
          onChangeText={(text) => setForm(prev => ({ ...prev, password: text }))}
        />
        {validation.password === 'invalid' ? (
          <Text style={styles.errorText}> Password must be 8 alphanumeric characters</Text>
        ) : validation.password === 'valid' ? (
          <Text style={styles.validText}> Strong password</Text>
        ) : null}

        <TextInput
          placeholder="Confirm password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry
          value={form.confirmPassword}
          onChangeText={(text) => setForm(prev => ({ ...prev, confirmPassword: text }))}
        />
        {validation.confirmPassword === 'mismatch' ? (
          <Text style={styles.errorText}> Passwords do not match</Text>
        ) : validation.confirmPassword === 'match' ? (
          <Text style={styles.validText}> Passwords match</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, (!isFormValid || loading) && styles.primaryBtnDisabled]}
          onPress={onSignup}
          disabled={!isFormValid || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Register</Text>}
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
  welcometitle: { fontSize: 30, fontWeight: '600', fontFamily: FontFamily.poppinsExtraBold, color: colors.primary, marginBottom: 16 },
  title: { fontSize: 24, fontFamily: FontFamily.poppinsBold, color: colors.primary, },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: FontFamily.poppinsRegular,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: { color: '#fff', fontFamily: FontFamily.poppinsBold, fontSize: 16 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  muted: { color: colors.mutedText, fontFamily: FontFamily.poppinsRegular },
  linkStrong: { color: colors.primary, fontFamily: FontFamily.poppinsBold },
  validText: { color: '#43A047', fontSize: 12, marginTop: 4, marginLeft: 4, fontFamily: FontFamily.poppinsRegular }, // Accent Green
  errorText: { color: '#E53935', fontSize: 12, marginTop: 4, marginLeft: 4, fontFamily: FontFamily.poppinsRegular }, // Accent Red
  mutedSmall: { color: colors.mutedText, fontSize: 12, marginTop: 4, marginLeft: 4, fontFamily: FontFamily.poppinsRegular },
});
