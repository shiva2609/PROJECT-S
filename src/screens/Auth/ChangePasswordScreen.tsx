import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChangePasswordScreen({ navigation, route }: any) {
  const [step, setStep] = useState<'otp' | 'reset'>('otp');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const email = route?.params?.email as string | undefined;

  // Dummy OTP for test password reset flow (change for new test code)
  const DUMMY_OTP = '54321';

  const handleOtpSubmit = () => {
    if (otp === DUMMY_OTP) {
      setStep('reset');
      setOtpError('');
    } else {
      setOtpError('Invalid OTP');
    }
  };

  const canSubmit = password.length >= 4 && password === confirm;

  // Dummy password storing for illustration
  const onReset = async () => {
    // Use this to store/update new password locally for this run
    try {
      await AsyncStorage.setItem('DUMMY_PASSWORD_KEY', password);
    } catch {}
    navigation.replace('AuthPasswordChanged');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {step === 'otp' ? (
          <>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              Please enter the one-time password sent to your email
            </Text>
            <TextInput
              placeholder="OTP"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              keyboardType="numeric"
              maxLength={6}
            />
            {otpError ? (
              <Text style={{ color: 'red', marginVertical: 8 }}>{otpError}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryBtn, !otp && styles.disabled]}
              onPress={handleOtpSubmit}
              disabled={!otp}
            >
              <Text style={styles.primaryBtnText}>Verify OTP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Create new password</Text>
            <Text style={styles.subtitle}>
              Your new password must be unique from those previously used{email ? ` for ${email}` : ''}.
            </Text>
            <TextInput
              placeholder="New Password"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, !canSubmit && styles.disabled]}
              onPress={onReset}
              disabled={!canSubmit}
            >
              <Text style={styles.primaryBtnText}>Reset Password</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 10 },
  subtitle: { fontSize: 14, color: colors.mutedText, marginBottom: 18 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
  },
  disabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

 