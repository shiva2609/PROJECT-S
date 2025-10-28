import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../utils/colors';

export default function AccountScreen() {
  const onLogout = async () => {
    Alert.alert('Logged out', 'Implement Firebase sign-out and Redux reset later.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <TouchableOpacity style={styles.btn} onPress={onLogout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 24 },
  btn: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: colors.danger, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  btnText: { color: 'white', fontWeight: '700' },
});
