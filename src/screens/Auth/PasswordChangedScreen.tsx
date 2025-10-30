import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';

export default function PasswordChangedScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.title}>Password Changed!</Text>
        <Text style={styles.subtitle}>Your password has been changed successfully.</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('AuthLogin')}>
          <Text style={styles.primaryBtnText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFEADF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  check: { fontSize: 40, color: colors.primary, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.mutedText, marginTop: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    width: '100%',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

 