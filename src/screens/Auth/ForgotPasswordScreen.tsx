import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>Don't worry! It occurs. Please enter the email address linked with your account.</Text>

        <TextInput
          placeholder="Enter your email"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('AuthChangePassword', { email })}
          disabled={!email.trim()}
        >
          <Text style={styles.primaryBtnText}>Send Code</Text>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.muted}>Remember Password? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('AuthLogin')}>
            <Text style={styles.linkStrong}>Login</Text>
          </TouchableOpacity>
        </View>
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
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  muted: { color: colors.mutedText },
  linkStrong: { color: colors.primary, fontWeight: '700' },
});

 