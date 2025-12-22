import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ScreenLayout } from '../../components/layout/ScreenLayout';
import { colors } from '../../utils/colors';
import { useDispatch } from 'react-redux';
import { FontFamily } from '../../GlobalStyles';
import { signIn } from '../../services/auth/authService';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const onLogin = async () => {
    const u = username.trim();
    if (!u || !password) {
      Alert.alert('Error', 'Please enter username/email and password');
      return;
    }

    try {
      setLoading(true);

      // Use centralized authService for sign in
      // This handles username/email lookup and Firestore fetching
      // It uses the same JS SDK instance as AuthProvider
      const userData = await signIn(u, password);

      console.log('✅ Login successful for:', userData.email);

      // OPTIONAL: Update Redux if legacy components need it
      // dispatch(setUser(userData)); 

      // DO NOT navigate manually. AuthProvider detects state change and unmounts Auth stack.
      // AppNavigator will mount MainTabs automatically.

    } catch (error: any) {
      console.error('❌ Login failed:', error);
      Alert.alert('Login failed', error.message || 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout
      scrollable
      keyboardAvoiding
      backgroundColor={colors.surface}
    >
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
          keyboardType="default"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          placeholder="Enter your password"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          secureTextEntry // Fixed invalid property
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
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerArea: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  welcomeTop: { fontSize: 30, fontWeight: '600', fontFamily: FontFamily.poppinsBold, color: colors.primary, marginBottom: -4, lineHeight: 32, },
  welcomeBrand: { fontSize: 40, fontWeight: '600', fontFamily: FontFamily.poppinsExtraBold, color: colors.primary, },
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
    fontFamily: FontFamily.poppinsRegular,
  },
  forgotRow: { alignItems: 'flex-end', marginTop: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  primaryBtnText: { color: '#fff', fontFamily: FontFamily.poppinsBold, fontSize: 16 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  muted: { color: colors.mutedText, fontFamily: FontFamily.poppinsRegular },
  linkText: { color: colors.mutedText, fontFamily: FontFamily.poppinsRegular },
  linkStrong: { color: colors.primary, fontFamily: FontFamily.poppinsBold },
});


