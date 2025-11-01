import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';

export default function ChangePasswordScreen({ navigation, route }: any) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const email = route?.params?.email as string | undefined;

  const canSubmit = password.length >= 6 && password === confirm;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create new password</Text>
        <Text style={styles.subtitle}>Your new password must be unique from those previously used{email ? ` for ${email}` : ''}.</Text>

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
          onPress={() => navigation.replace('AuthPasswordChanged')}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryBtnText}>Reset Password</Text>
        </TouchableOpacity>
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

 